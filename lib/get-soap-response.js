module.exports = json => {
  console.log(JSON.stringify(json, null, 2))
  const body = json.Envelope ? json.Envelope.Body : json.Body
  const { HentDataForArkiveringResponse, LagreStatusArkiverteDataResponse } = body

  if (HentDataForArkiveringResponse) {
    const { Elevelement, Feilmelding } = HentDataForArkiveringResponse.HentDataForArkiveringResponseElm
    if (Feilmelding.Feiltype === 'INGEN DATA') return []
    return Array.isArray(Elevelement) ? Elevelement : [Elevelement]
  } else if (LagreStatusArkiverteDataResponse) {
    const { ArkiveringUtfort, Feilmelding } = LagreStatusArkiverteDataResponse.LagreStatusArkiverteDataResponseElm
    return ArkiveringUtfort === 'false' ? Feilmelding : {}
  }
}
