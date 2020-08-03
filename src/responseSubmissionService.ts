import * as jxml from 'js2xmlparser'
import * as xmlbuilder from 'xmlbuilder'
import {UdbConnection} from 'drc-udb-connection';
import {Log} from './util/log';
//import {ParticipantMapper} from './participantMapper';

declare var ScoreService: any;

const log = Log.genericLog('');

var sqlQueryTestTicket = `
select AdministrationID, DocumentID from Document.TestTicket
where RegistrationID = :regId
`

var sqlInsertOT = `
insert Insight.OnlineTests (AdministrationID,DocumentID,Method,Section,ElapsedTime)
output INSERTED.OnlineTestID
values (:adminId,:docId,NULL,NULL,NULL);
`
/*
var sqlInsertOTR = `
declare @xt xml=:items;

declare @d table (adminId int, onlineTestId int, itemId int, pos int, response varchar(10), extendedResponse nvarchar(max));

insert @d (adminId,onlineTestId,itemId,pos,response,extendedResponse)
select :adminId,:onlineTestId,itemId,**POS**,response,**EXTENDEDRESPONSE**
from @xt.nodes('//items')

insert Insight.OnlineTestResponses (AdministrationID,OnlineTestID,ItemID,Position,Response,ExtendedResponse,ItemVersion)
select adminId,onlineTestId,itemId,pos,response,extendedResponse,"NULL"
from @d;
`
*/

var sqlInsertOTR =`insert into Insight.OnlineTestResponses values ?`
/*
function cleanObjectKeys(o) {
  const pattern = /"(\d+[-\w:]*)":/g
  let s = JSON.stringify(o,null,'')
  s = s.replace(pattern, '"_$1":')
  return JSON.parse(s)
}
*/
export class ResponseSubmissionService {

  static async processSubmission(payload: any, udb: UdbConnection): Promise<any> {
    //working assumption: convert incoming JSON to XML (a la Local Scanning) and pass through to UDB
    //no need to check existing/create students
    //don't score items

    try {
      let regId = payload.registrationId
      let testDocInfo: any = []
      let responseSubmission: any = {}

      //convert whole JSON message into XML?
      //responseSubmission.data = jxml.parse('responseSubmission',cleanObjectKeys(payload))

      testDocInfo = await udb.query(sqlQueryTestTicket, regId)
      let adminId = testDocInfo[0]
      let docId = testDocInfo[1]

      //create the entry in Insight.OnlineTests and return the derived OnlineTestID
      let onlineTestId = await udb.query(sqlInsertOT,{AdministrationID: adminId, DocumentID: docId})

      //build an object out of the payload
      responseSubmission.Items = []

      let pos = 0
      for(let item of payload.Items) {
        responseSubmission.Items[pos].itemId = item.ItemID
        responseSubmission.Items[pos].position = pos+1
        responseSubmission.Items[pos].extendedResponse = jxml.parse("Item",item.Inputs)
        pos++
      }

      //now I have an array of all the payload's items, called responseSubmission.Items[]
      //use that array as a nested SQL insert

      //create Insight.OnlineTestResponses entries for each ItemID within the OnlineTestID
      await udb.query(sqlInsertOTR, [responseSubmission.Items])

        

      //await udb.query(sqlInsertOTR,{items: responseSubmission.data, AdministrationID: adminId,OnlineTestID: onlineTestId,}) 

          //each table line is an ItemID with response XML
            //send XML params to SQL
            //build all ItemID inserts into one query
            //see 'sqlInsertTestEvents' from LRC
          //ExtendedResponse is the XML field with items/responses

    }
    catch {
    }
  }
}