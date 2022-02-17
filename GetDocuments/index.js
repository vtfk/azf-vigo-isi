const { logConfig, logger } = require('@vtfk/logger')
const { save } = require('@vtfk/azure-blob-client')
const { DEMO, DISABLE_LOGGING } = require('../config')
const { documentsRequest } = require('../lib/generate-request')
const getDocuments = require('../lib/isi-lokal')
const { getVariables, updateVariables } = require('../lib/handle-variables')
const createJob = require('../lib/create-e18-job')

const isEmptyDocument = documents => documents.length === 1 && documents[0].Fodselsnummer === '' && documents[0].Dokumentelement.Dokumenttype === ''

module.exports = async function (context, req) {
  logConfig({
    prefix: DEMO ? 'DEMO' : '',
    remote: {
      disabled: DISABLE_LOGGING
    }
  })

  try {
    logger('info', ['GetDocuments', 'start'])

    if (req.query.onlyBlobRun && req.query.onlyBlobRun.toLowerCase() === 'true') {
      logger('info', ['GetDocuments', 'only blob run activated', 'will not contact VIGO'])
      logger('info', ['GetDocuments', 'finish'])
      return {
        status: 200,
        body: {
          success: 0,
          failed: 0
        }
      }
    }

    const { uuid, counter, docCount, county } = await getVariables()
    const request = documentsRequest(uuid, counter, docCount, county)
    const response = await getDocuments('GET', request)

    // increase counter with response.length and 1 for the fetch request itself
    await updateVariables({
      uuid,
      counter,
      increment: response.length + 1
    })

    // hvis dette er ett tomt dokument, mas litt om det og avslutt
    if (isEmptyDocument(response)) {
      logger('warn', ['GetDocuments', 'empty document from vigo-lokal'])
      logger('info', ['GetDocuments', 'finish'])
      return {
        status: 200,
        body: {
          success: 0,
          failed: 0
        }
      }
    }

    // dytt alle dokumenter til blob
    let blobbedCount = 0
    for (let document of response) {
      try {
        // add "nextRun" and "retryCount" to document
        document = {
          ...document,
          nextRun: '',
          retryCount: 0
        }
        // create e18 job for this document
        const jobId = await createJob()
        if (jobId) {
          document.e18JobId = jobId
        }

        await save(`queue/${document.Dokumentelement.Dokumenttype}_${document.Dokumentelement.DokumentId}_${document.Fodselsnummer}.json`, JSON.stringify(document, null, 2))
        blobbedCount++
      } catch (error) {
        logger('error', ['GetDocuments', 'upload to blob failed', document.Dokumentelement.Dokumenttype, document.Dokumentelement.DokumentId, document.Fodselsnummer])
      }
    }

    logger('info', ['GetDocuments', 'finish'])
    return {
      status: 200,
      body: {
        success: blobbedCount,
        failed: response.length - blobbedCount
      }
    }
  } catch (error) {
    logger('error', ['GetDocuments', 'error', error])
    return {
      status: 500,
      body: error
    }
  }
}
