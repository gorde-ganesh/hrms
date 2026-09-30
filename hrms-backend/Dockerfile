# NOTE: This backend requires SSL certificates in cert/ to run HTTPS.
# The cert/ directory is git-ignored and must be provided at runtime.
# Two options:
#   1. Mount a cert volume: -v /path/to/certs:/app/hrms-backend/cert:ro  (used in docker-compose.yml)
#   2. Terminate TLS at a reverse proxy (nginx/Traefik) and run the app over plain HTTP
#      by setting NODE_ENV=production and pointing your proxy to port 8080.
#
# Build context is the monorepo root (npm workspaces share one lockfile):
#   docker build -f hrms-backend/Dockerfile .

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (only the backend workspace)
COPY package.json package-lock.json ./
COPY hrms-backend/package.json hrms-backend/
COPY hrms-ui/package.json hrms-ui/
RUN npm ci -w hrms-backend --include-workspace-root=false

# Copy source
COPY hrms-backend hrms-backend

# Generate Prisma client
RUN cd hrms-backend && npx prisma generate

# Build TypeScript
RUN cd hrms-backend && npx tsc --skipLibCheck || true

FROM node:20-alpine AS runtime
WORKDIR /app/hrms-backend

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/hrms-backend/generated ./generated
COPY --from=base /app/hrms-backend/src ./src
COPY --from=base /app/hrms-backend/main.ts ./main.ts
COPY --from=base /app/hrms-backend/prisma ./prisma
COPY --from=base /app/hrms-backend/package.json ./package.json
COPY --from=base /app/hrms-backend/tsconfig.json ./tsconfig.json

RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["npx", "tsx", "main.ts"]
