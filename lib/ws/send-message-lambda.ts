import { ApiGatewayManagementApi } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';

const ddb = new DocumentClient();

export async function handler(event: APIGatewayProxyEvent) {
  let connections;
  try {
    connections = await ddb.scan({
      TableName: process.env.CONNECTIONS_TABLE as string
    }).promise();
  } catch (err) {
    return { statusCode: 500 };
  }
  const callbackEndpoint = event.requestContext.domainName + '/' + event.requestContext.stage;

  const callbackAPI = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: callbackEndpoint,
  });

  const message = JSON.parse(event.body || 'No message').message;

  const sendMessages = (connections.Items || []).map(async ({ connectionId }) => {
    if (connectionId !== event.requestContext.connectionId) {
      try {
        console.log('*** sending message', callbackEndpoint, connectionId, message);
        await callbackAPI
          .postToConnection({ ConnectionId: connectionId, Data: message })
          .promise();
      } catch (e) {
        console.log(e);
      }
    }
  });

  try {
    await Promise.all(sendMessages);
  } catch (e) {
    console.log(e);
    return { statusCode: 500 };
  }
  return { statusCode: 200 };
};
