import { /*APIGatewayEventRequestContext,*/ APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const dynamo = new DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT
});

export async function connect(event: APIGatewayProxyEvent/*, context: APIGatewayEventRequestContext*/) {
  try {
    await dynamo.put({
      TableName: process.env.CONNECTIONS_TABLE as string,
      Item: { connectionId: event.requestContext.connectionId },
    }).promise();
  } catch (err) {
    console.error(err);
    return { statusCode: 500 };
  }
  return { statusCode: 200 };
};

export async function disconnect(event: APIGatewayProxyEvent) {
  await dynamo.delete({
    TableName: process.env.CONNECTIONS_TABLE as string,
    Key: { connectionId: event.requestContext.connectionId },
  }).promise();
  return { statusCode: 200 };
};

export async function defaultHandler(event: APIGatewayProxyEvent) {
  const connectionId = event.requestContext.connectionId as string;

  const callbackEndpoint = process.env.WS_CALLBACK_URL as string; // event.requestContext.domainName + '/' + event.requestContext.stage;

  const callbackAPI = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: callbackEndpoint
  });
  try {
    const connectionInfo = await callbackAPI.getConnection({ ConnectionId: connectionId }).promise();
    // connectionInfo.connectionID = connectionId;

    await callbackAPI
      .postToConnection({
        ConnectionId: connectionId,
        Data: 'Use the sendmessage route to send a message. Your info:' + JSON.stringify(connectionInfo),
      })
      .promise()
      .catch(e => handleConnectionError(e, connectionId));
    return { statusCode: 200 };
  } catch (e) {
    console.log(e);
    return { statusCode: 500 };
  }

};

export async function sendMessage(event: APIGatewayProxyEvent) {
  let connections;
  try {
    connections = await dynamo.scan({
      TableName: process.env.CONNECTIONS_TABLE as string
    }).promise();
  } catch (err) {
    return { statusCode: 500 };
  }
  const callbackEndpoint = process.env.WS_CALLBACK_URL as string; // event.requestContext.domainName + '/' + event.requestContext.stage;

  const callbackAPI = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: callbackEndpoint,
  });

  const message = JSON.parse(event.body || 'No message').message;

  const sendMessages = (connections.Items || []).map(async ({ connectionId }) => {
    if (connectionId !== event.requestContext.connectionId) {
      // console.log('*** sending message', callbackEndpoint, connectionId, message);
      await callbackAPI
        .postToConnection({ ConnectionId: connectionId, Data: message })
        .promise()
        .catch(e => handleConnectionError(e, connectionId));
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

export const handleConnectionError = async (e:any, connectionId: string) => {
  if (e.statusCode === 410 /* stale connection, delete connection record */) {
    await dynamo.delete({
      TableName: process.env.CONNECTIONS_TABLE as string,
      Key: { connectionId }
    })
  } else {
    throw e;
  }
}
