import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NautobotDockerImageStack } from '../lib/nautobot-docker-image-stack';
import { NginxDockerImageStack } from '../lib/nginx-docker-image-stack';
import { NautobotFargateEcsStack } from '../lib/nautobot-fargate-ecs-stack';
import { NautobotSecretsS3Stack } from '../lib/nautobot-secrets-s3-stack';


const app = new cdk.App();
const nautobot_secrets_s3_stack = new NautobotSecretsS3Stack(app, 'NautobotSecretsS3Stack');
const docker_image_stack = new NautobotDockerImageStack(app, 'NautobotDockerImageStack');
const nginx_image_stack = new NginxDockerImageStack(app, 'NginxDockerImageStack');
const fargate_ecs_stack = new NautobotFargateEcsStack(app, 'NautobotFargateEcsStack', docker_image_stack, nginx_image_stack, nautobot_secrets_s3_stack);

app.synth();
