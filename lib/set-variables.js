const { logger } = require('@vtfk/logger')
const connect = require('./connect-to-db')
const { DB: { table } } = require('../config')

module.exports = async (uuid, counter) => {
  try {
    const pool = await connect()
    const { recordset } = await pool.request()
      .query(`UPDATE ${table} SET UUID_Id = '${uuid}', UUID_Counter = ${counter}`)
    pool.close()
    return recordset
  } catch (error) {
    logger('error', ['set-variables', error])
  }
}
