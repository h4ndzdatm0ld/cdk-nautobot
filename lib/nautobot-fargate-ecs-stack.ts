import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  LogDrivers,
  FargateService,
  Protocol,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { NautobotDockerImageStack } from "./nautobot-docker-image-stack";
import { NginxDockerImageStack } from "./nginx-docker-image-stack";
import { NautobotSecretsStack } from "./nautobot-secrets-stack";
import { NautobotVpcStack } from "./nautobot-vpc-stack";
import { NautobotDbStack } from "./nautobot-db-stack";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { DnsRecordType } from "@aws-cdk/aws-servicediscovery";

export class NautobotFargateEcsStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    stage: string,
    dockerStack: NautobotDockerImageStack,
    nginxStack: NginxDockerImageStack,
    secretsStack: NautobotSecretsStack,
    vpcStack: NautobotVpcStack,
    dbStack: NautobotDbStack,
    props?: StackProps
  ) {
    super(scope, id, props);

    // variables from other stacks
    const vpc = vpcStack.vpc;
    const alb = vpcStack.alb;
    const nautobotSecurityGroup = vpcStack.nautobotSecurityGroup;
    const namespace: string = `${stage}.nautobot-service.local`;

    const cluster = new Cluster(this, `${stage}NautobotCluster`, {
      containerInsights: true,
      vpc,
      clusterName: `${stage}NautobotCluster`,
    });

    cluster.addDefaultCloudMapNamespace({
      name: namespace,
    });

    // Define a new IAM role for Fargate Task Definitions
    const ecsTaskRole = new Role(this, `${stage}ECSTaskRole`, {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: `${stage}ECSTaskRole`,
    });

    // Attach the necessary managed policies
    ecsTaskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));
    ecsTaskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"));

    // Define a new IAM role for your Fargate Service Execution
    const ecsExecutionRole = new Role(this, `${stage}ECSExecutionRole`, {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: `${stage}ECSExecutionRole`,
    });

    // Attach the necessary managed policies to your role
    ecsExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));
    ecsExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"));

    // Nautobot Worker
    const nautobotWorkerTaskDefinition = new FargateTaskDefinition(this, `${stage}NautobotWorkerTaskDefinition`, {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: ecsTaskRole,
      executionRole: ecsExecutionRole,
    });
    // Initialize the environment variable object
    let environment: { [key: string]: string } = {
      // Make sure to pass the database and Redis information to the Nautobot app.
      NAUTOBOT_DB_HOST: dbStack.postgresInstance.dbInstanceEndpointAddress,
      NAUTOBOT_REDIS_HOST: dbStack.redisCluster.attrRedisEndpointAddress,
      NAUTOBOT_ALLOWED_HOSTS: "*",
      NAUTOBOT_BANNER_TOP: "Local Production",
      NAUTOBOT_LOG_LEVEL: "INFO",
      NAUTOBOT_METRICS_ENABLED: "true",
      NAUTOBOT_REDIS_PORT: "6379",
      NAUTOBOT_NAPALM_TIMEOUT: "5"
    };

    // update secrets w/ DB PW
    secretsStack.secrets["NAUTOBOT_DB_PASSWORD"] = ecs.Secret.fromSecretsManager(
      dbStack.nautobotDbPassword,
      "password"
    );

    const nautobotWorkerContainer = nautobotWorkerTaskDefinition.addContainer("nautobot-worker", {
      image: ContainerImage.fromDockerImageAsset(dockerStack.image),
      logging: LogDrivers.awsLogs({ streamPrefix: "NautobotWorker" }),
      environment: environment,
      secrets: secretsStack.secrets,
      command: ["nautobot-server", "celery", "worker"],
      healthCheck: {
        command: ["CMD", "bash", "-c", "nautobot-server celery inspect ping --destination celery@$HOSTNAME"],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
        retries: 5,
      },
    });

    const workerService = new FargateService(this, `${stage}NautobotWorkerService`, {
      cluster,
      serviceName: "NautobotWorkerService",
      enableExecuteCommand: true,
      taskDefinition: nautobotWorkerTaskDefinition,
      assignPublicIp: false,
      desiredCount: 2,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      cloudMapOptions: {
        name: "nautobot-worker",
        cloudMapNamespace: cluster.defaultCloudMapNamespace,
        dnsRecordType: DnsRecordType.A,
      },
    });

    // Nautobot Scheduler Task Definition and Service
    const nautobotSchedulerTaskDefinition = new FargateTaskDefinition(this, `${stage}NautobotSchedulerTaskDefinition`, {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: ecsTaskRole,
      executionRole: ecsExecutionRole,
    });

    const nautobotSchedulerContainer = nautobotSchedulerTaskDefinition.addContainer("nautobot-scheduler", {
      image: ContainerImage.fromDockerImageAsset(dockerStack.image),
      logging: LogDrivers.awsLogs({ streamPrefix: "NautobotScheduler" }),
      environment: environment,
      secrets: secretsStack.secrets,
      command: ["nautobot-server", "celery", "beat"],
    });

    const schedulerService = new FargateService(this, `${stage}NautobotSchedulerService`, {
      cluster,
      serviceName: "NautobotSchedulerService",
      enableExecuteCommand: true,
      taskDefinition: nautobotSchedulerTaskDefinition,
      assignPublicIp: false,
      desiredCount: 1, // Generally, there should be only one scheduler instance running
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      cloudMapOptions: {
        name: "nautobot-scheduler",
        cloudMapNamespace: cluster.defaultCloudMapNamespace,
        dnsRecordType: DnsRecordType.A,
      },
    });

    // Nautobot App Task Definition and Service
    const nautobotAppTaskDefinition = new FargateTaskDefinition(this, `${stage}NautobotAppTaskDefinition`, {
      memoryLimitMiB: 4096,
      cpu: 2048,
      taskRole: ecsTaskRole,
      executionRole: ecsExecutionRole,
    });

    const nautobotAppContainer = nautobotAppTaskDefinition.addContainer("nautobot", {
      image: ContainerImage.fromDockerImageAsset(dockerStack.image),
      // If you want to use the official image, uncomment the line below and comment the line above.
      // image: ecs.ContainerImage.fromRegistry('networktocode/nautobot:1.5-py3.9'),
      logging: LogDrivers.awsLogs({ streamPrefix: `${stage}NautobotApp` }),
      environment: environment, // Pass the environment variables to the container
      secrets: secretsStack.secrets,
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
        retries: 5,
      },
    });

    nautobotAppContainer.addPortMappings({
      name: "nautobot",
      containerPort: 8080,
      hostPort: 8080,
      protocol: Protocol.TCP,
      appProtocol: ecs.AppProtocol.http,
    });

    const nginxContainer = nautobotAppTaskDefinition.addContainer("nginx", {
      image: ContainerImage.fromDockerImageAsset(nginxStack.image),
      logging: LogDrivers.awsLogs({
        streamPrefix: `${stage}Nginx`
      }),
      healthCheck: {
        command: ["CMD-SHELL", "nginx -t || exit 1"],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        startPeriod: Duration.seconds(0),
        retries: 3,
      },
    });

    nginxContainer.addPortMappings({
      name: "nginx",
      containerPort: 80,
      hostPort: 80,
      protocol: Protocol.TCP,
      appProtocol: ecs.AppProtocol.http,
    });

    const nautobotAppService = new FargateService(this, `${stage}NautobotAppService`, {
      circuitBreaker: { rollback: true },
      cluster,
      serviceName: `${stage}NautobotAppService`,
      enableExecuteCommand: true,
      taskDefinition: nautobotAppTaskDefinition,
      assignPublicIp: false,
      desiredCount: 1,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [nautobotSecurityGroup],
      cloudMapOptions: {
        name: "nautobot-app",
        cloudMapNamespace: cluster.defaultCloudMapNamespace,
        dnsRecordType: DnsRecordType.A,
      },
      serviceConnectConfiguration: {
        services: [
          {
            portMappingName: "nginx",
            dnsName: "nginx",
            port: 80,
          },
          {
            portMappingName: "nautobot",
            dnsName: "nautobot",
            port: 8080,
          },
        ],
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'sc-traffic',
        }),
      },
    });

    // Add necessary load balancer configuration
    const listener = alb.addListener(`${stage}Listener`, {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      // certificates: [] // Provide your SSL Certificates here if above is HTTP(S)
    });

    listener.addTargets(`${stage}NautobotAppService`, {
      port: 80,
      targets: [nautobotAppService.loadBalancerTarget({ containerName: "nginx", containerPort: 80 })],
      healthCheck: {
        path: "/health/",
        port: "80",
        interval: Duration.seconds(60),
        healthyHttpCodes: "200",
      },
    });
  }
}
