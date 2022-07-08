import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';

export function handler(event: APIGatewayProxyEvent, context: Context, callback: Callback) {
  callback(null, {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      message: 'Hello from CDK Lambda',
      now: Date.now(),
      env: {
        PIN_TABLE: process.env.PIN_TABLE,
        IMAGE_BUCKET: process.env.IMAGE_BUCKET
      }
    })
  });
}
