import { DynamoDB } from 'aws-sdk';
import { CreateTableInput } from 'aws-sdk/clients/dynamodb';
import waitOn from 'wait-on';
import { parse } from 'url';

import { ensureTables as ensure } from './dynamodb.utils';

const pinTableLocal = 'PinLocal';

export async function ensureTables(): Promise<void> {
  const dynamoOpts = { endpoint: 'http://localhost:8000', region: 'local' };
  const { host } = parse(dynamoOpts.endpoint || '');

  console.log('Waiting for:', `tcp:${host}`);

  const connectionPromise = waitOn({ resources: [`tcp:${host}`], timeout: 30000 });

  return connectionPromise
    .then(() => {
      const dynamodb = new DynamoDB({ ...dynamoOpts, sslEnabled: false });
      const schemas: CreateTableInput[] = [{ // TODO resolve from CDK
        TableName: pinTableLocal,
        AttributeDefinitions: [
          { AttributeName: 'pointUrl', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'pointUrl', KeyType: 'HASH' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        }
      }];
      return ensure(dynamodb, ...schemas);
    })
    .catch(err => {
      console.error('Wait for DynamoDB port', err);
    });

}
