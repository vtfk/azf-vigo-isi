const { logConfig, logger } = require('@vtfk/logger')
const { DEMO, DISABLE_LOGGING } = require('../config')
const { documentsRequest } = require('../lib/generate-request')
const getDocuments = require('../lib/isi-lokal')
const { getVariables, updateVariables } = require('../lib/handle-variables')

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

    // hent annen drit fra database og fyll ut på hvert dokument (fortsatt aktuelt?)

    logger('info', ['GetDocuments', 'finish'])
    return {
      status: 200,
      body: response
    }
  } catch (error) {
    logger('error', ['GetDocuments', 'error', error])
    return {
      status: 500,
      body: error
    }
  }
}
