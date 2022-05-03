module.exports = {
  ISI: {
    URL: process.env.ISI_URL,
    USERNAME: process.env.ISI_USERNAME || '********',
    PASSWORD: process.env.ISI_PASSWORD || '********',
    GET_DOCUMENTS: process.env.ISI_GET_DOCUMENTS || 'HentDataForArkivering',
    SET_STATUS: process.env.SET_STATUS || 'LagreStatusArkiverteData'
  },
  DB: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    table: process.env.DB_TABLE
  },
  DEMO: (process.env.DEMO && process.env.DEMO.toLowerCase() === 'true') || false,
  DOC_COUNT: process.env.DOC_COUNT,
  COUNTY: process.env.COUNTY,
  RETRY_INTERVAL_HOURS: (process.env.RETRY_INTERVAL_HOURS && Number.parseInt(process.env.RETRY_INTERVAL_HOURS)) || 4,
  RETRY_MAX_COUNT: (process.env.RETRY_MAX_COUNT && Number.parseInt(process.env.RETRY_MAX_COUNT)) || 3,
  DISABLE_LOGGING: (process.env.PAPERTRAIL_DISABLE_LOGGING && process.env.PAPERTRAIL_DISABLE_LOGGING.toLowerCase() === 'true') || false,
  ARCHIVE_URL: process.env.ARCHIVE_URL,
  ARCHIVE_KEY: process.env.ARCHIVE_KEY,
  E18_URL: process.env.E18_URL,
  E18_KEY: process.env.E18_KEY,
  E18: {
    SYSTEM: process.env.E18_JOB_SYSTEM,
    PROJECT_ID: Number.isInteger(Number.parseInt(process.env.E18_JOB_PROJECT_ID)) ? Number.parseInt(process.env.E18_JOB_PROJECT_ID) : 0,
    TYPE: process.env.E18_JOB_TYPE
  }
}
