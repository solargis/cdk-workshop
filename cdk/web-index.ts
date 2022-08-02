import { aws_iam, aws_lambda, aws_logs, aws_s3, aws_s3_deployment, custom_resources } from 'aws-cdk-lib';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { path as rootPath } from 'app-root-path';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface WebDeploymentProps {
  bucket: aws_s3.IBucket;
  source: aws_s3_deployment.ISource;
  apiBaseUrl: string;
}

export class WebIndex extends Construct {
  constructor(scope: Construct, id: string, props: WebDeploymentProps) {
    super(scope, id);

    const handlerPath = resolve(rootPath, 'cdk/web-index-lambda.js');
    const handlerCode = readFileSync(handlerPath, 'utf8');

    const handler = new aws_lambda.SingletonFunction(this, 'WebIndexLambda', {
      uuid: '4c84aa14-4077-11e9-bd73-47fe778e69cb',
      code: aws_lambda.Code.fromInline(handlerCode),
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      lambdaPurpose: 'Custom::CDKWebIndex',
      timeout: Duration.seconds(30)
    });

    props.bucket.grantReadWrite(handler);

    const { zipObjectKey } = props.source.bind(this, { handlerRole: handler.role as aws_iam.Role });

    const webIndexProvider = new custom_resources.Provider(this, 'WebIndexProvider', {
      onEventHandler: handler,
      logRetention: aws_logs.RetentionDays.ONE_DAY
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
