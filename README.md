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

# Project Structure

This project is structured to use AWS CDK to build and deploy a Nautobot application using ECS Fargate, with its data stored in RDS PostgreSQL and cached in ElastiCache Redis.

## File Descriptions

The following files and directories represent the core components of the application:

- `nautobot-app`: This directory contains the Dockerfile and other necessary files to build the Docker image for the main Nautobot application.
  - `Dockerfile`: Describes the Docker image for the Nautobot application.
  - `nautobot_config.py`: The configuration file for Nautobot.
  - `requirements.txt`: Lists the Python dependencies for the Nautobot application.
  - `README.md`: Describes the contents of the `nautobot-app` directory.
- `nautobot-db-stack.ts`: Defines the AWS CDK Stack to set up the Amazon RDS for PostgreSQL database and Amazon ElastiCache for Redis cache.
- `nautobot-docker-image-stack.ts`: Defines the AWS CDK Stack to build the Docker image from the local Dockerfile for the main Nautobot container.
- `nautobot-fargate-ecs-stack.ts`: Defines the AWS CDK Stack to set up the ECS Fargate service for the Nautobot application.
- `nautobot-secrets-stack.ts`: Defines the AWS CDK Stack to manage AWS Secrets Manager secrets for the Nautobot application.
- `nautobot-vpc-stack.ts`: Defines the AWS CDK Stack to set up the VPC for the Nautobot application.
- `nginx`: This directory contains the Dockerfile and configuration file for the NGINX server.
  - `Dockerfile`: Describes the Docker image for the NGINX server.
  - `nginx.conf`: The configuration file for the NGINX server.
- `nginx-docker-image-stack.ts`: Defines the AWS CDK Stack to build the Docker image from the local Dockerfile for the NGINX server.
- `secrets`: This directory contains an example environment file.
  - `env-example`: An example of the environment variables to be used in the application.

## How to Run

// TODO: Add instructions on how to run the project.
