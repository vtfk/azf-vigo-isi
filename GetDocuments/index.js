const axios = require('axios').default
const { v4: uuidv4 } = require('uuid')
const { parseStringPromise } = require('xml2js')

const { ISI: { URL, GET_DOCUMENTS } } = require('../config')
const { documentsRequest } = require('../lib/generate-request')
const getSoapResponse = require('../lib/get-soap-response')

module.exports = async function (context, req) {
  // hent variabler fra mongo (uuid og counter)
  const uuid = uuidv4()
  const counter = 0

  const result = documentsRequest(uuid, counter, 2, 38)

  try {
    const { data } = await axios.post(`${URL}/${GET_DOCUMENTS}`, result, { headers: { 'Content-Type': 'text/xml' } })
    const json = await parseStringPromise(data, { explicitArray: false })
    const elements = getSoapResponse(json)

    // øk counter med elements.length (overskriver den 9999, resett til 0 eller riktig løpenummer)

    // hent annen drit fra database og fyll ut på hvert dokument

    return {
      status: 200,
      body: elements
    }
  } catch (error) {
    console.log(error)
    return {
      status: 500,
      body: error
    }
  }
}
