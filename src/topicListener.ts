import { UdbConnection } from 'drc-udb-connection';
import { Log } from './util/log';
import { config } from './util/config';
import { ResponseSubmissionService } from './responseSubmissionService';
import { readS3 } from './util/s3reader';


const log = Log.genericLog('ResponseSubmissionListener');

export async function handler(event: any, context) {
  try {
    log.info('event', event);
    const promises = event.Records.map(async (record) => {
      try {
        const body = JSON.parse(record.body);
        log.info('SQS incoming', body);
        const udb = await UdbConnection.create(body.client.toLowerCase(), config.environment);
        const obj = await readS3(body.bucketName, body.key);
        log.info('S3 incoming', obj);
        return await ResponseSubmissionService.processSubmission(obj, udb);
      } catch (e) {
        log.error('Error processing queue', e);
        throw e;
      }
    });
    await Promise.all(promises);
  } catch (e) {
    log.error('Error in topicListener', e);
    throw e;
  }
}