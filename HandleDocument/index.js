const { logger, logConfig } = require('@vtfk/logger')
const { get, save, remove } = require('@vtfk/azure-blob-client')
const { azfHandleError } = require('@vtfk/responsehandlers')
const { DEMO, DISABLE_LOGGING, RETRY_INTERVAL_HOURS, RETRY_MAX_COUNT } = require('../config')

module.exports = async function (context, req) {
  const { blobId } = context.bindingData

  logConfig({
    prefix: DEMO ? 'DEMO' : '',
    remote: {
      disabled: DISABLE_LOGGING
    }
  })

  // get blob and blob type
  const blobPath = `queue/${blobId}`
  const errorBlobPath = `error/${blobId}`
  let blobContent
  try {
    const { data } = await get(blobPath)
    blobContent = typeof data === 'string' ? JSON.parse(data) : data
  } catch (error) {
    await logger('error', ['failed to get blob', error])
    return azfHandleError(error, context, req)
  }
  const blobType = blobContent.Dokumentelement.Dokumenttype
  blobContent.flow = blobContent.flow || {}

  logConfig({
    suffix: `${blobContent.Dokumentelement.Dokumenttype} - ${blobContent.Dokumentelement.DokumentId}`
  })

  // determine flow type
  let flow
  try {
    flow = require(`../lib/flows/${blobType}`)
  } catch (error) {
    await logger('error', [blobType, 'flow not found', error])
    return azfHandleError(error, context, req)
  }

  // call flow type
  try {
    blobContent = await flow(blobContent)

    if (blobContent.flow.status === 'finished') {
      // remove blob
      await remove(blobPath)
      return {
        status: 200,
        body: {
          message: 'Success. Blob removed'
        }
      }
    } else {
      // update blob with new data
      blobContent.retryCount++
      if (blobContent.retryCount > RETRY_MAX_COUNT) {
        // move to error
        await save(errorBlobPath, JSON.stringify(blobContent))
        await remove(blobPath)
        return {
          status: 429,
          body: {
            message: 'RetryCount exceeded. Blob moved to error',
            retryCount: blobContent.retryCount,
            maxRetries: RETRY_MAX_COUNT
          }
        }
      }

      // update in queue
      const now = new Date()
      // (RETRY_INTERVAL_HOURS * retryCount) hours in the future
      const nextRun = new Date(now.setTime(now.getTime() + (60 * 60 * 1000 * RETRY_INTERVAL_HOURS * blobContent.retryCount)))
      blobContent.nextRun = nextRun
      await save(blobPath, JSON.stringify(blobContent))
      return {
        status: 406,
        body: {
          message: 'RetryCount incremented. Will try again',
          nextRun,
          retryCount: blobContent.retryCount,
          maxRetries: RETRY_MAX_COUNT
        }
      }
    }
  } catch (error) {
    await logger('error', ['flow failed to run successfully'])
    return azfHandleError(error, context, req)
  }
}
