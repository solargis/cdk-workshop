import { Construct, Stack, StackProps } from '@aws-cdk/core';

export interface CdkWorkshopStackProps extends StackProps {
  userName: string;
}

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkWorkshopStackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
  }
}
