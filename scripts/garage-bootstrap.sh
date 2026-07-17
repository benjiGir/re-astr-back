#!/usr/bin/env bash
# One-time provisioning for the Garage container: cluster layout, access key,
# and the test-archives bucket. Run once after `docker compose up -d garage`
# (dev) or on first deploy (prod) — safe to re-run, later steps are guarded.
#
# The dxflrs/garage image is built FROM scratch (binary only, no shell), so
# this logic runs on the host via `docker compose exec` instead of inside the
# container.
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.dev.yml}"
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${STORAGE_ACCESS_KEY_ID:?Set STORAGE_ACCESS_KEY_ID (.env or env) before running}"
: "${STORAGE_SECRET_ACCESS_KEY:?Set STORAGE_SECRET_ACCESS_KEY (.env or env) before running}"

garage() {
  docker compose -f "$COMPOSE_FILE" exec -T garage /garage "$@"
}

# `layout assign`/`layout show` key nodes by the short 16-hex-char ID (as
# printed by `garage status`), not the full public key `node id -q` returns.
NODE_ID_SHORT="$(garage node id -q | cut -c1-16)"

if ! garage layout show | grep -q "$NODE_ID_SHORT"; then
  echo "Assigning cluster layout to node $NODE_ID_SHORT..."
  garage layout assign -z dc1 -c 1GB "$NODE_ID_SHORT"
  CURRENT_VERSION="$(garage layout show | sed -n 's/^Current cluster layout version: //p')"
  garage layout apply --version "$((CURRENT_VERSION + 1))"
else
  echo "Cluster layout already assigned, skipping."
fi

echo "Importing access key..."
garage key import "$STORAGE_ACCESS_KEY_ID" "$STORAGE_SECRET_ACCESS_KEY" -n re-astr --yes || true

echo "Creating test-archives bucket..."
garage bucket create test-archives || true

echo "Granting read/write on test-archives to the key..."
garage bucket allow --key re-astr --read --write test-archives

echo "Garage bootstrap complete."
