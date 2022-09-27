const { logger } = require('@vtfk/logger')
const axios = require('axios').default
const { fromBuffer } = require('file-type')
const path = require('path')
const { ARCHIVE_URL, ARCHIVE_KEY, FILE_FORMATS } = require('../config')
const { createTask, createJob } = require('./e18')

const maxBodyLength = 99000000 // maxBodyLength is 10 MB as default from axios/follow-redirects - overriding to 99 MB (Azure function has limit of 100 MB)

const verifyExt = (ext) => {
  const valid = FILE_FORMATS.includes(ext.toLowerCase()) || FILE_FORMATS.includes(ext.toUpperCase())
  return valid
}

const getExtFromInfo = (infoStr) => {
  const unknownFileExt = 'UF'
  if (typeof infoStr !== 'string') {
    logger('warn', [`Infostring was not string! Setting filetype to Unknown Format (${unknownFileExt})`])
    return unknownFileExt
  }
  const exts = []
  const infos = infoStr.split(';').map(i => path.extname(i).replace('.', '')).filter(i => verifyExt(i)) // Get only elements with fileExt, remove "." then filter on only valid fileExt for P360
  for (const ext of infos) {
    if (!exts.includes(ext)) exts.push(ext) // Get only unique values
  }
  if (exts.length > 1) {
    logger('warn', ['Found several fileExt in infostring', exts, `Setting filetype to Unknown Format (${unknownFileExt})`])
    return unknownFileExt
  } else if (exts.length === 0) {
    logger('warn', ['Could not determine fileExt from infostring', infoStr, `Setting filetype to Unknown Format (${unknownFileExt})`])
    return unknownFileExt
  }
  return exts[0]
}

const callArchive = async (payload, e18JobId, e18TaskId, endpoint) => {
  try {
    const headers = {
      headers: {
        'Ocp-Apim-Subscription-Key': ARCHIVE_KEY,
        e18JobId,
        e18TaskId
      },
      maxBodyLength
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

const unknownAddress = 'Ukjent adresse'

const getAddress = streetAddress => {
  if (streetAddress.Adresselinje1 && streetAddress.Adresselinje1 !== ' ') return streetAddress.Adresselinje1
  if (streetAddress.Adresselinje2 && streetAddress.Adresselinje2 !== ' ') return streetAddress.Adresselinje2
  return unknownAddress
}

module.exports.archive = async (blobContent, archiveOptions) => {
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

    if (archiveOptions) {
      if (archiveOptions.useStudentName) {
        payload.parameter.studentName = `${blobContent.flow.syncElevmappa.privatePerson.firstName} ${blobContent.flow.syncElevmappa.privatePerson.lastName}`
      }
      if (archiveOptions.determineFileExt) {
        let ext = false
        const fileType = await fromBuffer(Buffer.from(blobContent.Dokumentelement.Dokumentfil, 'base64')) // Check if we have file ext from base64
        if (fileType && fileType.ext && verifyExt(fileType.ext)) {
          ext = fileType.ext
          logger('info', ['Found file type from base64', ext])
        }
        if (!ext) {
          logger('info', ['Could not find file type from base64, will try to use infostring'])
          ext = getExtFromInfo(blobContent.Dokumentelement.Info) // get file ext from blobContent.Dokumentelement.Info
          logger('info', [`File type from infoString: "${ext}"`])
        }
        payload.parameter.fileExt = ext // add to payload
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
  const { Fodselsnummer, Fornavn, Etternavn, FolkeRegisterAdresse, Dokumentelement: { Dokumenttype, DokumentId } } = blobContent

  try {
    // E18
    logger('info', ['archive', 'syncElevmappa', 'calling E18'])
    const blobName = `${Dokumenttype}_${DokumentId}`
    blobContent.e18JobId = blobContent.e18JobId || await createJob(blobName)
    blobContent.flow.syncElevmappaTaskId = blobContent.flow.syncElevmappaTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'SyncElevmappe' })

    // first try, ssn
    logger('info', ['archive', 'syncElevmappa', 'calling ssn'])
    const res = await callArchive({ ssn: Fodselsnummer }, blobContent.e18JobId, blobContent.flow.syncElevmappaTaskId, 'SyncElevmappe')
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
    const res = await callArchive(payload, blobContent.e18JobId, blobContent.flow.syncElevmappaTaskId, 'SyncElevmappe')
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

// Archive response letter - creates a pdf and archives it with status R, ready for dispatching with SvarUT
module.exports.archiveResponseLetter = async (blobContent) => {
  try {
    blobContent.flow.archiveResponseLetterTaskId = blobContent.flow.archiveResponseLetterTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'archive' })

    logger('info', ['archive', 'archiveResponseLetter'])

    // First check if we have address block or invalid zip-code (If address code is not 0, or if zipcode length is not 4, or if zipcode is 9999, or if address is unknown)
    let payload
    let invalidAddressMsg = 'Svarbrev må opprettes og sendes manuelt til mottaker for å sikre korrekt addressehåndtering. '
    blobContent.flow.invalidAddress = false

    if (blobContent.flow.syncElevmappa.privatePerson.addressCode !== 0) {
      blobContent.flow.invalidAddress = true
      invalidAddressMsg += 'Mottaker er ikke vanlig bosatt (har adressesperrre eller klientadresse).'
    } else if (blobContent.flow.syncElevmappa.privatePerson.zipCode.length !== 4 || blobContent.flow.syncElevmappa.privatePerson.zipCode === '9999') {
      blobContent.flow.invalidAddress = true
      invalidAddressMsg += 'Mottakers postnummer er ikke et gyldig norsk postnummer.'
    } else if (blobContent.flow.syncElevmappa.privatePerson.streetAddress === unknownAddress) {
      blobContent.flow.invalidAddress = true
      invalidAddressMsg += 'Gyldig mottaker-addresse ble ikke funnet i folkeregisteret eller i VIGO.'
    }
    if (blobContent.flow.invalidAddress) {
      logger('info', ['archive', 'archiveResponseLetter', invalidAddressMsg, 'will not send on SvarUT, but update incoming document with a note.'])
      payload = {
        service: 'DocumentService',
        method: 'UpdateDocument',
        parameter: {
          DocumentNumber: blobContent.flow.archive.DocumentNumber,
          Remarks: [
            {
              Title: invalidAddressMsg,
              RemarkType: 'ME'
            }
          ]
        }
      }
    } else {
      logger('info', ['archive', 'archiveResponseLetter', 'address is ok, will create and archive response letter'])
      payload = {
        system: 'vigo',
        template: `${blobContent.Dokumentelement.Dokumenttype}-response`,
        parameter: {
          caseNumber: blobContent.flow.syncElevmappa.elevmappe.CaseNumber,
          ssn: blobContent.flow.syncElevmappa.privatePerson.ssn,
          studentName: `${blobContent.flow.syncElevmappa.privatePerson.firstName} ${blobContent.flow.syncElevmappa.privatePerson.lastName}`,
          streetAddress: blobContent.flow.syncElevmappa.privatePerson.streetAddress,
          zipCode: blobContent.flow.syncElevmappa.privatePerson.zipCode,
          zipPlace: blobContent.flow.syncElevmappa.privatePerson.zipPlace,
          documentDate: blobContent.Dokumentelement.Dokumentdato
        }
      }
    }

    const res = await callArchive(payload, blobContent.e18JobId, blobContent.flow.archiveResponseLetterTaskId, 'archive')
    if (typeof res === 'object') {
      blobContent.flow.archiveResponseLetter = res
      blobContent.flow.archiveResponseLetter.status = 'finished'
    }
  } catch (error) {
    blobContent.flow.archiveResponseLetter = { error }
    blobContent.flow.archiveResponseLetter.status = 'failed'
  }

  return blobContent
}

// Archive response letter - creates a pdf and archives it with status R, ready for dispatching with SvarUT
module.exports.sendResponseLetter = async (blobContent) => {
  try {
    blobContent.flow.sendResponseLetterTaskId = blobContent.flow.sendResponseLetterTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'dispatch' })

    logger('info', ['archive', 'sendResponseLetter'])

    if (blobContent.flow.invalidAddress) {
      logger('info', ['archive', 'sendResponseLetter', 'Either address block or invalid address, response letter has not been created, and will not be sent'])
      blobContent.flow.sendResponseLetter = { msg: 'Either address block or invalid address, response letter has not been created, and will not be sent' }
      blobContent.flow.sendResponseLetter.status = 'finished'
    } else {
      logger('info', ['archive', 'sendResponseLetter', 'Dispatching with SvarUT'])
      const payload = {
        service: 'DocumentService',
        method: 'DispatchDocuments',
        parameter: {
          Documents: [
            {
              DocumentNumber: blobContent.flow.archiveResponseLetter.DocumentNumber
            }
          ]
        }
      }
      const res = await callArchive(payload, blobContent.e18JobId, blobContent.flow.sendResponseLetterTaskId, 'archive')
      if (typeof res === 'object') {
        blobContent.flow.sendResponseLetter = res
        blobContent.flow.sendResponseLetter.status = 'finished'
      }
    }
  } catch (error) {
    blobContent.flow.sendResponseLetter = { error }
    blobContent.flow.sendResponseLetter.status = 'failed'
  }

  return blobContent
}

// Archive response letter - creates a pdf and archives it with status R, ready for dispatching with SvarUT
module.exports.signOffResponseLetter = async (blobContent) => {
  try {
    blobContent.flow.signOffResponseLetterTaskId = blobContent.flow.signOffResponseLetterTaskId || await createTask(blobContent.e18JobId, { system: 'p360', method: 'signOff' })

    logger('info', ['archive', 'signOffResponseLetter'])

    if (blobContent.flow.invalidAddress) {
      logger('info', ['archive', 'signOffResponseLetter', 'Either address block or invalid address, response letter has not been created, will NOT signoff'])
      blobContent.flow.signOffResponseLetter = { msg: 'Either address block or invalid address, response letter has not been created, will NOT signoff' }
      blobContent.flow.signOffResponseLetter.status = 'finished'
    } else {
      logger('info', ['archive', 'signOffResponseLetter', 'Signing off the original document'])
      const payload = {
        service: 'DocumentService',
        method: 'SignOffDocument',
        parameter: {
          Document: blobContent.flow.archive.DocumentNumber,
          ResponseCode: 'BU',
          ReplyDocument: blobContent.flow.archiveResponseLetter.DocumentNumber
        }
      }
      const res = await callArchive(payload, blobContent.e18JobId, blobContent.flow.signOffResponseLetterTaskId, 'archive')
      if (typeof res === 'object') {
        blobContent.flow.signOffResponseLetter = res
        blobContent.flow.signOffResponseLetter.status = 'finished'
      }
    }
  } catch (error) {
    blobContent.flow.signOffResponseLetter = { error }
    blobContent.flow.signOffResponseLetter.status = 'failed'
  }

  return blobContent
}
