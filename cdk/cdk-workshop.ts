#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';

import { CdkWorkshopStack } from './cdk-workshop-stack';

const app = new App();
new CdkWorkshopStack(app, 'cdk-workshop');
