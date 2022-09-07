import { CustomResource, Duration } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime, SingletonFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ISource } from 'aws-cdk-lib/aws-s3-deployment';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

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
      runtime: Runtime.NODEJS_16_X,
      handler: 'index.handler',
      lambdaPurpose: 'Custom::CDKWebIndex',
      timeout: Duration.seconds(30)
    });

    props.bucket.grantReadWrite(handler);

    const { zipObjectKey } = props.source.bind(this, { handlerRole: handler.role as Role });

    const webIndexProvider = new Provider(this, 'WebIndexProvider', {
      onEventHandler: handler,
      logRetention: RetentionDays.ONE_DAY
    });

    new CustomResource(this, 'WebIndexResource', {
      serviceToken: webIndexProvider.serviceToken,
      resourceType: 'Custom::CDKWebIndex',
      properties: {
        ApiBaseUrl: props.apiBaseUrl,
        WebBucketName: props.bucket.bucketName,
        zipObjectKey // force run on update dist/web
      }
    });

  }
}
