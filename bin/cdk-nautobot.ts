import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NautobotDockerImageStack } from '../lib/nautobot-docker-image-stack';
import { NginxDockerImageStack } from '../lib/nginx-docker-image-stack';
import { NautobotFargateEcsStack } from '../lib/nautobot-fargate-ecs-stack';

const app = new cdk.App();
const docker_image_stack = new NautobotDockerImageStack(app, 'NautobotDockerImageStack');
const nginx_image_stack = new NginxDockerImageStack(app, 'NginxDockerImageStack');
const fargate_ecs_stack = new NautobotFargateEcsStack(app, 'NautobotFargateEcsStack', docker_image_stack, nginx_image_stack);

app.synth();
