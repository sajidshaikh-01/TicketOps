#!/bin/bash
# Runs one TicketOps image locally for a smoke test, pointed at the
# Postgres/Redis started by `npm run dev:db` (which still run as plain
# Docker Compose containers on your host, not inside this image).
#
# Usage:
#   ./docker/run-local.sh events-api
#   ./docker/run-local.sh admin-api
#   ./docker/run-local.sh bookings-worker
#   ./docker/run-local.sh dashboard
#
# Build the image first with ./docker/build-all.sh <your-dockerhub-username>
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <events-api|admin-api|bookings-worker|dashboard> [dockerhub-username] [tag]"
  exit 1
fi

SERVICE="$1"
DOCKERHUB_USER="${2:-local}"
TAG="${3:-latest}"
IMAGE="${DOCKERHUB_USER}/ticketops-${SERVICE}:${TAG}"

# host.docker.internal lets a container reach services running directly on
# the host (or in separate, unlinked containers via published ports) - this
# is what Postgres/Redis are running as via `npm run dev:db`. Works out of
# the box on Docker Desktop (Mac/Windows/WSL); on native Linux Docker it
# needs the --add-host flag below.
EXTRA_HOST_FLAG="--add-host=host.docker.internal:host-gateway"

case "$SERVICE" in
  events-api)
    docker run --rm -p 4000:4000 $EXTRA_HOST_FLAG \
      -e DATABASE_URL="postgresql://ticketops:ticketops@host.docker.internal:5432/ticketops?schema=public" \
      -e REDIS_HOST=host.docker.internal \
      -e REDIS_PORT=6379 \
      -e JWT_ACCESS_SECRET=dev-access-secret-change-me \
      -e CORS_ORIGIN=http://localhost:5173 \
      "$IMAGE"
    ;;
  admin-api)
    docker run --rm -p 4001:4001 $EXTRA_HOST_FLAG \
      -e DATABASE_URL="postgresql://ticketops:ticketops@host.docker.internal:5432/ticketops?schema=public" \
      -e JWT_ACCESS_SECRET=dev-access-secret-change-me \
      -e JWT_REFRESH_SECRET=dev-refresh-secret-change-me \
      -e CORS_ORIGIN=http://localhost:5173 \
      "$IMAGE"
    ;;
  bookings-worker)
    docker run --rm -p 4002:4002 $EXTRA_HOST_FLAG \
      -e DATABASE_URL="postgresql://ticketops:ticketops@host.docker.internal:5432/ticketops?schema=public" \
      -e REDIS_HOST=host.docker.internal \
      -e REDIS_PORT=6379 \
      "$IMAGE"
    ;;
  dashboard)
    # Unlike the three backend containers, these URLs are fetched by the
    # user's browser directly (they end up in window.__TICKETOPS_CONFIG__),
    # not by the Nginx container itself - so they should be whatever address
    # your browser can actually reach, typically localhost with the port you
    # published events-api/admin-api on.
    docker run --rm -p 8080:8080 \
      -e EVENTS_API_URL=http://localhost:4000/api \
      -e ADMIN_API_URL=http://localhost:4001/api \
      "$IMAGE"
    echo "Open http://localhost:8080"
    ;;
  *)
    echo "Unknown service: $SERVICE"
    exit 1
    ;;
esac
