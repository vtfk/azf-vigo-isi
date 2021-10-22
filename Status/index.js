const axios = require('axios').default
const { v4: uuidv4 } = require('uuid')
const { parseStringPromise } = require('xml2js')

const { ISI: { URL, SET_STATUS } } = require('../config')
const { statusRequest } = require('../lib/generate-request')
const getSoapResponse = require('../lib/get-soap-response')

const hasData = data => Object.getOwnPropertyNames(data).length > 0
const hasException = data => hasData(data) && data.Feiltype === 'EXCEPTION I STATUSOPPDATERING'

module.exports = async function (context, req) {
  const { docId, ssn } = req.body

  // hent variabler fra mongo (uuid og counter)
  const uuid = uuidv4()
  const counter = 0
  // dersom counter er større enn 9999, generer ny uuid og sett counter til 0 og skriv til mongo

  const result = statusRequest(uuid, counter, docId, ssn)

  try {
    const { data } = await axios.post(`${URL}/${SET_STATUS}`, result, { headers: { 'Content-Type': 'text/xml' } })
    const json = await parseStringPromise(data, { explicitArray: false })
    const response = getSoapResponse(json)

    // øk counter med elements.length (overskriver den 9999, resett til 0 eller riktig løpenummer)

    // hent annen drit fra database og fyll ut på hvert dokument

    return {
      status: hasData(response) ? hasException(response) ? 218 : 500 : 200,
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
