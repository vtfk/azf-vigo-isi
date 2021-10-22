module.exports = {
  ISI: {
    URL: process.env.ISI_URL,
    USERNAME: process.env.ISI_USERNAME || '********',
    PASSWORD: process.env.ISI_PASSWORD || '********',
    GET_DOCUMENTS: process.env.ISI_GET_DOCUMENTS || 'HentDataForArkivering',
    SET_STATUS: process.env.SET_STATUS || 'LagreStatusArkiverteData'
  }
}
