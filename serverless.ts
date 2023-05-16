// https://www.serverless.com/framework/docs/providers/aws/guide/intro

// NOTE: For local development only
// NOTE: All AWS resources are deployed using CDK

import type { Serverless } from 'serverless/aws';

const imageBucketLocal = 'ImageBucketLocal';
const pinTableLocal = 'PinLocal';
const connectionsTableLocal = 'ConnectionsLocal';

const localPort = {
  http: 4000,
  websocket: 4001,
  lambda: 4004,
  s3: 9000,
  dynamodb: 8000
};

// serverless.ts

const serverlessConfiguration: Promise<Serverless> = new Promise(resolve => {
  resolve({
    service: 'cdk-workshop-local',
    plugins: [
      'serverless-dynamodb-local',
      'serverless-s3-local',
      'serverless-plugin-offline-dynamodb-stream',
      'serverless-offline'
    ],
    provider: {
      name: 'aws',
      runtime: 'nodejs16.x',
      region: 'eu-west-1',
      stage: 'local',
      environment: {
        AWS_ACCESS_KEY_ID: 'local_id',
        AWS_SECRET_ACCESS_KEY: 'local_secret',
        S3_ENDPOINT: 'http://localhost:9000',
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
        IMAGE_BUCKET: imageBucketLocal,
        PIN_TABLE: pinTableLocal,
        CONNECTIONS_TABLE: connectionsTableLocal,
        TEMP_DIR: '.local/tmp',
      },
      websocketsApiRouteSelectionExpression: '$request.body.action'
    },
    custom: {
      'serverless-offline': {
        httpPort: localPort.http,
        lambdaPort: localPort.lambda,
        websocketPort: localPort.websocket
      },
      dynamodb: {
        stages: ['local'],
        start: {
          port: localPort.dynamodb,
          dbPath: '.local/dynamo',
          sharedDb: true,
          migrate: true
        }
      },
      dynamodbStream: {
        host: 'localhost',
        port: localPort.dynamodb,
        pollForever: true,
        streams: [
          { table: pinTableLocal, functions: ['pinStream'] },
        ]
      },
      s3: {
        host: '0.0.0.0',
        port: localPort.s3,
        directory: '.local/s3'
      }
    },
    resources: {
      Resources: {
        imageBucketLocal: { // TODO resolve from CDK template
          Type: 'AWS::S3::Bucket',
          Properties: { BucketName: imageBucketLocal }
        },
        pinTableLocal: { // TODO resolve from CDK template
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: pinTableLocal,
            AttributeDefinitions: [{ AttributeName: 'pointUrl', AttributeType: 'S' }],
            KeySchema: [{ AttributeName: 'pointUrl', KeyType: 'HASH' }],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
            StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' }
          }
        },
        connectionsTableLocal: { // TODO resolve from CDK template
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: connectionsTableLocal,
            AttributeDefinitions: [{ AttributeName: 'connectionId', AttributeType: 'S' }],
            KeySchema: [{ AttributeName: 'connectionId', KeyType: 'HASH' }],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
          }
        }
      }
    },
    functions: { // TODO resolve from CDK stack
      hello: {
        handler: 'dist/api/hello-lambda.handler',
        events: [
          { http: { method: 'get', path: '/hello', cors: true } }
        ],
      },
      pin: {
        handler: 'dist/api/pin-lambda.handler',
        events: [
          { http: { method: 'any', path: '/pin', cors: true } },
          { http: { method: 'any', path: '/pin/{pointUrl}', cors: true } }
        ]
      },
      pinStream: {
        handler: 'dist/api/pin-stream-lambda.handler',
        environment: {
          WS_CALLBACK_URL: `http://localhost:${localPort.websocket}`
        }
      },
      thumbnail: {
        handler: 'dist/api/thumbnail-lambda.handler',
        events: [
          { s3: { bucket: imageBucketLocal, event: 's3:ObjectCreated:*', rules: [{ prefix: 'original' }] } }
        ]
      },
      connectHandler: {
        handler: 'dist/api/websocket-lambda.connect',
        events: [
          { websocket: { route: '$connect' } }
        ]
      },
      disconnectHandler: {
        handler: 'dist/api/websocket-lambda.disconnect',
        events: [
          { websocket: { route: '$disconnect' } }
        ]
      },
      defaultHandler: {
        handler: 'dist/api/websocket-lambda.defaultHandler',
        events: [
          { websocket: { route: '$default' } }
        ],
        environment: {
          WS_CALLBACK_URL: `http://localhost:${localPort.websocket}`
        }
      },
      sendMessageHandler: {
        handler: 'dist/api/websocket-lambda.sendMessage',
        events: [
          { websocket: { route: 'sendmessage' } }
        ],
        environment: {
          WS_CALLBACK_URL: `http://localhost:${localPort.websocket}`
        }
      }
    }
  })
});

module.exports = serverlessConfiguration;
