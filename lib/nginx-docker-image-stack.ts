import { Stack, StackProps } from 'aws-cdk-lib';
import { DockerImageAsset, } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import { IRepository } from 'aws-cdk-lib/aws-ecr';

export class NginxDockerImageStack extends Stack {
  // Declare class properties for the ECR repository and Docker image name
  public readonly repository: IRepository;
  public readonly imageName: string;
  public readonly image: DockerImageAsset;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Docker image for Nautobot
    const nginxImage = new DockerImageAsset(this, 'NginxImage', {
      directory: './lib/nginx',  // the directory containing the Dockerfile
    });

    // Assign the ECR repository and Docker image name to the class properties
    this.repository = nginxImage.repository;
    this.imageName = nginxImage.imageUri;
    this.image = nginxImage
  }
}
