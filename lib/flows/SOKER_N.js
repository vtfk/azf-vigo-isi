const runFlow = require('../run-flow')

module.exports = async blobContent => {
  return await runFlow(blobContent, {
    syncElevmappa: true,
    statusVigo: true,
    e18Stats: true
  })
}
