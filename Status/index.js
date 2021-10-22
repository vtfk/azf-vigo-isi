const { statusRequest } = require('../lib/generate-request')
const setStatus = require('../lib/isi-lokal')
const { getVariables, updateVariables } = require('../lib/handle-variables')

const hasData = data => Object.getOwnPropertyNames(data).length > 0
const hasException = data => hasData(data) && data.Feiltype === 'EXCEPTION I STATUSOPPDATERING'

module.exports = async function (context, req) {
  try {
    const { docId, ssn } = req.body
    const { uuid, counter } = await getVariables()
    const request = statusRequest(uuid, counter, docId, ssn)
    const response = await setStatus({
      type: 'SET',
      request
    })

    // increase counter with 1 for the fetch request itself
    await updateVariables({
      uuid,
      counter,
      increment: 1
    })

    return {
      status: hasData(response) ? hasException(response) ? 218 : 500 : 200, // TODO: Figure out which 4xx code Logic App retry policy doesn't act on
      body: response
    }
  } catch (error) {
    console.log(error)
    return {
      status: 500,
      body: error
    }
  }
}
