import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  CorsRule,
  HttpMethods,
} from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as waf from "aws-cdk-lib/aws-wafv2";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const todoWebACL = new waf.CfnWebACL(this, "TodoWebACL", {
    //   defaultAction: {
    //     allow: {},
    //   },
    //   captchaConfig: {
    //     immunityTimeProperty: {
    //       immunityTime: 60,
    //     },
    //   },
    //   scope: "CLOUDFRONT",
    //   visibilityConfig: {
    //     cloudWatchMetricsEnabled: true,
    //     metricName: "TodoWebACL",
    //     sampledRequestsEnabled: true,
    //   },
    //   name: "TodoWebACL",
    //   rules: [
    //     {
    //       name: "api-rule",
    //       priority: 0,
    //       statement: {
    //         byteMatchStatement: {
    //           searchString: "/api/",
    //           fieldToMatch: {
    //             uriPath: {},
    //           },
    //           textTransformations: [
    //             {
    //               priority: 0,
    //               type: "NONE",
    //             },
    //           ],
    //           positionalConstraint: "STARTS_WITH",
    //         },
    //       },
    //       action: {
    //         captcha: {},
    //       },
    //       visibilityConfig: {
    //         sampledRequestsEnabled: true,
    //         cloudWatchMetricsEnabled: true,
    //         metricName: "api-rule",
    //       },
    //     },
    //   ],
    // });

    // const serviceToken = cdk.CustomResourceProvider.getOrCreate(
    //   this,
    //   "Custom::WAFCaptchaResourceType",
    //   {
    //     codeDirectory: path.join(__dirname, "waf-captcha-resource"),
    //     runtime: cdk.CustomResourceProviderRuntime.NODEJS_16_X,
    //     description: "Lambda function created by the custom resource provider",
    //     policyStatements: [
    //       {
    //         Effect: "Allow",
    //         Action: "wafv2:CreateAPIKey",
    //         Resource: "*",
    //       },
    //       {
    //         Effect: "Allow",
    //         Action: "wafv2:ListAPIKeys",
    //         Resource: "*",
    //       },
    //     ],
    //   }
    // );

    // // Create a CloudFront Origin Access Identity
    // const originAccessIdentity = new OriginAccessIdentity(this, "OAI");
    // const s3CorsRule: CorsRule = {
    //   allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
    //   allowedOrigins: ["*"],
    //   allowedHeaders: ["*"],
    //   maxAge: 300,
    // };

    // // Create an S3 bucket for the static website
    // const siteBucket = new Bucket(this, "SiteBucket", {
    //   publicReadAccess: false,
    //   blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    //   autoDeleteObjects: true,
    // });

    // // Grant access to CloudFront to read from the S3 bucket
    // siteBucket.grantRead(originAccessIdentity);

    // siteBucket.addToResourcePolicy(
    //   new PolicyStatement({
    //     actions: ["s3:GetObject"],
    //     resources: [siteBucket.arnForObjects("*")],
    //     principals: [originAccessIdentity.grantPrincipal],
    //     effect: Effect.ALLOW,
    //   })
    // );

    // // Create a CloudFront distribution
    // const distribution = new Distribution(this, "InfraDistribution", {
    //   defaultRootObject: "index.html",
    //   defaultBehavior: {
    //     origin: new S3Origin(siteBucket, {
    //       originAccessIdentity: originAccessIdentity,
    //     }),
    //     viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //   },
    //   errorResponses: [
    //     {
    //       httpStatus: 403,
    //       responseHttpStatus: 200,
    //       responsePagePath: "/index.html",
    //       ttl: cdk.Duration.minutes(30),
    //     },
    //     {
    //       httpStatus: 404,
    //       responseHttpStatus: 200,
    //       responsePagePath: "/index.html",
    //       ttl: cdk.Duration.minutes(30),
    //     },
    //   ],
    // });
    // const wafCaptchaResource = new cdk.CustomResource(
    //   this,
    //   "WAFCaptchaResource",
    //   {
    //     resourceType: "Custom::WAFCaptchaResourceType",
    //     serviceToken: serviceToken,
    //     properties: {
    //       Domain: distribution.domainName,
    //     },
    //   }
    // );
    // // Deploy the static website files to the S3 bucket
    // new BucketDeployment(this, "DeployWebsite", {
    //   sources: [
    //     Source.asset(path.join(__dirname, "..", "..", "web", "build")),
    //     Source.jsonData("wafenv.json", {
    //       JSAPI_URL: wafCaptchaResource.getAtt("CaptchaIntegrationURL"),
    //       CAPTCHA_API_KEY: wafCaptchaResource.getAtt("APIKey"),
    //     }),
    //   ],
    //   destinationBucket: siteBucket,
    // });

    // // Output the CloudFront distribution URL
    // new cdk.CfnOutput(this, "DistributionDomainName", {
    //   value: distribution.distributionDomainName,
    // });
  }

  createAWebAclGlobally(distribution: Distribution) {
    const webAcl = new waf.CfnWebACL(this, "gift-card-web-acl", {
      defaultAction: {
        allow: {},
      },
      captchaConfig: {
        immunityTimeProperty: {
          immunityTime: 60,
        },
      },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "TodoWebACL",
        sampledRequestsEnabled: true,
      },
      name: "TodoWebACL",
      rules: [
        {
          name: "api-rule",
          priority: 0,
          statement: {
            byteMatchStatement: {
              searchString: "/api/",
              fieldToMatch: {
                uriPath: {},
              },
              textTransformations: [
                {
                  priority: 0,
                  type: "NONE",
                },
              ],
              positionalConstraint: "STARTS_WITH",
            },
          },
          action: {
            captcha: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "api-rule",
          },
        },
      ],
    });

    const serviceToken = cdk.CustomResourceProvider.getOrCreate(
      this,
      "Custom::WAFCaptchaResourceType",
      {
        codeDirectory: path.join(__dirname, "waf-captcha-resource"),
        runtime: cdk.CustomResourceProviderRuntime.NODEJS_16_X,
        description: "Lambda function created by the custom resource provider",
        policyStatements: [
          {
            Effect: "Allow",
            Action: "wafv2:CreateAPIKey",
            Resource: "*",
          },
          {
            Effect: "Allow",
            Action: "wafv2:ListAPIKeys",
            Resource: "*",
          },
        ],
      }
    );

    const wafCaptchaResource = new cdk.CustomResource(
      this,
      "WAFCaptchaResource",
      {
        resourceType: "Custom::WAFCaptchaResourceType",
        serviceToken: serviceToken,
        properties: {
          Domain: distribution.domainName,
        },
      }
    );

    return {webAcl, wafCaptchaResource}
  }

  createS3andOrigin() {
    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, "OAI");
    // Create an S3 bucket for the static website
    const siteBucket = new Bucket(this, "SiteBucket", {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true,
    });

    // Grant access to CloudFront to read from the S3 bucket
    siteBucket.grantRead(originAccessIdentity);

    siteBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: [originAccessIdentity.grantPrincipal],
        effect: Effect.ALLOW,
      })
    );

    return { siteBucket, originAccessIdentity };
  }

  createCloudfrontDistribution(
    siteBucket: Bucket,
    originAccessIdentity: OriginAccessIdentity
  ) {
    // Create a CloudFront distribution
    const distribution = new Distribution(this, "InfraDistribution", {
      defaultRootObject: "index.html",
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
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(30),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(30),
        },
      ],
    });

    // Output the CloudFront distribution URL
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });

    return distribution;
  }
  createS3Deployment(
    wafCaptchaResource: cdk.CustomResource,
    siteBucket: Bucket
  ) {
    // Deploy the static website files to the S3 bucket
    new BucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(path.join(__dirname, "..", "..", "web", "build")),
        Source.jsonData("wafenv.json", {
          JSAPI_URL: wafCaptchaResource.getAtt("CaptchaIntegrationURL"),
          CAPTCHA_API_KEY: wafCaptchaResource.getAtt("APIKey"),
        }),
      ],
      destinationBucket: siteBucket,
    });
  }
}


