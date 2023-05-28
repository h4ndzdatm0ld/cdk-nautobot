import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { SubnetType, SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition, LogDrivers, FargateService, Protocol } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { NautobotDockerImageStack } from './nautobot-docker-image-stack';
import { NginxDockerImageStack } from './nginx-docker-image-stack';
import { NautobotSecretsStack } from './nautobot-secrets-stack';
import { NautobotVpcStack } from './nautobot-vpc-stack';
import { NautobotDbStack } from './nautobot-db-stack';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export class NautobotFargateEcsStack extends Stack {
  constructor(scope: Construct, id: string, dockerStack: NautobotDockerImageStack, nginxStack: NginxDockerImageStack, secretsStack: NautobotSecretsStack, vpcStack: NautobotVpcStack, dbStack: NautobotDbStack, props?: StackProps) {
    super(scope, id, props);

    const vpc = vpcStack.vpc;

    const cluster = new Cluster(this, 'NautobotCluster', {
      containerInsights: true,
      vpc,
    });

    cluster.addDefaultCloudMapNamespace({
      name: 'nauotbot',
    });

    // Define a new IAM role for your Fargate Task Definitions
    const ecsTaskRole = new Role(this, 'ECSTaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Attach the necessary managed policies to your role
    ecsTaskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    ecsTaskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'));

    // Define a new IAM role for your Fargate Service Execution
    const ecsExecutionRole = new Role(this, 'ECSExecutionRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Attach the necessary managed policies to your role
    ecsExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    ecsExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'));

    const alb = new ApplicationLoadBalancer(this, 'NautobotALB', {
      vpc,
      internetFacing: true,
    });

    // Nautobot Worker
    const nautobotWorkerTaskDefinition = new FargateTaskDefinition(this, 'NautobotWorkerTaskDefinition', {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: ecsTaskRole,
      executionRole: ecsExecutionRole,
    });
    // Initialize the environment variable object
    let environment: { [key: string]: string } = {        // Make sure to pass the database and Redis information to the Nautobot app.
      'NAUTOBOT_DB_HOST': dbStack.postgresInstance.dbInstanceEndpointAddress,
      'NAUTOBOT_REDIS_HOST': dbStack.redisCluster.attrRedisEndpointAddress,
    };

    // update secrets w/ DB PW
    secretsStack.secrets["NAUTOBOT_DB_PASSWORD"] = ecs.Secret.fromSecretsManager(dbStack.nautobotDbPassword, "password");

    const nautobotWorkerContainer = nautobotWorkerTaskDefinition.addContainer('nautobot-worker', {
      image: ContainerImage.fromDockerImageAsset(dockerStack.image),
      logging: LogDrivers.awsLogs({ streamPrefix: 'NautobotWorker' }),
      environment: environment,
      secrets: secretsStack.secrets,
      command: [
        'nautobot-server',
        'celery',
        'worker',
      ],
      healthCheck: {
        command: ['CMD', 'bash', '-c', 'nautobot-server celery inspect ping --destination celery@$HOSTNAME'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
        retries: 5,
      }
    });



    const workerService = new FargateService(this, 'WorkerService', {
      cluster,
      enableExecuteCommand: true,
      taskDefinition: nautobotWorkerTaskDefinition,
      assignPublicIp: false,
      desiredCount: 2,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Nautobot Scheduler Task Definition and Service
    const nautobotSchedulerTaskDefinition = new FargateTaskDefinition(this, 'NautobotSchedulerTaskDefinition', {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: ecsTaskRole,
      executionRole: ecsExecutionRole,
    });

    const nautobotSchedulerContainer = nautobotSchedulerTaskDefinition.addContainer('nautobot-scheduler', {
      image: ContainerImage.fromDockerImageAsset(dockerStack.image),
      logging: LogDrivers.awsLogs({ streamPrefix: 'NautobotScheduler' }),
      environment: environment,
      secrets: secretsStack.secrets,
      command: [
        'nautobot-server',
        'celery',
        'beat',
      ],
    });

    const schedulerService = new FargateService(this, 'SchedulerService', {
      cluster,
      enableExecuteCommand: true,
      taskDefinition: nautobotSchedulerTaskDefinition,
      assignPublicIp: false,
      desiredCount: 1, // Generally, there should be only one scheduler instance running
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Nautobot App Task Definition and Service
    const nautobotAppTaskDefinition = new FargateTaskDefinition(this, 'NautobotAppTaskDefinition', {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: ecsTaskRole,
      executionRole: ecsExecutionRole,

    });

    const nautobotAppContainer = nautobotAppTaskDefinition.addContainer('nautobot', {
      image: ContainerImage.fromDockerImageAsset(dockerStack.image),
      logging: LogDrivers.awsLogs({ streamPrefix: 'NautobotApp' }),
      environment: environment,
      secrets: secretsStack.secrets,
      // Can replace/use AWS Secrets Manager to store sensitive information.
      //https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.EnvironmentFile.html
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/health || exit 1'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
        retries: 5,
      }
    });

    nautobotAppContainer.addPortMappings({
      name: "nautobot",
      containerPort: 8080,
      hostPort: 8080,
      protocol: Protocol.TCP,
    });

    const nginxContainer = nautobotAppTaskDefinition.addContainer('nginx', {
      image: ContainerImage.fromDockerImageAsset(nginxStack.image),
      logging: LogDrivers.awsLogs({ streamPrefix: 'Nginx' }),
    });

    nginxContainer.addPortMappings({
      name: "nginx",
      containerPort: 80,
      hostPort: 80,
      protocol: Protocol.TCP,
    });


    const albSecurityGroup = new SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      allowAllOutbound: true, // Change this as per your requirements
    });

    albSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');

    const nautobotSecurityGroup = new SecurityGroup(this, 'NautobotSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    nautobotSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    nautobotSecurityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    nautobotSecurityGroup.addIngressRule(albSecurityGroup, Port.tcp(8080), 'Allow inbound from ALB');

    const nautobotAppService = new FargateService(this, 'NautobotAppService', {
      cluster,
      enableExecuteCommand: true,
      taskDefinition: nautobotAppTaskDefinition,
      assignPublicIp: false,
      desiredCount: 1,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [nautobotSecurityGroup],
      serviceConnectConfiguration: {
        services: [
          {
            portMappingName: 'nginx',
            dnsName: 'nginx',
            port: 80,
          },
          {
            portMappingName: 'nautobot',
            dnsName: 'nautobot',
            port: 8080,
          },
        ],
      },
    });

    // Add necessary load balancer configuration
    const listener = alb.addListener('Listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      // certificates: [] // Provide your SSL Certificates here if above is HTTP(S)
    });

    listener.addTargets('NautobotAppService', {
      port: 8080,
      targets: [nautobotAppService],
      healthCheck: {
        path: '/health',
        port: "8080",
        interval: Duration.seconds(60),
        healthyHttpCodes: '200,301',
      },
    });
  }
}