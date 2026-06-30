#!/bin/bash
# Builds all 4 TicketOps images, tagged for Docker Hub.
#
# Usage:
#   ./docker/build-all.sh <dockerhub-username> [tag]
#
# Example:
#   ./docker/build-all.sh sajid123 v0.1.0
#   ./docker/build-all.sh sajid123          # defaults tag to "latest"
#
# Run from the monorepo root (build context for every image is the root,
# since all backend services depend on the shared packages/prisma package).
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
  echo "==> Building ${image}"
  docker build -f "apps/${service}/Dockerfile" -t "${image}" .
done

echo ""
echo "All images built:"
for service in "${SERVICES[@]}"; do
  echo "  ${DOCKERHUB_USER}/ticketops-${service}:${TAG}"
done
echo ""
echo "Next: ./docker/push-all.sh ${DOCKERHUB_USER} ${TAG}"
