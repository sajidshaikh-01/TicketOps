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

# Copy only the manifests first so this layer is cache-friendly: as long as
# no package.json changes, `npm ci` is skipped entirely on rebuilds.
COPY package.json package-lock.json* ./
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/prisma/prisma packages/prisma/prisma
COPY apps/events-api/package.json apps/events-api/package.json

# npm workspaces needs every workspace's package.json present to resolve the
# install correctly, even though we only build events-api here. This is the
# cost of a monorepo build context; .dockerignore keeps the rest light.
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

# Generate the Prisma client against the shared schema before compiling, so
# `@ticketops/prisma`'s types are available to events-api's TypeScript build.
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

# --omit=dev gives a much smaller node_modules than the `deps` stage, since
# it skips typescript, @nestjs/cli, eslint, jest, prisma (CLI), etc. - none
# of which the running service needs, only @prisma/client which is a real dependency.
RUN npm ci --omit=dev --include-workspace-root

# ---------------------------------------------------------------------------
# Stage: runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

# Run as a non-root user - standard hardening, and a prerequisite for most
# Kubernetes PodSecurity policies later in the roadmap.
RUN addgroup -S ticketops && adduser -S ticketops -G ticketops

COPY --from=prod-deps /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages/prisma/generated ./packages/prisma/generated
COPY --from=build /workspace/apps/events-api/dist ./apps/events-api/dist
COPY apps/events-api/package.json ./apps/events-api/package.json

USER ticketops

EXPOSE 4000

# Calls /health directly rather than depending on curl/wget being present in
# the alpine base image - Node itself is guaranteed to be there.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/events-api/dist/main.js"]
