const { logConfig, logger } = require('@vtfk/logger')
const { DEMO, DISABLE_LOGGING } = require('../config')
const { documentsRequest } = require('../lib/generate-request')
const getDocuments = require('../lib/isi-lokal')
const { getVariables, updateVariables } = require('../lib/handle-variables')
const { save } = require('@vtfk/azure-blob-client')

module.exports = async function (context, req) {
  logConfig({
    prefix: DEMO ? 'DEMO' : '',
    remote: {
      disabled: DISABLE_LOGGING
    }
  })

  try {
    logger('info', ['GetDocuments', 'start'])
    const { uuid, counter, docCount, county } = await getVariables()
    const request = documentsRequest(uuid, counter, docCount, county)
    const response = await getDocuments('GET', request)

    // increase counter with response.length and 1 for the fetch request itself
    await updateVariables({
      uuid,
      counter,
      increment: response.length + 1
    })

    // dytt alle dokumenter til blob (bob)
    let blobbedCount = 0
    for (const document of response) {
      try {
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
