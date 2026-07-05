# syntax=docker/dockerfile:1
#
# admin-api - multi-stage build
#
# Build context MUST be the monorepo root:
#   docker build -f apps/admin-api/Dockerfile -t ticketops/admin-api .

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# Stage: deps
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/prisma/prisma packages/prisma/prisma
COPY apps/admin-api/package.json apps/admin-api/package.json
COPY apps/events-api/package.json apps/events-api/package.json
COPY apps/bookings-worker/package.json apps/bookings-worker/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json

RUN npm ci --ignore-scripts --include-workspace-root

# ---------------------------------------------------------------------------
# Stage: build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/package.json ./package.json
COPY packages/prisma packages/prisma
COPY apps/admin-api apps/admin-api

# openssl must be installed first: node:alpine has no `openssl` CLI, so Prisma
# can't detect the real OpenSSL version and silently defaults to the wrong
# one (openssl-1.1.x), producing an engine binary that fails to load at
# runtime with "Error loading shared library libssl.so.1.1".
RUN apk add --no-cache openssl
RUN npm run generate --workspace=@ticketops/prisma
RUN npm run build --workspace=@ticketops/admin-api

# ---------------------------------------------------------------------------
# Stage: prod-deps
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY packages/prisma/package.json packages/prisma/package.json
COPY apps/admin-api/package.json apps/admin-api/package.json
COPY apps/events-api/package.json apps/events-api/package.json
COPY apps/bookings-worker/package.json apps/bookings-worker/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json

RUN npm ci --omit=dev --ignore-scripts --include-workspace-root

# ---------------------------------------------------------------------------
# Stage: runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

RUN apk add --no-cache openssl && addgroup -S ticketops && adduser -S ticketops -G ticketops

COPY --from=prod-deps /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages/prisma/package.json ./packages/prisma/package.json
COPY --from=build /workspace/packages/prisma/generated ./packages/prisma/generated
COPY --from=build /workspace/apps/admin-api/dist ./apps/admin-api/dist
COPY apps/admin-api/package.json ./apps/admin-api/package.json

USER ticketops

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/admin-api/dist/main.js"]