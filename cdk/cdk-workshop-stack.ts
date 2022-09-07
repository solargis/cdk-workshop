import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { CloudFrontWebDistribution, CloudFrontWebDistributionProps, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

import { path as rootPath } from 'app-root-path';
import { resolve } from 'path';
import readJsonSync from 'read-json-sync';

import { addCorsOptions } from './cors.utils';
import { WebIndex } from './web-index';

export interface CdkWorkshopStackProps extends StackProps {
  userName: string;
}

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkWorkshopStackProps) {
    super(scope, id, props);

    // Tags
    const tags = Tags.of(scope);
    tags.add('language', 'TypeScript');
    tags.add('team', 'webapps');
    tags.add('app', 'CDK workshop');

    // API resources

    const imageBucket = new Bucket(this, 'ImageBucket');

    const pinTable = new Table(this, 'PinTable', {
      partitionKey: {
        name: 'pointUrl',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Lambda layers

    const apiDependenciesLayer = new LayerVersion(this, `ApiDependenciesLayer_${props.userName}`, {
      code: Code.fromAsset('layers/api-deps', { exclude: ['nodejs/node_modules/@types'] }),
      compatibleRuntimes: [Runtime.NODEJS_14_X, Runtime.NODEJS_16_X],
      license: 'Apache-2.0',
      description: 'Node dependencies for API lambda handlers'
    });

    const sharpLayer = new LayerVersion(this, `SharpLayer_${props.userName}`, {
      code: Code.fromAsset('layers/sharp'),
      compatibleRuntimes: [Runtime.NODEJS_14_X, Runtime.NODEJS_16_X],
      license: 'Apache-2.0',
      description: 'Sharp image processing library ^0.30.7'
    });

    // TODO make util/extend LayerVersion
    const getLayerExternalModules = (path: string) => {
      const layerPackage = readJsonSync(resolve(rootPath, `${path}/nodejs/package.json`), { encoding: 'utf8' });
      return Object.keys(layerPackage.dependencies);
    }

    // Lambda handlers

    const environment = {
      IMAGE_BUCKET: imageBucket.bucketName,
      PIN_TABLE: pinTable.tableName
    };

    const helloHandler = new NodejsFunction(this, 'HelloHandler', {
      entry: resolve(rootPath, 'lib/api/hello-lambda.ts'),
      runtime: Runtime.NODEJS_16_X,
      bundling: {
        externalModules: ['aws-sdk', ...getLayerExternalModules('layers/api-deps')]
      },
      layers: [apiDependenciesLayer],
      environment
    });

    const pinHandler = new NodejsFunction(this, 'PinHandler', {
      entry: resolve(rootPath, 'lib/api/pin-lambda.ts'),
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_16_X,
      memorySize: 512,
      bundling: {
        externalModules: ['aws-sdk', ...getLayerExternalModules('layers/api-deps')]
      },
      layers: [apiDependenciesLayer],
      environment
    });
    imageBucket.grantReadWrite(pinHandler);
    pinTable.grantReadWriteData(pinHandler);

    const thumbnailHandler = new NodejsFunction(this, 'ThumbnailHandler', {
      entry: resolve(rootPath, 'lib/api/thumbnail-lambda.ts'),
      runtime: Runtime.NODEJS_16_X,
      bundling: {
        externalModules: [
          'aws-sdk',
          ...getLayerExternalModules('layers/api-deps'),
          ...getLayerExternalModules('layers/sharp')
        ]
      },
      layers: [apiDependenciesLayer, sharpLayer],
      memorySize: 1536,
      timeout: Duration.seconds(30),
      environment
    });
    imageBucket.grantReadWrite(thumbnailHandler);
    imageBucket.grantPutAcl(thumbnailHandler);
    pinTable.grantReadWriteData(thumbnailHandler);

    // S3 integration
    imageBucket.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(thumbnailHandler), { prefix: 'original' });

    const api = new RestApi(this, `CdkWorkshopAPI_${props.userName}`);
    Tags.of(api).add('public', 'true')

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
    Tags.of(webBucket).add('public', 'true');

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

    new CfnOutput(this, 'WebDistributionDomainName', { value: cloudFront.distributionDomainName });
  }
}
