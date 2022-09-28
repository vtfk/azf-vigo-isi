const runFlow = require('../run-flow')

module.exports = async blobContent => {
  return await runFlow(blobContent, {
    syncElevmappa: true,
    archive: true,
    statusVigo: true,
    archiveResponseLetter: true,
    sendResponseLetter: true,
    signOffResponseLetter: true,
    e18Stats: true
  })
}
