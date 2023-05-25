# Start with the official Nautobot image as a base
FROM networktocode/nautobot:1.5-py3.9

USER nautobot

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
