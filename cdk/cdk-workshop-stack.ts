import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { CfnOutput, Construct, Stack, StackProps } from '@aws-cdk/core';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { path as rootPath } from 'app-root-path';
import { resolve } from 'path';

import { WebIndex } from './web-index';

export interface CdkWorkshopStackProps extends StackProps {
  userName: string;
}

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkWorkshopStackProps) {
    super(scope, id, props);

    const apiCode = Code.fromAsset('dist/api');

    const helloHandler = new Function(this, 'HelloHandler', {
      code: apiCode,
      runtime: Runtime.NODEJS_10_X,
      handler: 'hello-lambda.handler'
    });

    const api = new RestApi(this, `CdkWorkshopAPI_${props.userName}`);

    const helloApi = api.root.addResource('hello');
    helloApi.addMethod('GET', new LambdaIntegration(helloHandler));

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
