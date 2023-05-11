import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const ddb = new DocumentClient();

export async function handler(event: APIGatewayProxyEvent) {
  await ddb.delete({
    TableName: process.env.CONNECTIONS_TABLE as string,
    Key: { connectionId: event.requestContext.connectionId },
  }).promise();
  return { statusCode: 200 };
};
