// https://www.serverless.com/framework/docs/providers/aws/guide/intro

// NOTE: For local development only
// NOTE: All AWS resources are deployed using CDK

import { readFileSync } from 'fs';
import type { Serverless } from 'serverless/aws';

import { getAwsStackName } from './scripts/stack.utils';

const imageBucketLocal = 'ImageBucketLocal';
const pinTableLocal = 'PinLocal';

const localPort = {
  http: 4000,
  s3: 9000,
  dynamodb: 8000
};

// serverless.ts

const serverlessConfiguration: Promise<Serverless> = getAwsStackName().then(async stackName => {
  const stackTemplateStr = readFileSync(`cdk.out/${stackName}.template.json`, { encoding: 'utf8' });
  const stackTemplate = JSON.parse(stackTemplateStr);

  const stackResourceEntries: [string, any][] = Object.entries(stackTemplate.Resources);

  const functionEntries = stackResourceEntries
    .filter(([, val]) => val.Type === 'AWS::Lambda::Function')
    .filter(([, val]) => val.Properties.Runtime.startsWith('node'))
    .filter(([, val]) => val.Metadata['aws:cdk:path'] && !val.Metadata['aws:cdk:path'].startsWith(`${stackName}/Custom::`));

  // const functionsWithInvocations = functions.map(([key, val]) => {
  //   const invocations = stackResourceEntries
  //     .filter(([, val]) => val.Type === 'AWS::Lambda::Permission')
  //     .filter(([, val]) => val.Properties.Action === 'lambda:InvokeFunction' && val.Properties.Principal === 'apigateway.amazonaws.com')
  //     .filter(([, val]) => val.Properties.FunctionName['Fn::GetAtt'][0] === key)
  //     .map(([, val]) => val.Properties.SourceArn['Fn::Join'][1][val.Properties.SourceArn['Fn::Join'][1].length - 1])
  //     .filter(path => !path.startsWith('/test-invoke-stage/'));
  //   return [key, val, invocations];
  // });

  const [,helloFunction] = functionEntries.find(([key]) => key.startsWith('HelloHandler')) as [string, any];
  const [,pinFunction] = functionEntries.find(([key]) => key.startsWith('PinHandler')) as [string, any];
  const [,thumbnailFunction] = functionEntries.find(([key]) => key.startsWith('ThumbnailHandler')) as [string, any];

  return {
    service: stackName,
    plugins: [
      'serverless-dynamodb-local',
      'serverless-s3-local',
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
        TEMP_DIR: '.local/tmp',
      }
    },
    custom: {
      'serverless-offline': {
        httpPort: localPort.http
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
          Properties: {
            BucketName: imageBucketLocal
          }
        },
        pinTableLocal: { // TODO resolve from CDK template
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: pinTableLocal,
            AttributeDefinitions: [
              { AttributeName: 'pointUrl', AttributeType: 'S' }
            ],
            KeySchema: [
              { AttributeName: 'pointUrl', KeyType: 'HASH' }
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1
            }
          }
        }
      }
    },
    functions: { // TODO resolve from CDK template
      hello: {
        handler: cfnFunctionHandler(helloFunction),
        events: [
          {
            http: {
              method: 'get',
              path: '/hello',
              cors: true
            }
          },
        ],
      },
      pin: {
        handler: cfnFunctionHandler(pinFunction),
        events: [
          {
            http: {
              method: 'any',
              path: '/pin',
              cors: true
            }
          },
          {
            http: {
              method: 'any',
              path: '/pin/{pointUrl}',
              cors: true
            }
          }
        ]
      },
      thumbnail: {
        handler: cfnFunctionHandler(thumbnailFunction),
        events: [
          {
            s3: {
              bucket: imageBucketLocal,
              event: 's3:ObjectCreated:*',
              rules: [
                {
                  prefix: 'original'
                }
              ]
            }
          }
        ]
      }
    }
  };
});

function cfnFunctionHandler(cfnFunction: any): string {
  const assetPath = cfnFunction.Metadata['aws:asset:path'];
  return (assetPath.startsWith('/') ? assetPath : `cdk.out/${assetPath}`) + '/' + cfnFunction.Properties.Handler;
}

module.exports = serverlessConfiguration;
