import {
  aws_iam as iam,
  custom_resources as cr,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface SSMParameterReaderProps {
  parameterName: string;
  region: string;
}

export class SSMParameterReader extends Construct {
  public readonly parameterValue: string;

  constructor(scope: Construct, id: string, props: SSMParameterReaderProps) {
    super(scope, id);

    const { parameterName, region } = props;

    const ssmAwsSdkCall: cr.AwsSdkCall = {
      service: 'SSM',
      action: 'getParameter',
      parameters: {
        Name: parameterName,
      },
      region,
      physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
    };

    const customResource = new cr.AwsCustomResource(this, 'Resource', {
      onUpdate: ssmAwsSdkCall,
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          resources: ['*'],
          actions: ['ssm:GetParameter'],
          effect: iam.Effect.ALLOW,
        }),
      ]),
    });

    this.parameterValue = customResource.getResponseField('Parameter.Value');
  }
}
