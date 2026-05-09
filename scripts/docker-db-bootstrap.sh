#!/usr/bin/env bash
# Docker Compose の API 用 DB に Ridgepole + seed を一度流す（初回・DB 作り直し後）。
# 前提: `docker compose up -d db` などで db が起動済み。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Ridgepole (development) + db:seed"
docker compose run --rm api bash -lc "cd /app/api && bundle exec ridgepole -c config/database.yml -E development --apply -f db/Schemafile && bundle exec rails db:seed"

echo "==> Ridgepole (test)"
docker compose run --rm api bash -lc "cd /app/api && bundle exec ridgepole -c config/database.yml -E test --apply -f db/Schemafile"

echo "Done."
