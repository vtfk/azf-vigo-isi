const { logger } = require('@vtfk/logger')
const axios = require('axios').default
const { parseStringPromise, processors } = require('xml2js')

const { ISI: { URL, GET_DOCUMENTS, SET_STATUS } } = require('../config')
const getSoapResponse = require('../lib/get-soap-response')

module.exports = async (type, request) => {
  const route = type === 'GET' ? GET_DOCUMENTS : SET_STATUS
  logger('info', ['isi-lokal', route, 'start'])
  const { data } = await axios.post(`${URL}/${route}`, request, { headers: { 'Content-Type': 'text/xml' } })
  logger('info', ['isi-lokal', route, 'finish'])
  const json = await parseStringPromise(data, { explicitArray: false, tagNameProcessors: [processors.stripPrefix] })
  logger('info', ['isi-lokal', route, 'parsed to json'])
  return getSoapResponse(json)
}
