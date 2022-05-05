const { logger } = require('@vtfk/logger')
const { statusRequest } = require('./generate-request')
const setStatus = require('./isi-lokal')
const { getVariables, updateVariables } = require('./handle-variables')
const hasData = require('./has-data')
const { DEMO } = require('../config')

module.exports.updateStatus = async (docId, ssn) => {
  try {
    const { uuid, counter } = await getVariables()
    const request = statusRequest(uuid, counter, docId, ssn)
    const response = await setStatus('SET', request)

    // increase counter with 1 for the fetch request itself
    await updateVariables({
      uuid,
      counter,
      increment: 1
    })

    return response
  } catch (error) {
    logger('error', ['update-vigo-status', 'setStatus', 'error', error])
    return {}
  }
}

module.exports.updateStatusFlow = async blobContent => {
  if (DEMO) {
    blobContent.flow.statusVigo.status = 'finished'
    return blobContent
  }

  blobContent.flow.statusVigo = await this.updateStatus(blobContent.Dokumentelement.DokumentId, blobContent.Fodselsnummer)
  if (hasData(blobContent.flow.statusVigo)) {
    blobContent.flow.statusVigo.status = 'finished'
  } else {
    blobContent.flow.statusVigo.status = 'failed'
  }
  return blobContent
}
