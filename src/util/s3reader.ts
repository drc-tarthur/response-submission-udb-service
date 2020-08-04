import {S3} from 'aws-sdk';
import { Log } from './log';

const log = Log.genericLog('SQSReader');

export async function readS3(bucket, key): Promise<any> {

  const s3 = new S3();

  const params = {
    Bucket: bucket,
    Key: key,
  };
  const r: any = await s3.getObject(params).promise();
  log.info('S3 raw', r);
  return JSON.parse(r.Body);

}