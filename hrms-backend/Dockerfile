# NOTE: This backend requires SSL certificates in cert/ to run HTTPS.
# The cert/ directory is git-ignored and must be provided at runtime.
# Two options:
#   1. Mount a cert volume: -v /path/to/certs:/app/cert:ro  (used in docker-compose.yml)
#   2. Terminate TLS at a reverse proxy (nginx/Traefik) and run the app over plain HTTP
#      by setting NODE_ENV=production and pointing your proxy to port 8080.

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npx tsc --skipLibCheck || true

FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/generated ./generated
COPY --from=base /app/src ./src
COPY --from=base /app/main.ts ./main.ts
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/tsconfig.json ./tsconfig.json

RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["npx", "tsx", "main.ts"]
