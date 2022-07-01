const runFlow = require('../run-flow')

module.exports = async blobContent => {
  return await runFlow(blobContent, {
    syncElevmappa: true,
    archive: true,
    archiveOptions: {
      useStudentName: true,
      determineFileExt: true
    },
    statusVigo: true,
    e18Stats: true
  })
}
