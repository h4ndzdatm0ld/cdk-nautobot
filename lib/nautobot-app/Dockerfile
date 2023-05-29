# VERSION FROM .ENV
ARG NAUTOBOT_VERSION

# Start with the official Nautobot image as a base
FROM networktocode/nautobot:${NAUTOBOT_VERSION}

# # Switch to the root user
# USER root

# # Update the system and install necessary packages
# RUN apt-get update && apt-get install -y \
#     curl \
#     unzip \
#     tar \
#     gzip \
#     python3 \
#     python3-pip

# # Download and install the SSM Agent
# RUN curl https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb -o amazon-ssm-agent.deb
# RUN dpkg -i amazon-ssm-agent.deb

# Create the necessary log directory and set permissions
# RUN mkdir -p /var/log/amazon/ssm/ && chown -R nautobot:nautobot /var/log/amazon/ssm/

# Switch back to the nautobot user
USER nautobot

ARG NAUTOBOT_ALLOWED_HOSTS
ENV NAUTOBOT_ALLOWED_HOSTS=${NAUTOBOT_ALLOWED_HOSTS}

ARG NAUTOBOT_BANNER_TOP
ENV NAUTOBOT_BANNER_TOP=${NAUTOBOT_BANNER_TOP}

ARG NAUTOBOT_LOG_LEVEL
ENV NAUTOBOT_LOG_LEVEL=${NAUTOBOT_LOG_LEVEL}

ARG NAUTOBOT_METRICS_ENABLED
ENV NAUTOBOT_METRICS_ENABLED=${NAUTOBOT_METRICS_ENABLED}

ARG NAUTOBOT_REDIS_PORT
ENV NAUTOBOT_REDIS_PORT=${NAUTOBOT_REDIS_PORT}

# Napalm settings
ARG NAUTOBOT_NAPALM_TIMEOUT
ENV NAUTOBOT_NAPALM_TIMEOUT=${NAUTOBOT_NAPALM_TIMEOUT}

# Directory where we'll install nautobot_config.py
WORKDIR /opt/nautobot/

# Copy our local nautobot_config.py file into the container
COPY ./nautobot_config.py /opt/nautobot/nautobot_config.py

# Copy our local requirements.txt into the container
COPY ./requirements.txt /opt/nautobot/requirements.txt

# Use pip to install any additional requirements.
RUN pip install --no-cache-dir -r /opt/nautobot/requirements.txt

# Run Nautobot
CMD ["nautobot-server", "runserver", "0.0.0.0:8080"]

# Make sure the agent starts when the container is started
# ENTRYPOINT ["amazon-ssm-agent", "start"]
