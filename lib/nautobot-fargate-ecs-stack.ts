import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Vpc, SubnetType, SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition, LogDrivers, FargateService, Protocol, EnvironmentFile } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { NautobotDockerImageStack } from './nautobot-docker-image-stack';
import { NginxDockerImageStack } from './nginx-docker-image-stack';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { NautobotSecretsS3Stack } from './nautobot-secrets-s3-stack';



export class NautobotFargateEcsStack extends Stack {
  constructor(scope: Construct, id: string, dockerStack: NautobotDockerImageStack, nginxStack: NginxDockerImageStack, s3Stack: NautobotSecretsS3Stack, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'NautobotVPC', {
      maxAzs: 3,
    });

    // Create an Amazon RDS PostgreSQL database instance
    const nautobotPostgresInstance = new rds.DatabaseInstance(this, 'NautobotPostgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13_4,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('admin'), // admin username with a generated secret
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      multiAz: true,
      allocatedStorage: 25, // 25GB
      storageType: rds.StorageType.GP2,
      deletionProtection: false,
    });

    // Create an Amazon ElastiCache Redis cluster
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'MyCacheSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const nautobotRedisCluster = new elasticache.CfnCacheCluster(this, 'NautobotRedis', {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: cacheSubnetGroup.ref,
      // vpcSecurityGroupIds: [securityGroup.securityGroupId],
    });


    const cluster = new Cluster(this, 'NautobotCluster', {
      vpc,
    });

    const alb = new ApplicationLoadBalancer(this, 'NautobotALB', {
      vpc,
      internetFacing: true,
    });

    // NGINX Task Definition and Service
    const nginxTaskDefinition = new FargateTaskDefinition(this, 'NginxTaskDefinition', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const nginxContainer = nginxTaskDefinition.addContainer('nginx', {
      image: ContainerImage.fromEcrRepository(nginxStack.repository, nginxStack.imageName),
      logging: LogDrivers.awsLogs({ streamPrefix: 'Nginx' }),
    });

    nginxContainer.addPortMappings({
      containerPort: 80,
      protocol: Protocol.TCP,
    });

    const nginxService = new FargateService(this, 'NginxService', {
      cluster,
      taskDefinition: nginxTaskDefinition,
      assignPublicIp: false,
      desiredCount: 1,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Nautobot App Task Definition and Service
    const nautobotAppTaskDefinition = new FargateTaskDefinition(this, 'NautobotAppTaskDefinition', {
      memoryLimitMiB: 4096,
      cpu: 2048,
    });

    const nautobotAppContainer = nautobotAppTaskDefinition.addContainer('nautobot', {
      image: ContainerImage.fromEcrRepository(dockerStack.repository, dockerStack.imageName),
      logging: LogDrivers.awsLogs({ streamPrefix: 'NautobotApp' }),
      environment: {
        // Make sure to pass the database and Redis information to the Nautobot app.
        'DATABASE_URL': nautobotPostgresInstance.dbInstanceEndpointAddress,
        'REDIS_URL': nautobotRedisCluster.attrRedisEndpointAddress,
      },
      // Can replace/use AWS Secrets Manager to store sensitive information.
      //https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.EnvironmentFile.html
      environmentFiles: [
        EnvironmentFile.fromBucket(s3Stack.bucket, '.env'),
      ],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/health || exit 1'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
        retries: 5,
      }
    });

    nautobotAppContainer.addPortMappings({
      containerPort: 8080,
      protocol: Protocol.TCP,
    });

    const appService = new FargateService(this, 'AppService', {
      cluster,
      taskDefinition: nautobotAppTaskDefinition,
      assignPublicIp: false,
      desiredCount: 2,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Add necessary load balancer configuration
    const listener = alb.addListener('Listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      // certificates: [] // Provide your SSL Certificates here
    });

    listener.addTargets('NginxService', {
      port: 80,
      targets: [nginxService],
      healthCheck: {
        path: '/health',
        port: "80",
      },
    });

    const securityGroup = new SecurityGroup(this, 'NautobotSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    securityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');

  }
}
