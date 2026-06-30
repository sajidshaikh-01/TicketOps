#!/bin/bash
# Pushes all 4 previously-built TicketOps images to Docker Hub.
#
# Usage:
#   ./docker/push-all.sh <dockerhub-username> [tag]
#
# Run `docker login` first if you haven't already this session.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <dockerhub-username> [tag]"
  exit 1
fi

DOCKERHUB_USER="$1"
TAG="${2:-latest}"

SERVICES=(events-api admin-api bookings-worker dashboard)

for service in "${SERVICES[@]}"; do
  image="${DOCKERHUB_USER}/ticketops-${service}:${TAG}"
  echo ""
  echo "==> Pushing ${image}"
  docker push "${image}"
done

echo ""
echo "All images pushed to Docker Hub under ${DOCKERHUB_USER}/ticketops-*:${TAG}"
