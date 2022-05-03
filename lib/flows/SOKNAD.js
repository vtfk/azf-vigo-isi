const runFlow = require('../run-flow')

module.exports = async blobContent => {
  return await runFlow(blobContent, {
    syncElevmappa: true,
    archive: true,
    signOff: true,
    statusVigo: true,
    e18Stats: true
  })
}
