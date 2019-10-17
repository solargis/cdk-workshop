#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import * as IAM from 'aws-sdk/clients/iam';

import { CdkWorkshopStack } from './cdk-workshop-stack';

new IAM().getUser((err, res) => {
  const app = new App();
  new CdkWorkshopStack(app, `cdk-workshop-${res.User.UserName}`);
});
