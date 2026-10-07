#!/usr/bin/env bash
# Runs ON the VPS as root after deploy.sh copied the code to /srv/snow. Safe to re-run: never wipes data
# unless --demo or --fresh is passed. First run also creates the database, secrets, services, nginx, HTTPS, backups.
set -euo pipefail

APP=/srv/snow
DATA=/srv/snow-data
ENVF=$DATA/app.env
DOMAIN=snow.t-plusplus.tech
API_PORT=4951
WEB_PORT=4950
MODE=${1:-}

mkdir -p "$DATA/backups"
chmod 700 "$DATA"

if [[ ! -f "$ENVF" ]]; then
  echo "== first run: creating secrets"
  DB_PW=$(openssl rand -hex 16)
  umask 077
  cat > "$ENVF" <<EOF
DATABASE_URL=postgresql://snow:${DB_PW}@127.0.0.1:5432/snow
SNOW_DB_PW=${DB_PW}
JWT_SECRET=$(openssl rand -hex 32)
PORT=${API_PORT}
NODE_ENV=production
EOF
  FIRST_RUN=1
fi
set -a
# shellcheck disable=SC1090
. "$ENVF"
set +a

echo "== database"
psql_su() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qtA "$@"; }
[[ "$(psql_su -c "select 1 from pg_roles where rolname='snow'")" == 1 ]] || psql_su -c "create role snow login password '${SNOW_DB_PW}'"
[[ "$(psql_su -c "select 1 from pg_database where datname='snow'")" == 1 ]] || psql_su -c "create database snow owner snow"

echo "== api: install, migrate, build"
cd "$APP/backend"
npm ci --include=dev --no-audit --no-fund --loglevel=error
npx prisma migrate deploy
npx prisma generate >/dev/null
npm run -s build

pin() { printf '%04d' $(( $(od -An -N2 -tu2 /dev/urandom) % 10000 )); }
if [[ "$MODE" == "--demo" || "$MODE" == "--fresh" || -n "${FIRST_RUN:-}" ]]; then
  OWNER_PIN=$(pin)
  if [[ "$MODE" == "--demo" ]]; then
    STAFF_PIN=$(pin)
    SEED_DEMO=1 SEED_OWNER_PIN=$OWNER_PIN SEED_STAFF_PIN=$STAFF_PIN npx tsx prisma/seed.ts >/dev/null
    echo "== DEMO DATA LOADED. Owner PIN: $OWNER_PIN   Staff PIN (أبو علي، حيدر، مصطفى): $STAFF_PIN"
  else
    if [[ "$MODE" == "--fresh" ]]; then npx tsx scripts/wipe.ts; fi
    SEED_OWNER_PIN=$OWNER_PIN npx tsx prisma/seed.ts >/dev/null
    echo "== EMPTY FACTORY READY. Owner PIN: $OWNER_PIN"
  fi
fi

echo "== web: install, build"
cd "$APP/frontend"
npm ci --include=dev --no-audit --no-fund --loglevel=error
npm run -s build > "$DATA/last-build.log" 2>&1 || { tail -40 "$DATA/last-build.log"; exit 1; }

echo "== services"
for unit in snow-api snow-web; do
  if ! cmp -s "$APP/deploy/$unit.service" "/etc/systemd/system/$unit.service"; then
    cp "$APP/deploy/$unit.service" "/etc/systemd/system/$unit.service"
    systemctl daemon-reload
    systemctl enable "$unit" >/dev/null 2>&1
  fi
  systemctl restart "$unit"
done

if [[ ! -f /etc/nginx/sites-enabled/snow.conf ]]; then
  echo "== nginx + https (first run)"
  cp "$APP/deploy/nginx-snow.conf" /etc/nginx/sites-available/snow.conf
  ln -sf /etc/nginx/sites-available/snow.conf /etc/nginx/sites-enabled/snow.conf
  nginx -t
  systemctl reload nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --redirect --agree-tos --register-unsafely-without-email
fi

if [[ ! -f /etc/cron.d/snow-backup ]]; then
  echo "== nightly backup (03:40, keeps 30 days)"
  cat > /etc/cron.d/snow-backup <<EOF
40 3 * * * root runuser -u postgres -- pg_dump -Fc snow > ${DATA}/backups/snow-\$(date +\%F).dump && find ${DATA}/backups -name 'snow-*.dump' -mtime +30 -delete
EOF
fi

echo "== health"
for i in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:${API_PORT}/api/health" && curl -sf -o /dev/null "http://127.0.0.1:${WEB_PORT}/login" && break
  sleep 1
done
curl -sf -o /dev/null "http://127.0.0.1:${API_PORT}/api/health" || { journalctl -u snow-api -n 40 --no-pager; exit 1; }
curl -sf -o /dev/null "http://127.0.0.1:${WEB_PORT}/login" || { journalctl -u snow-web -n 40 --no-pager; exit 1; }
echo "api :${API_PORT} and web :${WEB_PORT} are up"
