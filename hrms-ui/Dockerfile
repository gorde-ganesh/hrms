# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY hrms-backend/package.json hrms-backend/
COPY hrms-ui/package.json hrms-ui/
RUN npm ci -w hrms-ui --include-workspace-root=false

COPY hrms-ui hrms-ui
RUN npm run build -w hrms-ui

# Serve stage
FROM nginx:alpine AS runtime

COPY --from=builder /app/hrms-ui/dist/hrms-ui/browser /usr/share/nginx/html

# Nginx config for Angular SPA routing
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  gzip on;\n  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
