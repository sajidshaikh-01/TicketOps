#!/bin/sh
# Generates /usr/share/nginx/html/config.js from real environment variables
# at container start, so one built image can point at different backend
# URLs in different environments (local Docker, staging, k8s) without a
# rebuild. See apps/dashboard/src/api/clients.ts for how the app reads this.
set -e

EVENTS_API_URL="${EVENTS_API_URL:-http://localhost:4000/api}"
ADMIN_API_URL="${ADMIN_API_URL:-http://localhost:4001/api}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__TICKETOPS_CONFIG__ = {
  EVENTS_API_URL: "${EVENTS_API_URL}",
  ADMIN_API_URL: "${ADMIN_API_URL}"
};
EOF

echo "Runtime config written:"
cat /usr/share/nginx/html/config.js

exec "$@"
