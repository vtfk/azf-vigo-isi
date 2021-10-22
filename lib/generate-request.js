const { ISI: { USERNAME, PASSWORD } } = require('../config')

const documentsRequest = (uuid, counter, docCount, fylke) => {
  return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ser="http://rim2.ist.com/rim2/v1/service" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <soap:Header>
  <o:Security soap:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><o:UsernameToken u:Id="uuid-${uuid}-${counter}"><o:Username>${USERNAME}</o:Username><o:Password>${PASSWORD}</o:Password></o:UsernameToken></o:Security>
  </soap:Header>
  <soap:Body>
     <ser:HentDataForArkivering>
        <!--Optional:-->
        <HentDataForArkiveringRequestElm>
           <AntallElevDokument>${docCount}</AntallElevDokument>
           <Fylke>${fylke}</Fylke>
        </HentDataForArkiveringRequestElm>
     </ser:HentDataForArkivering>
  </soap:Body>
</soap:Envelope>`
}

const statusRequest = (uuid, counter, docId, ssn) => {
  return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ser="http://rim2.ist.com/rim2/v1/service" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <soap:Header>
  <o:Security soap:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><o:UsernameToken u:Id="uuid-${uuid}-${counter}"><o:Username>${USERNAME}</o:Username><o:Password>${PASSWORD}</o:Password></o:UsernameToken></o:Security>
  </soap:Header>
  <soap:Body>
      <ser:LagreStatusArkiverteData>
        <!--Optional:-->
        <LagreStatusArkiverteDataRequestElm>
            <Fagsystemnavn>${uuid}</Fagsystemnavn>
            <DokumentId>${docId}</DokumentId>
            <Fodselsnummer>${ssn}</Fodselsnummer>
            <ArkiveringUtfort>true</ArkiveringUtfort>
            <Feilmelding>
              <FeilId></FeilId>
              <Feiltype></Feiltype>
              <DetaljertBeskrivelse></DetaljertBeskrivelse>
            </Feilmelding>
        </LagreStatusArkiverteDataRequestElm>
      </ser:LagreStatusArkiverteData>
  </soap:Body>
  </soap:Envelope>`
}

module.exports = {
  documentsRequest,
  statusRequest
}
