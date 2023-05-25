import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition, LogDrivers, FargateService, Protocol } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { NautobotDockerImageStack } from './nautobot-docker-image-stack';  // import your Docker image stack

export class NautobotFargateEcsStack extends Stack {
  constructor(scope: Construct, id: string, dockerStack: NautobotDockerImageStack, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'MyVpc', {
      maxAzs: 3,
    });

    const cluster = new Cluster(this, 'nautobot-cluster', {
      vpc,
    });

    const alb = new ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
    });

    //Nautobot App Task Definition and Service
    const appTaskDefinition = new FargateTaskDefinition(this, 'AppTaskDefinition', {
      memoryLimitMiB: 4096,
      cpu: 2048,
    });

    // Replace the hardcoded image name with the image from the Docker stack
    const appContainer = appTaskDefinition.addContainer('nautobot', {
      image: ContainerImage.fromEcrRepository(dockerStack.repository, dockerStack.imageName),
      logging: LogDrivers.awsLogs({ streamPrefix: 'NautobotApp' }),
    });

    appContainer.addPortMappings({
      containerPort: 8080,
      protocol: Protocol.TCP,
    });

    // This is the FargateService instance for your Nautobot app.
    const appService = new FargateService(this, 'AppService', {
      cluster,
      taskDefinition: appTaskDefinition,
      assignPublicIp: true,
      desiredCount: 2,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
    });
    //Add other Task Definitions and Services (Nautobot Worker and Nautobot Scheduler) in a similar way

    //Add necessary load balancer configuration
    const listener = alb.addListener('Listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    listener.addTargets('NautobotApp', {
      port: 80,
      targets: [appService],
      healthCheck: {
        path: '/health',
      },
    });
  }
}
