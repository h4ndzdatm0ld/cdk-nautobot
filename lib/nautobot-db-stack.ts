import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { NautobotVpcStack } from './nautobot-vpc-stack';
import { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export class NautobotDbStack extends Stack {
  public readonly postgresInstance: rds.DatabaseInstance;
  public readonly redisCluster: elasticache.CfnCacheCluster;
  constructor(scope: Construct, id: string, vpcStack: NautobotVpcStack, props?: StackProps) {
    super(scope, id, props);

    const vpc = vpcStack.vpc;
    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)
    const nautobotUserSecret = new Secret(this, "NautobotDbPassword", {
      secretName: "NautobotDbPassword",
      description: "Nautobot DB password",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 30,
        generateStringKey: "password",
        secretStringTemplate: JSON.stringify({ username: "nautobot" }),
      }
    });

    const dbSecurityGroup = new SecurityGroup(this, 'NautobotDbSecurityGroup', {
      vpc: vpc,
      securityGroupName: 'NautobotDbSecurityGroup',
      allowAllOutbound: false,
    });

    dbSecurityGroup.addIngressRule(Peer.ipv4(vpc.vpcCidrBlock), Port.tcp(5432)
    )

    // Create an Amazon RDS PostgreSQL database instance
    this.postgresInstance = new rds.DatabaseInstance(this, 'NautobotPostgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13_7,
      }),
      instanceType: instanceType,
      credentials: rds.Credentials.fromSecret(nautobotUserSecret),
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      multiAz: true,
      allocatedStorage: 25,
      storageType: rds.StorageType.GP2,
      deletionProtection: false,
      databaseName: 'nautobot',
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY,
      securityGroups: [dbSecurityGroup],
    });

    // Create an Amazon ElastiCache Redis cluster
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'NautobotCacheSubnetGroup', {
      description: 'Subnet group for Nautobot Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });
    // Create a security group for Redis
    const redisSecurityGroup = new SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    // Allow inbound traffic on default Redis port (6379) from all sources in the VPC
    redisSecurityGroup.addIngressRule(Peer.ipv4(vpc.vpcCidrBlock), Port.tcp(6379));

    // Add the security group to the Redis cache cluster
    this.redisCluster = new elasticache.CfnCacheCluster(this, 'NautobotRedis', {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: cacheSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
    });
  }
}
