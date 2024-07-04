#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
// import { InfraStack } from '../lib/infra-stack-v1';
// import { WafCloudFrontStack } from '../lib/waf-cloudfront-stack-v1';
import { InfraStack } from '../lib/infra-stack-bare';

const app = new cdk.App();



// Define environments
// const usEast1Env = { region: 'us-east-1' };
const apSoutheast2Env = { region: 'ap-southeast-2' };

new InfraStack(app, 'InfraStack', { env: apSoutheast2Env, crossRegionReferences: true });

// // Create InfraStack in ap-southeast-2
// const infraStack = new InfraStack(app, 'InfraStack', { env: apSoutheast2Env, crossRegionReferences: true });

// const infraStackOutput = infraStack.createStack();
// console.log('output', infraStackOutput)

// // Create WafCloudFrontStack in us-east-1
// const wafCloudFrontStack = new WafCloudFrontStack(app, 'WafCloudFrontStack', { env: usEast1Env, crossRegionReferences: true });

// // Ensure that WafCloudFrontStack depends on InfraStack
// wafCloudFrontStack.addDependency(infraStack);
