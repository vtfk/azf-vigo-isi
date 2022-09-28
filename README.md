# azf-vigo-isi

API for archiving documents from VIGO-isi through blob-storage

## Usage

Available endpoints:

**All requests require a valid subscription-key**

[GetDocuments](#getdocuments): Fetches new documents from ISI-LOKAL and saves them as json in blob storage

[HandleDocument](#handledocument): Tries to archive a given document


### GET: GetDocuments
Fetches new documents from ISI-LOKAL, and saves them as json in blob storage

#### Usage
GET `https://apiurl.com/GetDocuments`

OPTIONAL query-parameter, ?onlyBlobRun=true || ?onlyBlobRun=false. If true, does not get new documents from vigo - but fetches documents from blob storage, if there are any. Defaults to false if not provided.

#### Description

1. Get variables used to contact ISI-LOKAL service:
    - **uuid**: A unique id used to identify the request. Stored in a local sql db on the same server as vigo-ISI-LOKAL.
    - **counter**: An increasing counter, which follows the number of requests + number of documents retrieved from ISI-LOKAL. Stored in a local sql db on the same server as ISI-LOKAL.
        - For each request to ISI-LOKAL, update the counter with number of documents returned + 1 for the request itself. When setting a document-status in vigo - the counter must also be incremented with 1 for the request itself. The counter is updated after each successful request towards ISI-LOKAL.
        - If the counter reaches over 9999, the **uuid** is re-generated and the **counter** is set to `counter - 9999`. For example, if the counter is 9997, and you retrieve 5 documents, the counter will be increased by 6 (5 docs + 1 request). The counter will reach 10003, and thus be set to `10003 - 9999 = 4`, which will be used as the counter for the next request. 
    - **docCount**: Number of documents to retrieve in one request. Can be set in environment variable "DOC_COUNT"
    - **county**: County number/fylkesnummer the documents to fetch belongs to. Can be set in the environment variable "COUNTY"
2. Generate the request, based on the variables (See how the request to ISI-LOKAL is generated in [generate-request.js](./lib/generate-request.js))
3. Post request, retrieve the result and convert the horrible SOAP-xml response to usable json 🍕
4. Update variables in local db with **uuid** and **counter**
5. For each document in the response - save the document to blob-storage, and add properties for retry. *Documents are retrieved and stored in blobs because if we do not cache them, you would have to contact VIGO-people to get them again. No fun.*

### POST: HandleDocument
Tries to archive a document from blob-storage

#### Usage
POST `https://apiurl.com/handle/{blobId}`, where *blobId* is the name of the blob in blobStorage.

#### Description

1. Checks documentType and gets correct flow for the documentType
2. Runs flow
    - If successfull => deletes blob
    - If not => updates blob to retry from the flowdef.task that failed in (RETRY_INTERVAL_HOURS * blobContent.retryCount) hours.


## Set up a flow for a documentType
To add a new documenttype-flow, create a new .js file inside the flows directory, and define the order and which flowdefs to use for the new documenttype. See example below:


```js
const runFlow = require('../run-flow')

module.exports = async blobContent => {
  return await runFlow(blobContent, {
    syncElevmappa: true, // Creates or updates elevmappe for the student
    archive: true, // archives the document (e.g SOKER_N only creates elevmappe, archive is false)
    archiveOptions: {
      useStudentName: true, // adds studentName to UnofficialTitle when archiving
      determineFileExt: true // does not assume the file is pdf - but finds the fileExt and uses that instead.
    },
    signOff: true, // signs off documents in the archive (Used when "Innkommende dokument" is not to be "saksbehandlet" in P360) (Can not be used in combination with response-letter)
    statusVigo: true, // Sets status on the given document to "Arkivert" in VIGO,
    archiveResponseLetter: true, // Uses the azf-archive-template vigo-<DOKUMENTTYPE>-response, which creates a pdf, and archives it. Also handles address block/invalid address
    sendResponseLetter: true, // Dispatches the reponse letter to SvarUT
    signOffResponseLetter: true, // Signs off the original <DOKUMENTTYPE> with "Besvart med utgående dokument <DOKUMENTTYPE>-reponse-letter" 
    e18Stats: true // Add statistics to E18
  })
}

```
Each property (e.g "syncElevmappa") is a "task" that will be retried if it failed in the previous run.

## Env variables / local.settings.json
```json
{
    "IsEncrypted": false,
    "Values": {
      "AzureWebJobsStorage": "",
      "FUNCTIONS_WORKER_RUNTIME": "node",
      "ARCHIVE_KEY": "subscription_key",
      "ARCHIVE_URL": "https://archiveapiurl.com",
      "AZURE_BLOB_CONNECTIONSTRING": "blobstring",
      "AZURE_BLOB_CONTAINERNAME": "blobContainerName",
      "COUNTY": "fylkesnummer",
      "DB_DATABASE": "LocalDBName",
      "DB_PASSWORD": "supersecret",
      "DB_SERVER": "LocalDBServer",
      "DB_TABLE": "UUIDTable",
      "DB_USER": "someone",
      "DEMO": "true/false",
      "DOC_COUNT": "how many docs to fetch from VIGO for each GetDocuments request",
      "E18_JOB_PROJECT_ID": "project in Innovasjonsløypa",
      "E18_JOB_SYSTEM": "vigo-isi",
      "E18_JOB_TYPE": "Arkivering",
      "E18_KEY": "a TOKEN",
      "E18_URL": "https://e18ApiUrl.no",
      "ISI_PASSWORD": "superpassword for the isi-local service",
      "ISI_URL": "url to the isi-local service",
      "ISI_USERNAME": "username to the isi-local service",
      "NODE_ENV": "development || production",
      "PAPERTRAIL_DISABLE_LOGGING": "false || true",
      "PAPERTRAIL_HOST": "url to papertrail",
      "PAPERTRAIL_TOKEN": "token to papertrail",
      "RESPONSEHANDLER_LOGGER_LOCAL_DISABLE": "true || false",
      "RESPONSEHANDLER_LOGGER_REMOTE_DISABLE": "true || false",
      "RETRY_INTERVAL_HOURS": "interval for retrying (hours)",
      "RETRY_MAX_COUNT": "max retry count",
      "TEAMS_WEBHOOK_URL": "for automatic teams alert on WARN and ERROR logging",
      "FILE_FORMATS": "UF,DOC,XLS,PPT - accepted file ext in the archive"
    }
}


```
