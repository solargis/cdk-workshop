import {
  aws_apigateway,
  aws_cloudfront,
  aws_dynamodb,
  aws_lambda,
  aws_lambda_nodejs,
  aws_s3,
  aws_s3_deployment,
  aws_s3_notifications
} from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
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

    const imageBucket = new aws_s3.Bucket(this, 'ImageBucket');

    const pinTable = new aws_dynamodb.Table(this, 'PinTable', {
      partitionKey: {
        name: 'pointUrl',
        type: aws_dynamodb.AttributeType.STRING
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Lambda layers

    const apiDependenciesLayer = new aws_lambda.LayerVersion(this, `ApiDependenciesLayer_${props.userName}`, {
      code: aws_lambda.Code.fromAsset('layers/api-deps', { exclude: ['nodejs/node_modules/@types'] }),
      compatibleRuntimes: [aws_lambda.Runtime.NODEJS_14_X, aws_lambda.Runtime.NODEJS_16_X],
      license: 'Apache-2.0',
      description: 'Node dependencies for API lambda handlers'
    });

    const sharpLayer = new aws_lambda.LayerVersion(this, `SharpLayer_${props.userName}`, {
      code: aws_lambda.Code.fromAsset('layers/sharp'),
      compatibleRuntimes: [aws_lambda.Runtime.NODEJS_14_X, aws_lambda.Runtime.NODEJS_16_X],
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

    const helloHandler = new aws_lambda_nodejs.NodejsFunction(this, 'HelloHandler', {
      entry: resolve(rootPath, 'lib/api/hello-lambda.ts'),
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      bundling: {
        externalModules: ['aws-sdk', ...getLayerExternalModules('layers/api-deps')]
      },
      layers: [apiDependenciesLayer],
      environment
    });

    const pinHandler = new aws_lambda_nodejs.NodejsFunction(this, 'PinHandler', {
      entry: resolve(rootPath, 'lib/api/pin-lambda.ts'),
      timeout: Duration.seconds(30),
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      memorySize: 512,
      bundling: {
        externalModules: ['aws-sdk', ...getLayerExternalModules('layers/api-deps')]
      },
      layers: [apiDependenciesLayer],
      environment
    });
    imageBucket.grantReadWrite(pinHandler);
    pinTable.grantReadWriteData(pinHandler);

    const thumbnailHandler = new aws_lambda_nodejs.NodejsFunction(this, 'ThumbnailHandler', {
      entry: resolve(rootPath, 'lib/api/thumbnail-lambda.ts'),
      runtime: aws_lambda.Runtime.NODEJS_16_X,
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
    imageBucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(thumbnailHandler),
      { prefix: 'original' }
    );

    const api = new aws_apigateway.RestApi(this, `CdkWorkshopAPI_${props.userName}`);
    Tags.of(api).add('public', 'true')

    const helloApi = api.root.addResource('hello');
    helloApi.addMethod('GET', new aws_apigateway.LambdaIntegration(helloHandler));

    const pinApi = api.root.addResource('pin');

    // OPTIONS /pin
    addCorsOptions(pinApi);
    // ANY /pin
    pinApi.addMethod('ANY', new aws_apigateway.LambdaIntegration(pinHandler));

    const pinPointApi = pinApi.addResource('{pointUrl}');

    // OPTIONS /pin/{pointUrl}
    addCorsOptions(pinPointApi);
    // ANY /pin/{pointUrl}
    pinPointApi.addMethod('ANY', new aws_apigateway.LambdaIntegration(pinHandler));

    // WEB

    const webBucket = new aws_s3.Bucket(this, 'WebBucket', {
      websiteIndexDocument: 'index.html'
    });

    webBucket.grantPublicAccess();
    Tags.of(webBucket).add('public', 'true');

    const webSource = aws_s3_deployment.Source.asset(resolve(rootPath, 'dist/web'));

    const webDeployment = new aws_s3_deployment.BucketDeployment(this, 'WebDeployment', {
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

    const cloudFrontProps: aws_cloudfront.CloudFrontWebDistributionProps = {
      priceClass: aws_cloudfront.PriceClass.PRICE_CLASS_100,
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

    const cloudFront = new aws_cloudfront.CloudFrontWebDistribution(this, 'WebDistribution', cloudFrontProps);

    new CfnOutput(this, 'WebDistributionDomainName', { value: cloudFront.distributionDomainName });
  }
}
