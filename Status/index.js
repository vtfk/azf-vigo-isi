const { statusRequest } = require('../lib/generate-request')
const setStatus = require('../lib/isi-lokal')

const hasData = data => Object.getOwnPropertyNames(data).length > 0
const hasException = data => hasData(data) && data.Feiltype === 'EXCEPTION I STATUSOPPDATERING'

module.exports = async function (context, req) {
  try {
    const { docId, ssn } = req.body
    const request = await statusRequest(docId, ssn)
    const response = await setStatus({
      type: 'SET',
      request
    })

    // øk counter med elements.length (overskriver den 9999, resett til 0 eller riktig løpenummer)

    // hent annen drit fra database og fyll ut på hvert dokument

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
