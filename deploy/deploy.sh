#!/usr/bin/env bash
# Deploy the snow factory from this Mac to the VPS.
#   bash deploy/deploy.sh          -> ship code, migrate, build, restart (data untouched)
#   bash deploy/deploy.sh --demo   -> ALSO wipe everything and load two weeks of demo data (new PINs printed)
#   bash deploy/deploy.sh --fresh  -> ALSO wipe everything and start empty with only the owner (new PIN printed)
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${SNOW_HOST:-mohammed-2}

echo "== copy code to $HOST:/srv/snow"
ssh "$HOST" "mkdir -p /srv/snow"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude dist --exclude '.env*' --exclude .claude --exclude .git \
  --exclude '*.tsbuildinfo' --exclude screenshots \
  ./ "$HOST:/srv/snow/"

ssh "$HOST" "bash /srv/snow/deploy/remote-setup.sh ${1:-}"
echo "== live: https://snow.t-plusplus.tech"
