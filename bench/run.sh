#!/usr/bin/env bash
# Orchestrates one benchmark run against an already-running server:
# sign up a bench user, warm up, sample RSS/CPU while autocannon loads it.
#
# Usage: ./run.sh <label> <base_url> [duration_seconds] [connections]
set -euo pipefail

LABEL="${1:?usage: run.sh <label> <base_url> [duration] [connections]}"
BASE_URL="${2:?usage: run.sh <label> <base_url> [duration] [connections]}"
DURATION="${3:-30}"
CONNECTIONS="${4:-20}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="$(echo "$BASE_URL" | sed -E 's#^https?://[^:]+:([0-9]+).*#\1#')"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$SCRIPT_DIR/results/${LABEL}-${TIMESTAMP}"
mkdir -p "$OUT_DIR"

echo "==> [$LABEL] waiting for $BASE_URL/health ..."
for _ in $(seq 1 60); do
  if curl -sf "$BASE_URL/health" > /dev/null 2>&1; then break; fi
  sleep 1
done
if ! curl -sf "$BASE_URL/health" > /dev/null 2>&1; then
  echo "==> [$LABEL] server never became healthy at $BASE_URL/health" >&2
  exit 1
fi

PID="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN | head -1)"
if [ -z "$PID" ]; then
  echo "==> [$LABEL] no process listening on port $PORT" >&2
  exit 1
fi
echo "==> [$LABEL] target PID $PID on port $PORT"

echo "==> [$LABEL] signing up a bench user for an authenticated cookie ..."
SIGNUP_RESPONSE="$(curl -s -i -X POST "$BASE_URL/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"bench-${TIMESTAMP}@example.com\",\"password\":\"BenchPass123!\",\"name\":\"Bench User\"}")"
COOKIE="$(echo "$SIGNUP_RESPONSE" | { grep -i '^set-cookie:' || true; } | head -1 | sed -E 's/^[Ss]et-[Cc]ookie: ([^;]+);.*/\1/' | tr -d '\r')"
if [ -z "$COOKIE" ]; then
  echo "==> [$LABEL] WARNING: no session cookie obtained, protected routes will 401" >&2
fi

echo "==> [$LABEL] warm-up (5s, discarded) ..."
node "$SCRIPT_DIR/load.mjs" --url "$BASE_URL" --duration 5 --connections "$CONNECTIONS" --cookie "$COOKIE" > /dev/null

echo "==> [$LABEL] sampling resources every 500ms -> $OUT_DIR/resources.csv"
node "$SCRIPT_DIR/sample-resources.mjs" --pid "$PID" --out "$OUT_DIR/resources.csv" --interval 500 &
SAMPLER_PID=$!

echo "==> [$LABEL] running load for ${DURATION}s at ${CONNECTIONS} connections ..."
node "$SCRIPT_DIR/load.mjs" \
  --url "$BASE_URL" \
  --duration "$DURATION" \
  --connections "$CONNECTIONS" \
  --cookie "$COOKIE" \
  --out "$OUT_DIR/autocannon.json"

kill "$SAMPLER_PID" 2> /dev/null || true
wait "$SAMPLER_PID" 2> /dev/null || true

cat > "$OUT_DIR/metadata.json" <<EOF
{
  "label": "$LABEL",
  "baseUrl": "$BASE_URL",
  "pid": $PID,
  "port": $PORT,
  "durationSeconds": $DURATION,
  "connections": $CONNECTIONS,
  "timestamp": "$TIMESTAMP"
}
EOF

echo "==> [$LABEL] done, results in $OUT_DIR"
