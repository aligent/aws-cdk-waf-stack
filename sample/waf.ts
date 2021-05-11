#!/usr/bin/env node
import 'source-map-support/register';
const cdk = require('@aws-cdk/core');
import { WAFPipelineStack } from '@aligent/aws-waf-stack';
import { preproduction_config, production_config } from '../lib/environments';

const app = new cdk.App();
new WAFPipelineStack(app, preproduction_config.envname, preproduction_config);
new WAFPipelineStack(app, production_config.envname, production_config);
