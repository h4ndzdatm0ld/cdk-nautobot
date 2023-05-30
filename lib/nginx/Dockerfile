# Dockerfile for Nginx
FROM public.ecr.aws/docker/library/nginx:latest

COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
