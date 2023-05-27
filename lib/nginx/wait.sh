#!/bin/bash

# Host and port to wait for
host="$1"
shift
port="$1"
shift

# Timeout to wait for the service
timeout=15

while ! timeout $timeout bash -c "echo > /dev/tcp/$host/$port"; do
  echo "Waiting for $host:$port..."
  sleep 1
done

# Execute the command
exec "$@"
