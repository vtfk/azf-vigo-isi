const axios = require('axios').default
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
    const { status, message } = error.response
    logger('error', ['e18', 'createJob', message, status])
    return null
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
    const { status, message } = error.response
    logger('error', ['e18', 'createTask', message, status])
    return false
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
    const { status, message, data } = error.response
    logger('error', ['e18', 'complete', message, status])
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

  const taskCreated = await this.createTask(blobContent.e18JobId, payload)
  blobContent.flow.e18StatsTask = { status: taskCreated ? 'finished' : 'failed' }
  return blobContent
}
