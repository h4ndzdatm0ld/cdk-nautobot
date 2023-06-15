import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { NautobotVpcStack } from '../lib/nautobot-vpc-stack';
import { NautobotDockerImageStack } from '../lib/nautobot-docker-image-stack';
import { NginxDockerImageStack } from '../lib/nginx-docker-image-stack';
import { NautobotFargateEcsStack } from '../lib/nautobot-fargate-ecs-stack';
import { NautobotSecretsStack } from '../lib/nautobot-secrets-stack';
import { NautobotDbStack } from '../lib/nautobot-db-stack';

interface Environment {
  account: string | undefined;
  region: string;
}

interface Environments {
  [key: string]: Environment;
}

// Function to get Account ID
const getAccountId = async () => {
  const sts = new STSClient({ region: 'us-west-2' });
  const callerIdentityCommand = new GetCallerIdentityCommand({});
  const callerIdentity = await sts.send(callerIdentityCommand);
  return callerIdentity.Account;
}

// Environments configuration
// This makes it simple to deploy to multiple environments such as dev, qa, prod
// In a production system, this map would have different account IDs and most likley implemented
// in a different manner with a map of account IDs to regions in a constants / config file.
const getEnvironments = async (): Promise<Environments> => {
  const accountId = await getAccountId();
  return {
    dev: { account: accountId, region: 'us-west-2' },
    prod: { account: accountId, region: 'us-east-1' },
  };
};


(async () => {

  const app = new cdk.App();

  // Get the 'stage' from the context
  const stage = app.node.tryGetContext('stage');

  // Get the environments
  const environments = await getEnvironments();

  // If a stage is provided, limit the environments to that stage
  const stages: Environments = stage ? { [stage]: environments[stage] } : environments;

  // Iterate over each environment
  for (const [stage, env] of Object.entries(stages)) {
    const nautobotVpcStack = new NautobotVpcStack(app, `${stage}NautobotVpcStack`, stage, { env: env });
    const nautobotDbStack = new NautobotDbStack(app, `${stage}NautobotDbStack`, nautobotVpcStack, { env: env });
    const nautobotSecretsStack = new NautobotSecretsStack(app, `${stage}NautobotSecretsStack`, { env: env });
    const nautobotDockerImageStack = new NautobotDockerImageStack(app, `${stage}NautobotDockerImageStack`, { env: env });
    const nginxDockerImageStack = new NginxDockerImageStack(app, `${stage}NginxDockerImageStack`, { env: env });

    new NautobotFargateEcsStack(app,
      `${stage}NautobotFargateEcsStack`,
      stage,
      nautobotDockerImageStack,
      nginxDockerImageStack,
      nautobotSecretsStack,
      nautobotVpcStack,
      nautobotDbStack,
      { env: env },
    );
  }

  app.synth();
})();
