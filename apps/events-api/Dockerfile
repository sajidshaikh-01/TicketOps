# syntax=docker/dockerfile:1
#
# events-api - multi-stage build
#
# Build context MUST be the monorepo root (not apps/events-api), since this
# service depends on the shared packages/prisma workspace package:
#   docker build -f apps/events-api/Dockerfile -t ticketops/events-api .
#
# Four stages:
#   deps       - install full workspace deps (incl. devDependencies), needed to compile
#   build      - generate the Prisma client + compile TypeScript -> dist/
#   prod-deps  - a clean, production-only install (no devDependencies)
#   runtime    - the slim image that actually ships: prod deps + compiled JS only

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# Stage: deps
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/prisma/prisma packages/prisma/prisma
COPY apps/events-api/package.json apps/events-api/package.json
COPY apps/admin-api/package.json apps/admin-api/package.json
COPY apps/bookings-worker/package.json apps/bookings-worker/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json

RUN npm ci --include-workspace-root

# ---------------------------------------------------------------------------
# Stage: build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/package.json ./package.json
COPY packages/prisma packages/prisma
COPY apps/events-api apps/events-api

# openssl must be installed first: node:alpine has no `openssl` CLI, so Prisma
# can't detect the real OpenSSL version and silently defaults to the wrong
# one (openssl-1.1.x), producing an engine binary that fails to load at
# runtime with "Error loading shared library libssl.so.1.1".
RUN apk add --no-cache openssl
RUN npm run generate --workspace=@ticketops/prisma
RUN npm run build --workspace=@ticketops/events-api

# ---------------------------------------------------------------------------
# Stage: prod-deps
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/prisma/prisma packages/prisma/prisma
COPY apps/events-api/package.json apps/events-api/package.json
COPY apps/admin-api/package.json apps/admin-api/package.json
COPY apps/bookings-worker/package.json apps/bookings-worker/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json

RUN npm ci --omit=dev --include-workspace-root

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
COPY --from=build /workspace/apps/events-api/dist ./apps/events-api/dist
COPY apps/events-api/package.json ./apps/events-api/package.json

USER ticketops

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/events-api/dist/main.js"]