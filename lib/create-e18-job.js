const axios = require('axios').default
const { logger } = require('@vtfk/logger')
const { E18_URL, E18_KEY, E18: { PROJECT_ID: projectId, SYSTEM: system, TYPE: type } } = require('../config')

module.exports = async () => {
  const headers = {
    headers: {
      'X-API-KEY': E18_KEY
    }
  }

  const payload = {
    e18: false,
    system,
    type,
    projectId
  }

  try {
    const { data } = await axios.post(`${E18_URL}/jobs`, payload, headers)
    return data._id
  } catch (error) {
    const { status, message } = error.response.data
    logger('error', ['create-e18-job', message, status])
    return null
  }
}
