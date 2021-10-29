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
  COUNTY: process.env.COUNTY
}
