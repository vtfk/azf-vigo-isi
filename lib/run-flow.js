const { archive, signOff, syncElevmappa } = require('./archive')
const { createTaskTemplate, complete } = require('./e18')
const { updateStatusFlow } = require('./update-vigo-status')
const { RETRY_INTERVAL_HOURS, RETRY_MAX_COUNT } = require('../config')
const { logger } = require('@vtfk/logger')

/**
 * @typedef {Object} FlowDefinition
 * @property {boolean} syncElevmappa
 * @property {boolean} archive
 * @property {boolean} signOff
 * @property {boolean} statusVigo
 * @property {boolean} e18Stats
 */

/**
 * Run a flow with chosen jobs
 * @param {Object} blobContent Blob content from VIGO
 * @param {FlowDefinition} flowDef Flow definition object
 * @returns {Object} Modified blob content
 */
module.exports = async (blobContent, flowDef) => {
  // SyncElevmappe
  if (flowDef.syncElevmappa) {
    if (!blobContent.flow.syncElevmappa || blobContent.flow.syncElevmappa.status !== 'finished') {
      blobContent = await syncElevmappa(blobContent)
    }

    if (blobContent.flow.syncElevmappa.status !== 'finished') {
      const retryMsg = (blobContent.retryCount >= RETRY_MAX_COUNT) ? `Max retry count ${RETRY_MAX_COUNT} reached, moved to error` : `Will retry in ${(blobContent.retryCount + 1) * RETRY_INTERVAL_HOURS} hours`
      logger('warn', ['flow', 'syncElevmappa failed', 'Aborting', retryMsg])
      blobContent.flow.status = 'failed'
      return blobContent
    }
  }

  // Archive
  if (flowDef.archive) {
    if (!blobContent.flow.archive || blobContent.flow.archive.status !== 'finished') {
      blobContent = await archive(blobContent, flowDef.archiveOptions)
    }

    if (blobContent.flow.archive.status !== 'finished') {
      const retryMsg = (blobContent.retryCount >= RETRY_MAX_COUNT) ? `Max retry count ${RETRY_MAX_COUNT} reached, moved to error` : `Will retry in ${(blobContent.retryCount + 1) * RETRY_INTERVAL_HOURS} hours`
      logger('warn', ['flow', 'archive failed', 'Aborting', retryMsg])
      blobContent.flow.status = 'failed'
      return blobContent
    }
  }

  // signOff
  if (flowDef.signOff) {
    if (!blobContent.flow.signOff || blobContent.flow.signOff.status !== 'finished') {
      blobContent = await signOff(blobContent)
    }

    if (blobContent.flow.signOff.status !== 'finished') {
      const retryMsg = (blobContent.retryCount >= RETRY_MAX_COUNT) ? `Max retry count ${RETRY_MAX_COUNT} reached, moved to error` : `Will retry in ${(blobContent.retryCount + 1) * RETRY_INTERVAL_HOURS} hours`
      logger('warn', ['flow', 'signOff failed', 'Aborting', retryMsg])
      blobContent.flow.status = 'failed'
      return blobContent
    }
  }

  // set status in vigo
  if (flowDef.statusVigo) {
    if (!blobContent.flow.statusVigo || blobContent.flow.statusVigo.status !== 'finished') {
      blobContent = await updateStatusFlow(blobContent)
    }

    if (blobContent.flow.statusVigo.status !== 'finished') {
      const retryMsg = (blobContent.retryCount >= RETRY_MAX_COUNT) ? `Max retry count ${RETRY_MAX_COUNT} reached, moved to error` : `Will retry in ${(blobContent.retryCount + 1) * RETRY_INTERVAL_HOURS} hours`
      logger('warn', ['flow', 'status vigo failed', 'Aborting', retryMsg])
      blobContent.flow.status = 'failed'
      return blobContent
    }
  }

  // add e18 task for statistics
  if (flowDef.e18Stats) {
    if (!blobContent.flow.e18StatsTask || blobContent.flow.e18StatsTask.status !== 'finished') {
      blobContent = await createTaskTemplate(blobContent)
    }

    if (blobContent.flow.e18StatsTask.status !== 'finished') {
      const retryMsg = (blobContent.retryCount >= RETRY_MAX_COUNT) ? `Max retry count ${RETRY_MAX_COUNT} reached, moved to error` : `Will retry in ${(blobContent.retryCount + 1) * RETRY_INTERVAL_HOURS} hours`
      logger('warn', ['flow', 'e18 stats task creation failed', 'Aborting', retryMsg])
      blobContent.flow.status = 'failed'
      return blobContent
    }

    // set e18 job as complete
    if (!blobContent.flow.e18Job || blobContent.flow.e18Job.status !== 'finished') {
      blobContent = await complete(blobContent)
    }

    if (blobContent.flow.e18Job.status !== 'finished') {
      const retryMsg = (blobContent.retryCount >= RETRY_MAX_COUNT) ? `Max retry count ${RETRY_MAX_COUNT} reached, moved to error` : `Will retry in ${(blobContent.retryCount + 1) * RETRY_INTERVAL_HOURS} hours`
      logger('warn', ['flow', 'e18 job complete failed', 'Aborting', retryMsg])
      blobContent.flow.status = 'failed'
      return blobContent
    }
  }

  blobContent.flow.status = 'finished'
  return blobContent
}
