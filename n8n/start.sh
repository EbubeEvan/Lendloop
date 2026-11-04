#!/usr/bin/env bash
# Start the local LendLoop automation stack (Postgres + n8n + Mailpit).
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created n8n/.env from the example."
  echo "Update the HMAC secrets so they match your Convex deployment before starting."
fi

docker compose up -d

echo
echo "n8n:     http://localhost:5678"
echo "Mailpit: http://localhost:8025"
echo "Logs:    pnpm n8n:logs"
