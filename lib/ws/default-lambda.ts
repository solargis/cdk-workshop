import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

export async function handler(event: APIGatewayProxyEvent) {
  const connectionId = event.requestContext.connectionId as string;

  const callbackEndpoint = event.requestContext.domainName + '/' + event.requestContext.stage;

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
        Data:
          'Use the sendmessage route to send a message. Your info:' +
          JSON.stringify(connectionInfo),
      }).promise();
    return { statusCode: 200 };
  } catch (e) {
    console.log(e);
    return { statusCode: 500 };
  }

};
