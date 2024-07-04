import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, CfnOutput, Fn } from "aws-cdk-lib";
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
import { S3Origin, HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as path from "path";
import { Bucket } from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSMParameterReader } from "./helpers/ssm-parameter-reader";


export class WafCloudFrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const siteBucketName = Fn.importValue("InfraSiteBucketName");
    // const apiUrl = Fn.importValue("InfraApiUrl");
    // const siteBucketName = ssm.StringParameter.valueForStringParameter(this, '/myapp/siteBucketName');
    // const apiUrl = ssm.StringParameter.valueForStringParameter(this, '/myapp/apiUrl');

    const InfraSiteBucketNameResource = new SSMParameterReader(this, 'InfraSiteBucketNameResource', {
      parameterName: '/myapp/siteBucketName',
      region: 'ap-southeast-2'
    });
    const siteBucketName = InfraSiteBucketNameResource.parameterValue

    new cdk.CfnOutput(this, 'customresoruceoutput', {
      value: siteBucketName
    })

    const apiUrlResource = new SSMParameterReader(this, 'ApiUrltNameResource', {
      parameterName: '/myapp/siteBucketName',
      region: 'ap-southeast-2'
    });
    const apiUrl = apiUrlResource.parameterValue


    // Create CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, "OAI");

    // Create WAF
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

    // Create CloudFront distribution
    const distribution = new Distribution(this, "InfraDistribution", {
      defaultRootObject: "index.html",
      additionalBehaviors: {
        "/apiv1/*": {
          // origin: new HttpOrigin(`${apiUrl}`.replace('https://', ''), {
          origin: new HttpOrigin(`https://d2yhznh91b.execute-api.ap-southeast-2.amazonaws.com`.replace('https://', ''), {
            originPath: `/prod`,
            protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
        } as BehaviorOptions,
      },
      defaultBehavior: {
        // origin: new S3Origin(Bucket.fromBucketName(this, 'ImportedBucket', siteBucketName), {
        origin: new S3Origin(Bucket.fromBucketName(this, 'ImportedBucket', 'infrastack-sitebucket397a1860-4hqpdjyxnwnh'), {
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
    new CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
  }

}
