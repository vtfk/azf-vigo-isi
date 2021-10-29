const { logger } = require('@vtfk/logger')
const connect = require('./connect-to-db')
const { DB: { table } } = require('../config')

module.exports = async () => {
  try {
    const pool = await connect()
    const { recordset } = await pool.request()
      .query(`SELECT * FROM ${table}`)
    pool.close()
    return recordset[0]
  } catch (error) {
    logger('error', ['get-variables', error])
    return []
  }
}
