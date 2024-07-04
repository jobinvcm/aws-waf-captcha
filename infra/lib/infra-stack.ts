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
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  Distribution,
  OriginAccessIdentity,
  OriginProtocolPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin ,HttpOrigin} from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }

  createLambda() {
    // Define the Lambda function
    const myLambda = new lambda.Function(this, 'MyLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_16_X, // execution environment
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')), // code loaded from the "lambda" directory
      handler: 'index.handler', // file is "index", function is "handler"
    });

    // Add IAM policy to the Lambda function if needed
    myLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:ListBucket'],
      resources: ['*']
    }));


    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, "MyApi", {
      restApiName: "My Service",
      description: "This service serves requests to my Lambda function.",
    });

    const apiV1Resource = api.root.addResource("apiv1");
    const myResource = apiV1Resource.addResource("myresource");
    const lambdaIntegration = new apigateway.LambdaIntegration(myLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    });
    myResource.addMethod("GET", lambdaIntegration); // GET /apiv1/myresource

    return api;
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
    originAccessIdentity: OriginAccessIdentity,
    api: apigateway.RestApi
  ) {
    // Create a CloudFront distribution
    const distribution = new Distribution(this, "InfraDistribution", {
      defaultRootObject: "index.html",
  
      additionalBehaviors: {
        "/apiv1/*": {
          origin: new HttpOrigin(`${api.restApiId}.execute-api.${this.region}.amazonaws.com`, {
            originPath: `/${api.deploymentStage.stageName}`,
            protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
        } as BehaviorOptions,
      },
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


