import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';

export function handler(event: APIGatewayProxyEvent, context: Context, callback: Callback) {
  console.log('*** hello ***', event);
  callback(null, {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message: `Hello from CDK Lambda, ${Date.now()}` })
  });
}
