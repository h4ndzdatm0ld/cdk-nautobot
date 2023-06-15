import { Stack, StackProps } from 'aws-cdk-lib';
import { DockerImageAsset, } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

export class NautobotDockerImageStack extends Stack {
  // Declare class properties for the ECR repository and Docker image name
  public readonly repository: IRepository;
  public readonly imageName: string;
  public readonly image: DockerImageAsset;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Path to .env file
    const objectKey = '.env';
    const envFilePath = path.join(__dirname, '..', 'lib/nautobot-app/', objectKey);

    // Ensure .env file exists
    if (fs.existsSync(envFilePath)) {
      // Load and parse .env file
      const envConfig = dotenv.parse(fs.readFileSync(envFilePath));

      // Prepare buildArgs object
      const buildArgs: { [key: string]: string } = {};
      for (const key in envConfig) {
        buildArgs[key] = envConfig[key];
      }

      // Docker image for Nautobot
      const nautobotImage = new DockerImageAsset(this, 'NautobotImage', {
        directory: './lib/nautobot-app',  // the directory containing the Dockerfile
        buildArgs: buildArgs,
      });

      // Assign the ECR repository and Docker image name to the class properties
      this.repository = nautobotImage.repository;
      this.imageName = nautobotImage.imageUri;
      this.image = nautobotImage
    }
  }
}