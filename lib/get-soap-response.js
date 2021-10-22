module.exports = json => {
  console.log(JSON.stringify(json, null, 2))
  if (json['S:Envelope']) {
    const response = json['S:Envelope']['S:Body']['ns2:HentDataForArkiveringResponse'].HentDataForArkiveringResponseElm
    if (response.Feilmelding.Feiltype === 'INGEN DATA') return []

    if (Array.isArray(response.Elevelement)) return response.Elevelement
    else return [response.Elevelement]
  } else if (json['soap:Envelope'] && json['soap:Envelope']['soap:Body'] && json['soap:Envelope']['soap:Body']['ser:LagreStatusArkiverteDataResponse']) {
    const data = json['soap:Envelope']['soap:Body']['ser:LagreStatusArkiverteDataResponse'].LagreStatusArkiverteDataResponseElm
    if (data.ArkiveringUtfort === 'false') return data.Feilmelding
    else if (data.ArkiveringUtfort === 'true') return {}
  } else if (json['S:Body'] && json['S:Body']['ns2:LagreStatusArkiverteDataResponse']) {
    const data = json['S:Body']['ns2:LagreStatusArkiverteDataResponse'].LagreStatusArkiverteDataResponseElm
    if (data.ArkiveringUtfort === 'false') return data.Feilmelding
    else if (data.ArkiveringUtfort === 'true') return {}
  }
}
