import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export class NautobotDatabaseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });  // VPC with 2 AZs

    // Create an Amazon RDS PostgreSQL database instance
    const postgresInstance = new rds.DatabaseInstance(this, 'MyPostgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13_4,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('admin'), // admin username with a generated secret
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 25, // 25GB
      storageType: rds.StorageType.GP2,
      deletionProtection: false,
    });

    // Create an Amazon ElastiCache Redis cluster
    const redisCluster = new elasticache.CfnCacheCluster(this, 'MyRedis', {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: 'MyCacheSubnetGroup',
      vpcSecurityGroupIds: ['sg-xxxxxxxx'],
    });
  }
}
