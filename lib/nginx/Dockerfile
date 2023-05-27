# Dockerfile for Nginx
FROM nginx:stable

RUN apt-get update && apt-get install -y netcat

COPY ./nginx.conf /etc/nginx/nginx.conf

COPY wait.sh /usr/local/bin/wait.sh

RUN chmod +x /usr/local/bin/wait.sh

EXPOSE 80

CMD ["wait.sh", "nautobot", "8080", "--", "nginx", "-g", "daemon off;"]
