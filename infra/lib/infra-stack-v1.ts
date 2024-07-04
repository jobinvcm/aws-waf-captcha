import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ssm from "aws-cdk-lib/aws-ssm";


export class InfraStack extends cdk.Stack {
  public  siteBucket: Bucket;
  public  api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }

  createStack() {

    // Define the Lambda function
    const myLambda = new lambda.Function(this, 'MyLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_16_X, // execution environment
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')), // code loaded from the "lambda" directory
      handler: 'index.handler', // file is "index", function is "handler"
    });

    // Add IAM policy to the Lambda function if needed
    myLambda.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:ListBucket'],
      resources: ['*']
    }));

    // Create an API Gateway REST API
    this.api = new apigateway.RestApi(this, "MyApi", {
      restApiName: "My Service",
      description: "This service serves requests to my Lambda function.",
      deployOptions: {
        stageName: 'prod'
      }
    });

    const apiV1Resource = this.api.root.addResource("apiv1");
    const myResource = apiV1Resource.addResource("myresource");
    const lambdaIntegration = new apigateway.LambdaIntegration(myLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    });
    myResource.addMethod("GET", lambdaIntegration); // GET /apiv1/myresource

    // Create S3 bucket for static content
    this.siteBucket = new Bucket(this, "SiteBucket", {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true,
    });

    // Deploy the static website files to the S3 bucket
    new BucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(path.join(__dirname, "..", "..", "web", "build")),
      ],
      destinationBucket: this.siteBucket,
    });
    new ssm.StringParameter(this, 'SiteBucketNameParam', {
      parameterName: '/myapp/siteBucketName',
      stringValue: this.siteBucket.bucketName,
    });

    new ssm.StringParameter(this, 'ApiUrlParam', {
      parameterName: '/myapp/apiUrl',
      stringValue: this.api.url,
    });
    // Output the bucket name and API URL
    new CfnOutput(this, "InfraSiteBucketName", {
      value: this.siteBucket.bucketName,
    });
    new CfnOutput(this, "InfraApiUrl", {
      value: this.api.url,
    });

    return { bucket: this.siteBucket.bucketName, url: this.api.url }
  }
}
