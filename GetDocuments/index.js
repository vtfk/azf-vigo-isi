const { documentsRequest } = require('../lib/generate-request')
const getDocuments = require('../lib/isi-lokal')

module.exports = async function (context, req) {
  try {
    const request = await documentsRequest()
    const response = await getDocuments({
      type: 'GET',
      request
    })

    // øk counter med response.length (overskriver den 9999, resett til 0 eller riktig løpenummer)

    // hent annen drit fra database og fyll ut på hvert dokument

    return {
      status: 200,
      body: response
    }
  } catch (error) {
    console.log(error)
    return {
      status: 500,
      body: error
    }
  }
}
