import { Callback, Context, DynamoDBStreamEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

import { BaseStreamRecord, unmarshallStreamRecords } from './utils/dynamodb-stream.utils';
import { SavedPin, SavedPinChange, SavedPinKey } from '../shared/types/pin.types';
import { resolveSignedUrl } from './utils/s3.utils';
import { handleConnectionError } from './websocket-lambda';

type SavedPinStreamRecord = BaseStreamRecord<SavedPinKey, SavedPin>;

const connectionsTable = process.env.CONNECTIONS_TABLE as string;

const dynamo = new DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT
});

export const handler = async (event: DynamoDBStreamEvent, context: Context, callback: Callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const records: SavedPinStreamRecord[] = unmarshallStreamRecords(event.Records);

    console.log('*** pin data changed ***', JSON.stringify(records, null, 2));

    const connections = await dynamo
      .scan({ TableName: connectionsTable })
      .promise()
      .then(result => result.Items);

    if (connections?.length) {
      const callbackAPI = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: process.env.WS_CALLBACK_URL as string,
      });

      const pinChanges: SavedPinChange[] = records
        .map(({ dynamodb: { Keys, NewImage }, eventName }) =>
          ({ ...Keys, eventName, NewImage: resolveSignedUrl(NewImage) }));

      const pinChangesJson = JSON.stringify(pinChanges);

      const sendMessages = connections
        .map(async ({ connectionId }) => callbackAPI
          .postToConnection({ ConnectionId: connectionId, Data: pinChangesJson })
          .promise()
          .catch(e => handleConnectionError(e, connectionId))
      );
      await Promise.all(sendMessages);
    }
  } catch (e) {
    console.error(e);
  }
  callback(null, 'done');
};
