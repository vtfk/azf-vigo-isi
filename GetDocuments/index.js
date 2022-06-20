const { logConfig, logger } = require('@vtfk/logger')
const { save } = require('@vtfk/azure-blob-client')
const { readdirSync } = require('fs')
const { DEMO, DISABLE_LOGGING } = require('../config')
const { documentsRequest } = require('../lib/generate-request')
const getDocuments = require('../lib/isi-lokal')
const { getVariables, updateVariables } = require('../lib/handle-variables')

const isEmptyDocument = documents => documents.length === 1 && documents[0].Fodselsnummer === '' && documents[0].Dokumentelement.Dokumenttype === ''

module.exports = async function (context, req) {
  logConfig({
    prefix: DEMO ? 'DEMO' : '',
    remote: {
      disabled: DISABLE_LOGGING
    }
  })

  // HandleDocument sets suffix, and it is "inherited" here, so we reset it.
  logConfig({
    suffix: ''
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

    let response
    if (DEMO) {
      // create some blobs in queue
      const demoResponse = []
      const files = readdirSync('./mock')
      files.forEach(file => {
        try {
          demoResponse.push(require(`../mock/${file}`))
        } catch (error) {
          logger('error', ['GetDocuments', 'moron', `mock file ${file} is invalid 🤦‍♂️`])
        }
      })
      response = demoResponse
      logger('info', ['GetDocuments', `${response.length} mock files will be uploaded to blob storage`])
    } else {
      const { uuid, counter, docCount, county } = await getVariables()
      const request = documentsRequest(uuid, counter, docCount, county)
      response = await getDocuments('GET', request)

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
    }

    // save all blobs to storage
    let blobbedCount = 0
    for (let document of response) {
      try {
        const blobName = `${document.Dokumentelement.Dokumenttype}_${document.Dokumentelement.DokumentId}`

        // add "nextRun" and "retryCount" to document
        document = {
          ...document,
          nextRun: '',
          retryCount: 0
        }

        await save(`queue/${blobName}.json`, JSON.stringify(document, null, 2))
        logger('info', ['GetDocuments', `${blobName} successfully uploaded to blob storage`])
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
