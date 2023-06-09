import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';


export class NautobotVpcStack extends Stack {
  public readonly vpc: Vpc;
  public readonly alb: ApplicationLoadBalancer;
  public readonly nautobotSecurityGroup: SecurityGroup;
  constructor(scope: Construct, id: string, stage: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, `${stage}NautobotVpc`, {
      maxAzs: 3,
      vpcName: `${stage}NautobotVpc`,
    });
    this.vpc = vpc

    const nautobotSecurityGroup = new SecurityGroup(this, `${stage}NautobotSecurityGroup`, {
      vpc,
      allowAllOutbound: true,
      securityGroupName: `${stage}NautobotSecurityGroup`,
    });

    nautobotSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    nautobotSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080), 'Allow HTTPS');

    this.nautobotSecurityGroup = nautobotSecurityGroup

    const alb = new ApplicationLoadBalancer(this, `${stage}NautobotALB`, {
      vpc,
      internetFacing: true,
      loadBalancerName: `${stage}NautobotALB`,
      securityGroup: this.nautobotSecurityGroup
    });
    this.alb = alb
  }
}