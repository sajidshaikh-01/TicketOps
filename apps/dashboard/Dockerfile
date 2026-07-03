# syntax=docker/dockerfile:1
#
# dashboard - multi-stage build (Vite SPA -> static Nginx serve)
#
# Build context MUST be the monorepo root:
#   docker build -f apps/dashboard/Dockerfile -t ticketops/dashboard .
#
# Unlike the three NestJS services, this image ships no Node runtime at all
# in the final stage - just static files behind Nginx. Backend URLs are
# resolved at container *start* (not build time) via docker-entrypoint.sh,
# since Vite's VITE_* env vars would otherwise be permanently baked into the
# JS bundle at build time. See docker/docker-entrypoint.sh and
# src/api/clients.ts for the full mechanism.

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# Stage: deps
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/prisma/prisma packages/prisma/prisma
COPY packages/prisma/prisma packages/prisma/prisma
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/events-api/package.json apps/events-api/package.json
COPY apps/admin-api/package.json apps/admin-api/package.json
COPY apps/bookings-worker/package.json apps/bookings-worker/package.json

RUN npm ci --include-workspace-root

# ---------------------------------------------------------------------------
# Stage: build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/package.json ./package.json
COPY apps/dashboard apps/dashboard

# No backend-specific env vars needed here: the build produces a bundle that
# reads window.__TICKETOPS_CONFIG__ at runtime instead (with these as a
# local-dev-only fallback - see src/api/clients.ts).
RUN npm run build --workspace=@ticketops/dashboard

# ---------------------------------------------------------------------------
# Stage: runtime
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY apps/dashboard/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/dashboard/docker/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=build /workspace/apps/dashboard/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.sh \
  # Nginx needs write access to these paths even when running as the
  # unprivileged `nginx` user (already created by the base image).
  && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
  && touch /var/run/nginx.pid \
  && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
