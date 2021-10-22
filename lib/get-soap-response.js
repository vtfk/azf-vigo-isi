const { logger } = require('@vtfk/logger')

module.exports = json => {
  console.log(JSON.stringify(json, null, 2))
  const body = json.Envelope ? json.Envelope.Body : json.Body
  const { HentDataForArkiveringResponse, LagreStatusArkiverteDataResponse } = body

  if (HentDataForArkiveringResponse) {
    const { Elevelement, Feilmelding } = HentDataForArkiveringResponse.HentDataForArkiveringResponseElm
    if (Feilmelding.Feiltype === 'INGEN DATA') {
      logger('info', ['get-soap-response', 'GET', 'no data'])
      return []
    }
    const elements = Array.isArray(Elevelement) ? Elevelement : [Elevelement]
    logger('info', ['get-soap-response', 'GET', `got ${elements.length} elements`])
    return elements
  } else if (LagreStatusArkiverteDataResponse) {
    const { ArkiveringUtfort, Feilmelding } = LagreStatusArkiverteDataResponse.LagreStatusArkiverteDataResponseElm
    if (ArkiveringUtfort === 'false') {
      logger('error', ['get-soap-response', 'SET', 'failed', Feilmelding])
      return Feilmelding
    } else {
      logger('info', ['get-soap-response', 'SET', 'success'])
      return {}
    }
  }
}
