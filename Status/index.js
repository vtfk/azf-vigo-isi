const { logConfig, logger } = require('@vtfk/logger')
const { DEMO, DISABLE_LOGGING } = require('../config')
const { updateStatus } = require('../lib/update-vigo-status')
const hasData = require('../lib/has-data')

const hasException = data => hasData(data) && data.Feiltype === 'EXCEPTION I STATUSOPPDATERING' && data.DetaljertBeskrivelse.includes('Message handling of') && data.DetaljertBeskrivelse.includes('already completed')

module.exports = async function (context, req) {
  logConfig({
    prefix: DEMO ? 'DEMO' : '',
    remote: {
      disabled: DISABLE_LOGGING
    }
  })

  try {
    logger('info', ['Status', 'start'])
    const { docId, ssn } = req.body
    const response = await updateStatus(docId, ssn)
    const status = hasData(response) ? hasException(response) ? 218 : 500 : 200 // TODO: Figure out which 4xx code Logic App retry policy doesn't act on
    logger('info', ['Status', status, 'finish'])
    return {
      status,
      body: response
    }
  } catch (error) {
    logger('error', ['Status', 500, 'error', error])
    return {
      status: 500,
      body: error
    }
  }
}
