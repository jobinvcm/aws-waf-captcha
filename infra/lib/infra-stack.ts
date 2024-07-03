import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, CorsRule, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as waf from 'aws-cdk-lib/aws-wafv2';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, 'OAI');
    const s3CorsRule: CorsRule = {
      allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
      maxAge: 300,
    };

    // Create an S3 bucket for the static website
    const siteBucket = new Bucket(this, 'SiteBucket', {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true,
    });

    // Deploy the static website files to the S3 bucket
    new BucketDeployment(this, 'DeployWebsite', {
      sources: [Source.asset(path.join(__dirname, '..', '..', 'web', 'build'))],
      destinationBucket: siteBucket,
    });

    // Grant access to CloudFront to read from the S3 bucket
    siteBucket.grantRead(originAccessIdentity);
    
    siteBucket.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [siteBucket.arnForObjects('*')],
      principals: [originAccessIdentity.grantPrincipal],
      effect: Effect.ALLOW,
    }));

    // Create a CloudFront distribution
    const distribution = new Distribution(this, 'InfraDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(siteBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
    });

    // Output the CloudFront distribution URL
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });
  }
}
