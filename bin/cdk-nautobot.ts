import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NautobotVpcStack } from '../lib/nautobot-vpc-stack';
import { NautobotDockerImageStack } from '../lib/nautobot-docker-image-stack';
import { NginxDockerImageStack } from '../lib/nginx-docker-image-stack';
import { NautobotFargateEcsStack } from '../lib/nautobot-fargate-ecs-stack';
import { NautobotSecretsS3Stack } from '../lib/nautobot-secrets-stack';
import { NautobotDbStack } from '../lib/nautobot-db-stack';

const app = new cdk.App();
const nautobotVpcStack = new NautobotVpcStack(app, 'NautobotVpcStack');
const nautobotDbStack = new NautobotDbStack(app, 'NautobotDbStack', nautobotVpcStack);
const nautobotSecretsS3Stack = new NautobotSecretsS3Stack(app, 'NautobotSecretsS3Stack');
const nautobotDockerImageStack = new NautobotDockerImageStack(app, 'NautobotDockerImageStack');
const nginxDockerImageStack = new NginxDockerImageStack(app, 'NginxDockerImageStack');

new NautobotFargateEcsStack(app,
  'NautobotFargateEcsStack',
  nautobotDockerImageStack,
  nginxDockerImageStack,
  nautobotSecretsS3Stack,
  nautobotVpcStack,
  nautobotDbStack
);
app.synth();
