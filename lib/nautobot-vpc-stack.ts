import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';


export class NautobotVpcStack extends Stack {
  public readonly vpc: Vpc;
  public readonly alb: ApplicationLoadBalancer;
  public readonly nautobotSecurityGroup: SecurityGroup;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'NautobotVpc', {
      maxAzs: 3,
      vpcName: 'NautobotVpc',
    });
    this.vpc = vpc

    const alb = new ApplicationLoadBalancer(this, 'NautobotALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'NautobotALB',
    });
    this.alb = alb

    const nautobotSecurityGroup = new SecurityGroup(this, 'NautobotSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'NautobotSecurityGroup',
    });

    nautobotSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    nautobotSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080), 'Allow inbound from ALB');

    this.nautobotSecurityGroup = nautobotSecurityGroup
  }
}