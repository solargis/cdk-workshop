import { APIGatewayProxyEvent, Context } from 'aws-lambda'

export function handler (event: APIGatewayProxyEvent, context: Context) {
  console.log('STREAM', event)
}
