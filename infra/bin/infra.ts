#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

const createStacks = async () => {

  const baseStack = new InfraStack(app, 'infra-stack-waf-poc-captcha', {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
  
    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  
    /* Uncomment the next line if you know exactly what Account and Region you
     * want to deploy the stack to. */
    // env: { account: '123456789012', region: 'us-east-1' },
    // env: {
    //   region: 'ap-southeast-2'
    // }
    env: {
      region: 'us-east-1'
    },
    crossRegionReferences: true
  
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  });
  // const wafStack = new InfraStack(app, 'infra-stack-waf-poc-captcha-waf-resource', {
  //   env: {
  //     region: 'ap-southeast-2'
  //   },
  //   crossRegionReferences: true
  // })
  
  const baseStackS3Oai = baseStack.createS3andOrigin();
  const baseStackApi = baseStack.createLambda()
  const baseStackDistribution = baseStack.createCloudfrontDistribution(baseStackS3Oai.siteBucket, baseStackS3Oai.originAccessIdentity, baseStackApi);
  const wafStackAclGlobal =  baseStack.createAWebAclGlobally(baseStackDistribution)

  baseStack.createS3Deployment(wafStackAclGlobal.wafCaptchaResource, baseStackS3Oai.siteBucket)
}

createStacks()
