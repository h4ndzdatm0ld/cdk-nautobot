#!/bin/bash

# Function to display help message
display_help() {
    echo "Usage: ssm.sh [cluster-name] [service-name]"
    echo
    echo "Connect to a container in a service running on AWS Fargate using SSM."
    echo
    echo "Arguments:"
    echo "  cluster-name   The name of the ECS cluster where the service is running."
    echo "  service-name   The name of the ECS service to connect to."
    echo
    echo "Example:"
    echo "  ssm.sh my-cluster my-service"
}

# Check if AWS CLI is installed
command -v aws >/dev/null 2>&1 || { echo >&2 "AWS CLI is not installed. Please install it and run this script again."; exit 1; }

# Check if AWS Session Manager Plugin is installed
aws ssm help >/dev/null 2>&1 || { echo >&2 "AWS Session Manager Plugin is not installed. Please install it and run this script again."; exit 1; }

# Check if correct number of arguments are passed
if [ $# -ne 2 ]
then
    display_help
    exit 1
fi

# Variables
cluster=$1
service=$2
region=${3:-us-west-2} # Default to us-west-2 if no region is provided

# Echo the input
echo "Cluster Name: $cluster"
echo "Service Name: $service"
echo "AWS Region: $region"

# Getting the task id
echo "Getting task id..."
task_id=$(aws ecs list-tasks --cluster $cluster --service-name $service --query 'taskArns[0]' --output text)
if [ "$task_id" == "None" ]
then
    echo "Error: Unable to retrieve task id."
    exit 1
fi
echo "Task ID: $task_id"

# Getting the container name
echo "Getting container name..."
container_name=$(aws ecs describe-task-definition --task-definition $service --query 'taskDefinition.containerDefinitions[0].name' --output text)
if [ "$container_name" == "None" ]
then
    echo "Error: Unable to retrieve container name."
    exit 1
fi
echo "Container Name: $container_name"

# Starting the session
echo "Starting the session..."
aws ecs execute-command  \
    --region $region \
    --cluster $cluster \
    --task $task_id \
    --container $container_name \
    --command "/bin/bash" \
    --interactive
