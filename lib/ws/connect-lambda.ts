import { /*APIGatewayEventRequestContext,*/ APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const ddb = new DocumentClient();
export async function handler(event: APIGatewayProxyEvent/*, context: APIGatewayEventRequestContext*/) {
  try {
    await ddb.put({
      TableName: process.env.CONNECTIONS_TABLE as string,
      Item: { connectionId: event.requestContext.connectionId },
    }).promise();
  } catch (err) {
    console.error(err);
    return { statusCode: 500 };
  }
  return { statusCode: 200 };
};
