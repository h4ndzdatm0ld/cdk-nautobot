# Nautobot AWS CDK Deployment

This project contains the AWS CDK code to deploy Nautobot to AWS. The CDK code was largely developed by following the [Nautobot In AWS Fargate](https://blog.networktocode.com/post/nautobot-in-aws-fargate/) blog post by [Network to Code](https://www.networktocode.com/).

![Nautobot Architechture](./images/architecture-diagram.png)

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Structure

- `bin/app.ts`: This is the entry point for the application. Here you will import and instantiate all of your CDK Stacks.
- `lib/`: This directory contains all of your CDK Stack files. For instance:
- `nautobot-database-stack.ts`: Sets up the Amazon RDS for PostgreSQL and Amazon ElastiCache for Redis.
- `nautobot-ecs-stack.ts`: Sets up the ECS Fargate service for Nautobot.
- `nautobot-loadbalancer-stack.ts`: Sets up the load balancer and NGINX container.
- `nautobot-docker-image-stack.ts`: Builds a Docker image from a local Dockerfile for the main Nautobot container.
- `nautobot/`: This directory contains your Nautobot Dockerfile and any other necessary files to build the Docker image.
- `cdk.json`: Contains configuration values for the CDK CLI.
- `package.json`: Defines the dependencies for your project.