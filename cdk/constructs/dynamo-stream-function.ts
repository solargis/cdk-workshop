import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, FunctionProps, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface DynamoStreamProps {
  table?: Table;
  tableStreamArn?: string;
  startingPosition: StartingPosition;
}

export class DynamoStreamFunction extends Function {
  constructor(scope: Construct, id: string, props: DynamoStreamProps & FunctionProps) {
    super(scope, id, props);
    applyDynamoStreamToLambda(id, this, props);
  }
}

export class DynamoStreamNodejsFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: DynamoStreamProps & NodejsFunctionProps) {
    super(scope, id, props);
    applyDynamoStreamToLambda(id, this, props);
  }
}

function applyDynamoStreamToLambda(handlerId: string, handler: Function, props: DynamoStreamProps) {
  if (props.table) {
    handler.addEventSource(new DynamoEventSource(props.table, {
      startingPosition: props.startingPosition
    }));

  // workaround for streamArn: https://github.com/awslabs/aws-cdk/issues/1321
  } else if (props.tableStreamArn) {
    handler.addEventSourceMapping(`DynamoDBEventSource:${handlerId}`, {
      eventSourceArn: props.tableStreamArn,
      startingPosition: props.startingPosition
    });
    handler.addToRolePolicy(new PolicyStatement({
      actions: ['dynamodb:ListStreams'],
      resources: ['*']
    }));
    handler.addToRolePolicy(new PolicyStatement({
      actions: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator'],
      resources: [props.tableStreamArn]
    }));
  } else {
    throw Error('Missing DynamoDB table or tableStreamArn');
  }
}
