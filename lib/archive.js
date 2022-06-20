const { logger } = require('@vtfk/logger')
const axios = require('axios').default
const { ARCHIVE_URL, ARCHIVE_KEY } = require('../config')
const { createTask, createJob } = require('./e18')

const callArchive = async (payload, e18JobId, e18TaskId, endpoint) => {
  try {
    const headers = {
      headers: {
        'Ocp-Apim-Subscription-Key': ARCHIVE_KEY,
        e18JobId,
        e18TaskId
      }
    }

    const { data } = await axios.post(`${ARCHIVE_URL}/${endpoint}`, payload, headers)
    logger('info', ['archive', 'callArchive', 'data found'])
    return data
  } catch (error) {
    const { status, message, data } = error.response
    if (status === 404 && endpoint === 'SyncElevmappe') {
      logger('info', ['archive', 'aiaiaiaiai', status, message || data])
      return false
    }

    logger('error', ['archive', 'aiaiaiaiai', status, message || data])
    delete error.response.config
    delete error.response.request
    throw error.response
  }
}

const getAddress = streetAddress => {
  if (streetAddress.Adresselinje1 && streetAddress.Adresselinje1 !== ' ') return streetAddress.Adresselinje1
  if (streetAddress.Adresselinje2 && streetAddress.Adresselinje2 !== ' ') return streetAddress.Adresselinje2
  return 'Ukjent adresse'
}

module.exports.archive = async blobContent => {
  try {
    blobContent.flow.archiveTaskId = blobContent.flow.archiveTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'archive' })

    logger('info', ['archive', 'archive'])
    const payload = {
      system: 'vigo',
      template: blobContent.Dokumentelement.Dokumenttype,
      parameter: {
        caseNumber: blobContent.flow.syncElevmappa.elevmappe.CaseNumber,
        ssn: blobContent.flow.syncElevmappa.privatePerson.ssn,
        documentDate: blobContent.Dokumentelement.Dokumentdato,
        base64: blobContent.Dokumentelement.Dokumentfil
      }
    }
    const res = await callArchive(payload, blobContent.e18JobId, blobContent.flow.archiveTaskId, 'archive')
    if (typeof res === 'object') {
      blobContent.flow.archive = res
      blobContent.flow.archive.status = 'finished'
    }
  } catch (error) {
    blobContent.flow.archive = { error }
    blobContent.flow.archive.status = 'failed'
  }

  return blobContent
}

module.exports.signOff = async blobContent => {
  try {
    blobContent.flow.signOffTaskId = blobContent.flow.signOffTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'archive' })

    logger('info', ['archive', 'signOff'])
    const payload = {
      system: 'vigo',
      template: 'SIGNOFF',
      parameter: {
        documentNumber: blobContent.flow.archive.DocumentNumber
      }
    }
    const res = await callArchive(payload, blobContent.e18JobId, blobContent.flow.signOffTaskId, 'archive')
    if (typeof res === 'object') {
      blobContent.flow.signOff = res
      blobContent.flow.signOff.status = 'finished'
    }
  } catch (error) {
    blobContent.flow.signOff = { error }
    blobContent.flow.signOff.status = 'failed'
  }

  return blobContent
}

module.exports.syncElevmappa = async blobContent => {
  const { e18JobId, Fodselsnummer, Fornavn, Etternavn, FolkeRegisterAdresse, Dokumentelement: { Dokumenttype, DokumentId } } = blobContent

  try {
    // E18
    logger('info', ['archive', 'syncElevmappa', 'calling E18'])
    const blobName = `${Dokumenttype}_${DokumentId}`
    blobContent.e18JobId = blobContent.e18JobId || await createJob(blobName)
    blobContent.flow.syncElevmappaTaskId = blobContent.flow.syncElevmappaTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'SyncElevmappe' })

    // first try, ssn
    logger('info', ['archive', 'syncElevmappa', 'calling ssn'])
    const res = await callArchive({ ssn: Fodselsnummer }, e18JobId, blobContent.flow.syncElevmappaTaskId, 'SyncElevmappe')
    if (typeof res === 'object') {
      blobContent.flow.syncElevmappa = res
      blobContent.flow.syncElevmappa.status = 'finished'
      return blobContent
    }
  } catch (error) {
    blobContent.flow.syncElevmappa = { error }
    blobContent.flow.syncElevmappa.status = 'failed'
    return blobContent
  }

  // last try, skip DSF. use street address from VIGO
  try {
    const payload = {
      addressCode: 0,
      firstName: Fornavn,
      lastName: Etternavn,
      skipDSF: true,
      ssn: Fodselsnummer,
      streetAddress: getAddress(FolkeRegisterAdresse),
      zipCode: FolkeRegisterAdresse.Postnummmer,
      zipPlace: FolkeRegisterAdresse.Poststed
    }
    logger('info', ['archive', 'syncElevmappa', 'calling skip dsf'])
    const res = await callArchive(payload, e18JobId, blobContent.flow.syncElevmappaTaskId, 'SyncElevmappe')
    if (!res) throw new Error('404 - Resource not found')
    if (typeof res === 'object') {
      blobContent.flow.syncElevmappa = res
      blobContent.flow.syncElevmappa.status = 'finished'
      return blobContent
    }
  } catch (error) {
    blobContent.flow.syncElevmappa = { error }
    blobContent.flow.syncElevmappa.status = 'failed'
    return blobContent
  }

  // still nothing :O
  logger('warn', ['archive', 'syncElevmappa', 'Hit kommer vi aldri 🎉'])
}
