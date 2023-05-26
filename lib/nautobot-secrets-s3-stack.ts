import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as fs from 'fs';
import * as path from 'path';

export class NautobotSecretsS3Stack extends Stack {
  public readonly bucket: s3.Bucket;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create KMS Key
    const key = new kms.Key(this, 'EnvFileKey', {
      alias: 'alias/envfilekey',
      description: 'KMS key to encrypt env file',
      enableKeyRotation: true,
    });

    // Create S3 bucket with server-side encryption using KMS key
    const bucket = new s3.Bucket(this, 'EnvBucket', {
      encryption: s3.BucketEncryption.KMS,
      bucketName: 'nautobot-env',
      encryptionKey: key,
      versioned: true,
    });

    // Check if .env file exists
    const objectKey = '.env';
    const envFilePath = path.join(__dirname, '..', 'lib/secrets/', objectKey);
    if (!fs.existsSync(envFilePath)) {
      throw new Error('.env file not found');
    }
    // Deploy .env file to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployEnvFile', {
      sources: [s3deploy.Source.asset(path.dirname(envFilePath), {
        exclude: ['*', '!.env'],
      })],
      destinationBucket: bucket,
    });
  };
}
