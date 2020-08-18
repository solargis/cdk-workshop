import { CustomResource, CustomResourceProvider } from '@aws-cdk/aws-cloudformation';
import { Role } from '@aws-cdk/aws-iam';
import { Code, Runtime, SingletonFunction } from '@aws-cdk/aws-lambda';
import { IBucket } from '@aws-cdk/aws-s3';
import { ISource } from '@aws-cdk/aws-s3-deployment';
import { Construct, Duration } from '@aws-cdk/core';
import { path as rootPath } from 'app-root-path';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface WebDeploymentProps {
  bucket: IBucket;
  source: ISource;
  apiBaseUrl: string;
}

export class WebIndex extends Construct {
  constructor(scope: Construct, id: string, props: WebDeploymentProps) {
    super(scope, id);

    const handlerPath = resolve(rootPath, 'cdk/web-index-lambda.js');
    const handlerCode = readFileSync(handlerPath, 'utf8');

    const handler = new SingletonFunction(this, 'WebIndexLambda', {
      uuid: '4c84aa14-4077-11e9-bd73-47fe778e69cb',
      code: Code.fromInline(handlerCode),
      runtime: Runtime.NODEJS_10_X,
      handler: 'index.handler',
      lambdaPurpose: 'Custom::CDKWebIndex',
      timeout: Duration.seconds(30)
    });

    props.bucket.grantReadWrite(handler);

    const { zipObjectKey } = props.source.bind(this, { handlerRole: handler.role as Role });

    new CustomResource(this, 'CustomResource', {
      provider: CustomResourceProvider.lambda(handler),
      resourceType: 'Custom::CDKWebIndex',
      properties: {
        ApiBaseUrl: props.apiBaseUrl,
        WebBucketName: props.bucket.bucketName,
        zipObjectKey // force run on update dist/web
      }
    });

  }
}
