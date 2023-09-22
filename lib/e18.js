const axios = require('./axios-instance')()
const { logger } = require('@vtfk/logger')
const { E18_URL, E18_KEY, E18: { PROJECT_ID: projectId, SYSTEM: system, TYPE: type } } = require('../config')

module.exports.createJob = async blobName => {
  const headers = {
    headers: {
      'X-API-KEY': E18_KEY
    }
  }

  const payload = {
    e18: false,
    system,
    type,
    projectId,
    tags: [blobName]
  }

  try {
    const { data } = await axios.post(`${E18_URL}/jobs`, payload, headers)
    return data._id
  } catch (error) {
    const errorMsg = error.response?.data || error.stack || error.toString()
    const status = error.response?.status || 500
    const message = error.response?.message || error.toString()
    logger('error', ['e18', 'createJob', message, status, errorMsg])
    throw error
  }
}

module.exports.createTask = async (jobId, payload) => {
  const headers = {
    headers: {
      'X-API-KEY': E18_KEY
    }
  }

  try {
    const { data } = await axios.post(`${E18_URL}/jobs/${jobId}/tasks`, payload, headers)
    return data._id
  } catch (error) {
    const errorMsg = error.response?.data || error.stack || error.toString()
    const status = error.response?.status || 500
    const message = error.response?.message || error.toString()
    logger('error', ['e18', 'createTask', message, status, errorMsg])
    throw error
  }
}

module.exports.complete = async blobContent => {
  const headers = {
    headers: {
      'X-API-KEY': E18_KEY
    }
  }

  try {
    await axios.put(`${E18_URL}/jobs/${blobContent.e18JobId}/complete`, null, headers)
    blobContent.flow.e18Job = { status: 'finished' }
    return blobContent
  } catch (error) {
    const errorMsg = error.response?.data || error.stack || error.toString()
    const status = error.response?.status || 500
    const message = error.response?.message || error.toString()
    logger('error', ['e18', 'complete', message, status, errorMsg])
    blobContent.flow.e18Job = { status: 'failed' }
    return blobContent
  }
}

module.exports.createTaskTemplate = async blobContent => {
  const regarding = blobContent.flow.syncElevmappa.privatePerson.recno ? blobContent.flow.syncElevmappa.privatePerson.recno.toString() : undefined
  const payload = {
    method: blobContent.Dokumentelement.Dokumenttype,
    regarding,
    status: 'completed',
    system: 'vigo-isi',
    tags: [
      blobContent.Dokumentelement.DokumentId,
      blobContent.Dokumentelement.Dokumentdato,
      'Opprettet elevmappe',
      'Status ARKIVERT i VIGO'
    ]
  }
  if (blobContent.flow.archive?.DocumentNumber) {
    payload.tags.push(blobContent.flow.archive.DocumentNumber)
  }

  try {
    await this.createTask(blobContent.e18JobId, payload)
    blobContent.flow.e18StatsTask = { status: 'finished' }
  } catch (error) {
    blobContent.flow.e18StatsTask = { status: 'failed' }
  }
  return blobContent
}
