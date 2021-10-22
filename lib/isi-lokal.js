const axios = require('axios').default
const { parseStringPromise, processors } = require('xml2js')

const { ISI: { URL, GET_DOCUMENTS, SET_STATUS } } = require('../config')
const getSoapResponse = require('../lib/get-soap-response')

module.exports = async options => {
  const route = options.type === 'GET' ? GET_DOCUMENTS : SET_STATUS
  const { data } = await axios.post(`${URL}/${route}`, options.request, { headers: { 'Content-Type': 'text/xml' } })
  const json = await parseStringPromise(data, { explicitArray: false, tagNameProcessors: [processors.stripPrefix] })
  return getSoapResponse(json)
}
