import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NautobotDockerImageStack } from '../lib/nautobot-docker-image-stack';
import { NginxDockerImageStack } from '../lib/nginx-docker-image-stack';
import { NautobotFargateEcsStack } from '../lib/nautobot-fargate-ecs-stack';
NautobotFargateEcsStack
const app = new cdk.App();
const dockerStack = new NautobotDockerImageStack(app, 'NautobotDockerStack');
new NginxDockerImageStack(app, 'NginxDockerImageStack');
//# TODO: add nginx stack into fargateecs
new NautobotFargateEcsStack(app, 'NautobotFargateEcsStack', dockerStack);
app.synth();
