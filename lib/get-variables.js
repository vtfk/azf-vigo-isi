const { v4: uuidv4 } = require('uuid')
const { DEMO, DEMO_DOC_COUNT, DEMO_COUNTY } = require('../config')

module.exports = async () => {
  if (DEMO) return {
    uuid: uuidv4(),
    counter: 0,
    docCount: DEMO_DOC_COUNT,
    county: DEMO_COUNTY
  }

  // TODO: fetch these from SQL database
  const uuid = uuidv4()
  const counter = 0
  const docCount = DEMO_DOC_COUNT
  const county = DEMO_COUNTY
  return {
    uuid,
    counter,
    docCount,
    county
  }
}
