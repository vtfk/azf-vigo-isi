const { logConfig, logger } = require('@vtfk/logger')
const { DEMO } = require('../config')
const { statusRequest } = require('../lib/generate-request')
const setStatus = require('../lib/isi-lokal')
const { getVariables, updateVariables } = require('../lib/handle-variables')

const hasData = data => Object.getOwnPropertyNames(data).length > 0
const hasException = data => hasData(data) && data.Feiltype === 'EXCEPTION I STATUSOPPDATERING'

module.exports = async function (context, req) {
  logConfig({
    prefix: DEMO ? 'DEMO' : ''
  })

  try {
    logger('info', ['Status', 'start'])
    const { docId, ssn } = req.body
    const { uuid, counter } = await getVariables()
    const request = statusRequest(uuid, counter, docId, ssn)
    const response = await setStatus('SET', request)

    // increase counter with 1 for the fetch request itself
    await updateVariables({
      uuid,
      counter,
      increment: 1
    })
    
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
