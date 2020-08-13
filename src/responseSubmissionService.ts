import * as jxml from 'js2xmlparser'
import * as xmlbuilder from 'xmlbuilder'
import {UdbConnection} from 'drc-udb-connection';
import {Log} from './util/log';

declare var ScoreService: any;

const log = Log.genericLog('');
const sql  = require('mssql')

var sqlQueryTestTicket = `
select AdministrationID, DocumentID from Document.TestTicket
where RegistrationID = :regId
`

var sqlInsertOT = `
insert Insight.OnlineTests (AdministrationID,DocumentID,Method,Section,ElapsedTime)
output INSERTED.OnlineTestID
values (:adminId,:docId,NULL,NULL,NULL);
`

var sqlInsertOTR =`insert into Insight.OnlineTestResponses (AdministrationID, OnlineTestID, ItemID, Position, Extended Response) values ?`

export class ResponseSubmissionService {

  static async processSubmission(payload: any, udb: UdbConnection): Promise<any> {
    //working assumption: convert incoming JSON to XML (a la Local Scanning) and pass through to UDB
    //no need to check existing/create students
    //don't score items

    try {
      let regId = payload.registrationId
      let testDocInfo: any = []
      let responseSubmission: any = {}

	  //using incoming RegistrationID, query Document.TestTicket for AdminId and DocumentID
      testDocInfo = await udb.query(sqlQueryTestTicket, regId)
      let adminId = testDocInfo[0]
      let docId = testDocInfo[1]

      log.info('testDocInfo from Document.TestTicket', testDocInfo)

      //create the entry in Insight.OnlineTests and return the derived OnlineTestID
      let onlineTestId = await udb.query(sqlInsertOT,{AdministrationID: adminId, DocumentID: docId})

      log.info('otID', onlineTestId)

      //build an object out of the payload
      responseSubmission.Items = []

      let pos = 0
	  //go through each Item in the payload and set the values for each row to be inserted in Insight.OnlineTestResponses
      for(let item of payload.Items) {
	      responseSubmission.Items[pos].adminId = adminId
		    responseSubmission.Items[pos].OTID = onlineTestId
        responseSubmission.Items[pos].itemId = item.ItemID
        responseSubmission.Items[pos].position = pos+1
        responseSubmission.Items[pos].extendedResponse = jxml.parse("Item",item.Inputs)
        pos++
      }

      log.info('Items array object', responseSubmission.Items)

      //create Insight.OnlineTestResponses entries for each ItemID within the OnlineTestID
      //await udb.query(sqlInsertOTR, [responseSubmission.Items])
      const table = new sql.Table('Insight.OnlineTestResponses');
      table.create = false;
      //recordset.toTable()?
      table.columns.add('AdministrationID',sql.Int,{ nullable: false });
      table.columns.add('OnlineTestID',sql.Int,{ nullable: false });
      table.columns.add('ItemID',sql.VarChar(50),{ nullable: false });
      table.columns.add('Position',sql.Int,{ nullable: true });
      //type?
      table.columns.add('ExtendedResponse',sql.nVarChar('max'),{ nullable: true });
      //

      log.info('bulk table', table)

      responseSubmission.Items.array.forEach(element => {
        table.rows.add(element);
      });

      const request = new sql.Request();
      request.bulk(table, (err, result) => {
        log.info('bulk insert error',table)
      })

    }
    catch (error){
      log.error('Error submitting responses to UDB', error);
    throw error;
    }
  }
}