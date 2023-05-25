# Nautobot DockerFile

This Dockerfile starts with the official Nautobot image, sets a working directory to /opt/nautobot/, copies over a local nautobot_config.py file and requirements.txt into the correct directories, then installs any additional requirements from the requirements.txt file.

Finally, it makes sure nautobot_config.py is executable and starts the Nautobot server. This Dockerfile assumes that you have nautobot_config.py and requirements.txt files in the same directory as the Dockerfile.

Please adjust the paths according to your project setup and modify the commands to suit your requirements.
