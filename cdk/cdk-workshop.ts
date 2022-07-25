#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';

import { CdkWorkshopStack } from './cdk-workshop-stack';
import { getAwsStackName, getAwsUserName } from '../scripts/stack.utils';

getAwsUserName()
  .then(async userName => {
    const stackName = await getAwsStackName(userName);
    const app = new App();
    new CdkWorkshopStack(app, stackName, { userName });
  });
