const { logger, logConfig } = require('@vtfk/logger')
const { get, save, remove } = require('@vtfk/azure-blob-client')
const { azfHandleError } = require('@vtfk/responsehandlers')
const { RETRY_INTERVAL_HOURS, RETRY_MAX_COUNT } = require('../config')

module.exports = async function (context, req) {
  const { blobId } = context.bindingData

  logConfig({
    teams: {
      onlyInProd: false
    }
  })

  // get blob and blob type
  const blobPath = `queue/${blobId}`
  const errorBlobPath = `error/${blobId}`
  const { data } = await get(blobPath)
  let blobData = typeof data === 'string' ? JSON.parse(data) : data
  const blobType = blobData.Dokumentelement.Dokumenttype
  blobData.flow = blobData.flow || {}

  // determine flow type
  let flow
  try {
    flow = require(`../lib/flows/${blobType}`)
  } catch (error) {
    await logger('error', [blobType, 'flow not found', error])
  }

  // call flow type
  try {
    blobData = await flow(blobData)

    if (blobData.flow.status === 'finished') {
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
      blobData.retryCount++
      if (blobData.retryCount > RETRY_MAX_COUNT) {
        // move to error
        await save(errorBlobPath, JSON.stringify(blobData))
        await remove(blobPath)
        return {
          status: 429,
          body: {
            message: 'RetryCount exceeded. Blob moved to error',
            retryCount: blobData.retryCount,
            maxRetries: RETRY_MAX_COUNT
          }
        }
      }

      // update in queue
      const now = new Date()
      const nextRun = new Date(now.setTime(now.getTime() + (60 * 60 * 1000 * RETRY_INTERVAL_HOURS * blobData.retryCount)))
      blobData.nextRun = nextRun
      await save(blobPath, JSON.stringify(blobData))
      return {
        status: 406,
        body: {
          message: 'RetryCount incremented. Will try again',
          nextRun,
          retryCount: blobData.retryCount,
          maxRetries: RETRY_MAX_COUNT
        }
      }
    }
  } catch (error) {
    await logger('error', [blobType, 'Flow failed to run successfully'])
    return azfHandleError(error, context, req)
  }
}
