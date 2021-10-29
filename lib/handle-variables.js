const { logger } = require('@vtfk/logger')
const { v4: uuidv4 } = require('uuid')
const { DEMO, DOC_COUNT, COUNTY } = require('../config')
const getVariableData = require('./get-variables')
const setVariableData = require('./set-variables')

const getVariables = async () => {
  if (DEMO) {
    const uuid = uuidv4()
    const counter = 0
    logger('info', ['getVariables', uuid, counter, DOC_COUNT, COUNTY])
    return {
      uuid,
      counter,
      docCount: DOC_COUNT,
      county: COUNTY
    }
  }

  // TODO: fetch these from SQL database
  const { UUID_Id: uuid, UUID_Counter: counter } = await getVariableData()
  const docCount = DOC_COUNT
  const county = COUNTY
  logger('info', ['getVariables', uuid, counter, docCount, county])
  return {
    uuid,
    counter,
    docCount,
    county
  }
}

const updateVariables = async variables => {
  const { counter, increment } = variables
  let { uuid } = variables

  let tempCounter = counter + increment
  if (tempCounter > 9999) {
    tempCounter = tempCounter - 9999
    uuid = uuidv4()
  }

  if (DEMO) {
    logger('info', ['updateVariables', uuid, tempCounter])
    return
  }

  // TODO: update variables in SQL database
  await setVariableData(uuid, tempCounter)
  logger('info', ['updateVariables', uuid, tempCounter])
}

module.exports = {
  getVariables,
  updateVariables
}
