const { logger } = require('@vtfk/logger')
const { v4: uuidv4 } = require('uuid')
const { DEMO, DEMO_DOC_COUNT, DEMO_COUNTY } = require('../config')

const getVariables = async () => {
  if (DEMO) {
    const uuid = uuidv4()
    const counter = 0
    logger('info', ['getVariables', uuid, counter, DEMO_DOC_COUNT, DEMO_COUNTY])
    return {
      uuid,
      counter,
      docCount: DEMO_DOC_COUNT,
      county: DEMO_COUNTY
    }
  }

  // TODO: fetch these from SQL database
  const uuid = uuidv4()
  const counter = 0
  const docCount = DEMO_DOC_COUNT
  const county = DEMO_COUNTY
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
    logger('info', ['updateVariables', uuid, counter])
    return
  }

  // TODO: update variables in SQL database
  logger('info', ['updateVariables', uuid, counter])
}

module.exports = {
  getVariables,
  updateVariables
}
