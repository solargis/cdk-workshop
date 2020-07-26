import { LambdaIntegration, RestApi, CfnIntegrationV2, CfnRouteV2, CfnApiV2 } from '@aws-cdk/aws-apigateway';
// import * as gw from '@aws-cdk/aws-apigatewayv2';
import { CloudFrontWebDistribution, CloudFrontWebDistributionProps, PriceClass } from '@aws-cdk/aws-cloudfront';
import { CfnOutput, Construct, Duration, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { AttributeType, BillingMode, Table, StreamViewType } from '@aws-cdk/aws-dynamodb';
import { Code, Function, LayerVersion, Runtime, StartingPosition } from '@aws-cdk/aws-lambda';
import { Bucket, EventType } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { LambdaDestination } from '@aws-cdk/aws-s3-notifications';
import { path as rootPath } from 'app-root-path';
import { resolve } from 'path';
import { Topic } from '@aws-cdk/aws-sns';
// import * as subs from '@aws-cdk/aws-sns-subscriptions'
// import { DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources'

import { PolicyStatement, Effect, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

import { addCorsOptions } from './cors.utils';
import { WebIndex } from './web-index';

export interface CdkWorkshopStackProps extends StackProps {
  userName: string;
}

export class CdkWorkshopStack extends Stack {
  constructor (scope: Construct, id: string, props: CdkWorkshopStackProps) {
    super(scope, id, props);

    // API

    const topic = new Topic(this, 'Topic', {
      displayName: 'Pin topic',
      topicName: 'PinTopic'
    });

    const imageBucket = new Bucket(this, 'ImageBucket');

    const pinTable = new Table(this, 'PinTable', {
      replicationRegions: [process.env.AWS_REGION as string],
      stream: StreamViewType.NEW_IMAGE,
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
        PIN_TABLE: pinTable.tableName,
        PIN_TOPIC: topic.topicArn ?? 'notopic'
      }
    });

    const pinSocketFunction = new Function(this, 'PinSocket', {
      code: apiCode,
      runtime: Runtime.NODEJS_12_X,
      handler: 'pin-socket-lambda.handler',
      environment: {
        PIN_STREAM: pinTable.tableName,
        PIN_TOPIC: topic.topicArn
      }
    });

    pinTable.grantStream(pinSocketFunction);
    // pinSocketFunction.addEventSource(
    //   new DynamoEventSource(pinTableStream, {
    //     startingPosition: StartingPosition.LATEST,
    //     batchSize: 10
    //   })
    // )

    pinSocketFunction.addEventSourceMapping('PinStream', {
      eventSourceArn: pinTable.tableStreamArn as string,
      startingPosition: StartingPosition.LATEST
    });

    // new EventSourceMapping(this, 'PinStream', {
    //   eventSourceArn: pinTableStream.tableStreamArn,
    //   target: pinSocketFunction,
    //   startingPosition: StartingPosition.LATEST
    // })

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

    const wsApiGw = new CfnApiV2(this, 'pinSocketGw', {
      name: 'pinSocketGw',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.message'
    });
    const apiId = wsApiGw.ref

    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [pinHandler.functionArn],
      actions: ['lambda:InvokeFunction']
    });

    const wsRole = new Role(this, 'socketGwRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
    });

    wsRole.addToPolicy(policy);

    const wsConnectIntegreation = new CfnIntegrationV2(
      this,
      'wsConnectIntegreation',
      {
        apiId,
        integrationType: 'AWS_PROXY',
        integrationUri: `arn:aws:apigateway:${process.env.AWS_REGION}:lambda:path/2015-03-31/functions/${pinHandler.functionArn}/invocations`,
        credentialsArn: wsRole.roleArn
      }
    );
    const wsConnect = new CfnRouteV2(this, 'pinSocketConnect', {
      apiId,
      routeKey: '$connect',
      target: `integrations${wsConnectIntegreation.ref}`
    });

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
    })

    webIndex.node.addDependency(webDeployment);

    new CfnOutput(this, 'WebBucketUrl', {
      value: webBucket.bucketWebsiteUrl
    });

    // CDN

    const cloudFrontProps: CloudFrontWebDistributionProps = {
      priceClass: PriceClass.PRICE_CLASS_100,
      originConfigs: [{
        s3OriginSource: { s3BucketSource: webBucket },
        behaviors: [
          {
            pathPattern: 'index.html',
            defaultTtl: Duration.seconds(0),
            maxTtl: Duration.seconds(0),
            minTtl: Duration.seconds(0)
          },
          { isDefaultBehavior: true }
        ]
      }]
    };

    const cloudFront = new CloudFrontWebDistribution(this, 'WebDistribution', cloudFrontProps);

    new CfnOutput(this, 'WebDistributionDomainName', { value: cloudFront.domainName });
  }
}
