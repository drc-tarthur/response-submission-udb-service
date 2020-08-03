  
import AWS = require('aws-sdk');
import * as request from 'request-promise';
import { Log } from './util/log';

const log = Log.genericLog('UdbCacheService');

const udbSecretKey = 'udb-db-secrets/logins/edmwinuser';
const domainSuffix = '.datarecognitioncorp.com';

const cache = {};

const ports = {
  dev3: '6003',
  dev4: '6004',
  dev5: '6005',
  sql: '6001',
};

const envLookup = {
  stg: 'staging',
  production: 'prod'
};

export async function getIDSInfo(client: string, environment: string): Promise<any> {
  if (client === 'unittest') {
    return {
      server: 'sqldev003',
      instance: 'dev3',
      database: 'unittest_udb_dev',
    };
  }

  try {
    const url = `https://${client}-insightdata-${environment}.drcedirect.com/insightdataservice/clients`;
    let r = JSON.parse(await request.get(url));
    r = r[0].extensions;
    return {
      server: r['mainUdb.server'].split('\\')[0] + domainSuffix,
      instance: r['mainUdb.server'].split('\\')[1],
      database: r['mainUdb.database'],
    };
  } catch (e) {
    log.error('Error retrieving UDB connection info', e);
    throw e;
  }
}

export async function getInfo(client: string, environment: string): Promise<any> {
  try {
    environment = envLookup[environment] || environment;
    const key = `${client}/${environment}`;
    if (!cache[key]) {
      log.info(`Looking up UDB connection for ${client}/${environment}`);
      cache[key] = await getIDSInfo(client, environment);
      cache[key].port = ports[cache[key].instance];
      cache[key].username = 'edmwinuser';
      cache[key].password = 'S3(0nDaRy!';
    }
    return cache[key];
  } catch (e) {
    log.error('Error retrieving UDB connection info', e);
    throw e;
  }
}