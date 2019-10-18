import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { CfnOutput, Construct, Duration, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { AttributeType, BillingMode, Table } from '@aws-cdk/aws-dynamodb';
import { Code, Function, LayerVersion, Runtime } from '@aws-cdk/aws-lambda';
import { Bucket, EventType } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { LambdaDestination } from '@aws-cdk/aws-s3-notifications';
import { path as rootPath } from 'app-root-path';
import { resolve } from 'path';

import { addCorsOptions } from './cors.utils';
import { WebIndex } from './web-index';

export interface CdkWorkshopStackProps extends StackProps {
  userName: string;
}

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkWorkshopStackProps) {
    super(scope, id, props);

    // API

    const imageBucket = new Bucket(this, 'ImageBucket');

    const pinTable = new Table(this, 'PinTable', {
      partitionKey: {
        name: 'pointUrl',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const apiCode = Code.fromAsset('dist/api');

    const helloHandler = new Function(this, 'HelloHandler', {
      code: apiCode,
      runtime: Runtime.NODEJS_10_X,
      handler: 'hello-lambda.handler'
    });

    const pinHandler = new Function(this, 'PinHandler', {
      code: apiCode,
      runtime: Runtime.NODEJS_10_X,
      handler: 'pin-lambda.handler',
      environment: {
        IMAGE_BUCKET: imageBucket.bucketName,
        PIN_TABLE: pinTable.tableName
      }
    });
    imageBucket.grantReadWrite(pinHandler);
    pinTable.grantReadWriteData(pinHandler);

    const sharpLayer = new LayerVersion(this, `SharpLayer_${props.userName}`, {
      code: Code.fromAsset('lib/layers/sharp_layer.zip'),
      compatibleRuntimes: [Runtime.NODEJS_10_X],
      license: 'Apache-2.0',
      description: 'Sharp image processing library v.0.23.1'
    });

    const thumbnailHandler = new Function(this, 'ThumbnailHandler', {
      code: apiCode,
      runtime: Runtime.NODEJS_10_X,
      handler: 'thumbnail-lambda.handler',
      layers: [sharpLayer],
      memorySize: 1536,
      timeout: Duration.seconds(60),
      environment: {
        IMAGE_BUCKET: imageBucket.bucketName,
        PIN_TABLE: pinTable.tableName
      }
    });
    imageBucket.grantReadWrite(thumbnailHandler);
    pinTable.grantReadWriteData(thumbnailHandler);

    // S3 integration
    imageBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(thumbnailHandler),
      { prefix: 'original' }
    );

    const api = new RestApi(this, `CdkWorkshopAPI_${props.userName}`);

    const helloApi = api.root.addResource('hello');
    helloApi.addMethod('GET', new LambdaIntegration(helloHandler));

    const pinApi = api.root.addResource('pin');

    // OPTIONS /pin
    addCorsOptions(pinApi);
    // ANY /pin
    pinApi.addMethod('ANY', new LambdaIntegration(pinHandler));

    const pinPointApi = pinApi.addResource('{pointUrl}');

    // OPTIONS /pin/{pointUrl}
    addCorsOptions(pinPointApi);
    // ANY /pin/{pointUrl}
    pinPointApi.addMethod('ANY', new LambdaIntegration(pinHandler));

    // WEB

    const webBucket = new Bucket(this, 'WebBucket', {
      websiteIndexDocument: 'index.html'
    });

    webBucket.grantPublicAccess();

    const webSource = Source.asset(resolve(rootPath, 'dist/web'));

    const webDeployment = new BucketDeployment(this, 'WebDeployment', {
      sources: [webSource],
      destinationBucket: webBucket
    });

    const webIndex = new WebIndex(this, 'WebIndex', {
      apiBaseUrl: api.url,
      source: webSource,
      bucket: webBucket
    });

    webIndex.node.addDependency(webDeployment);

    new CfnOutput(this, 'WebBucketUrl', {
      value: webBucket.bucketWebsiteUrl
    });
  }
}
