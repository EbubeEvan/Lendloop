#!/usr/bin/env bash
# Import the three LendLoop workflows into the running n8n container.
#
# n8n creates new workflow records on each import. Run this once on a fresh
# instance, or delete the old workflows first if you are re-importing.
set -euo pipefail

cd "$(dirname "$0")"

if ! docker compose ps --status running n8n | grep -q n8n; then
  echo "n8n is not running. Start it first with: pnpm n8n:up"
  exit 1
fi

echo "Importing workflows from n8n/workflows…"
docker compose exec -T n8n n8n import:workflow --separate --input=/workflows

echo
echo "Imported. Open http://localhost:5678 and:"
echo "  1. Activate 'LendLoop — Overdue reminders' (schedule trigger)."
echo "  2. Activate 'LendLoop — Request notifications' (webhook trigger)."
echo "  3. Activate 'LendLoop — Error handler'."
echo "  4. In each workflow's Settings, choose 'LendLoop — Error handler' as the Error Workflow."
echo
echo "Credentials are not baked into the workflow JSON. The local email nodes call"
echo "Mailpit's HTTP API directly, so no SMTP credential is required for the demo."
