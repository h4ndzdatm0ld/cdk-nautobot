# VERSION FROM .ENV
ARG NAUTOBOT_VERSION

# Start with the official Nautobot image as a base
FROM networktocode/nautobot:${NAUTOBOT_VERSION}

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

RUN pip install --upgrade pip wheel

# Copy our local nautobot_config.py file into the container
COPY ./nautobot_config.py /opt/nautobot/nautobot_config.py

# Copy our local requirements.txt into the container
COPY ./requirements.txt /opt/nautobot/requirements.txt

# Use pip to install any additional requirements.
RUN pip install --no-cache-dir --no-warn-script-location -r /opt/nautobot/requirements.txt

EXPOSE 8080

# Run Nautobot
CMD ["nautobot-server", "runserver", "0.0.0.0:8080"]
