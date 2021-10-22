module.exports = {
  ISI: {
    URL: process.env.ISI_URL,
    USERNAME: process.env.ISI_USERNAME || '********',
    PASSWORD: process.env.ISI_PASSWORD || '********',
    GET_DOCUMENTS: process.env.ISI_GET_DOCUMENTS || 'HentDataForArkivering',
    SET_STATUS: process.env.SET_STATUS || 'LagreStatusArkiverteData',
  },
  DEMO: (process.env.DEMO && process.env.DEMO.toLowerCase() === 'true') || false,
  DEMO_DOC_COUNT: process.env.DEMO_DOC_COUNT,
  DEMO_COUNTY: process.env.DEMO_COUNTY
}
