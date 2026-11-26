#!/usr/bin/env bash
set -euo pipefail

APP=/opt/mibers
IN="$APP/incoming"
DOMAIN="$(cat "$APP/.domain")"
EMAIL="$(cat "$APP/.email")"
as_app() { runuser -u mibers -- env HOME="$APP" "$@"; }

rm -rf "$IN/src"
mkdir -p "$IN/src"
tar -xzf "$IN/release.tar.gz" -C "$IN/src"

if [ ! -f "$APP/env" ]; then
  [ -f "$IN/env.local" ] || { echo "File env.local belum diunggah."; exit 1; }
  DB_PASS="$(cat "$APP/.dbpass")"
  tr -d '\r' < "$IN/env.local" | grep -vE '^(DATABASE_URL|BETTER_AUTH_URL|BETTER_AUTH_SECRET|NODE_ENV)=' > "$APP/env"
  {
    echo "DATABASE_URL=\"postgresql://mibers:${DB_PASS}@127.0.0.1:5432/mibers\""
    echo "BETTER_AUTH_URL=\"https://${DOMAIN}\""
    echo "BETTER_AUTH_SECRET=\"$(openssl rand -hex 32)\""
  } >> "$APP/env"
fi
rm -f "$IN/env.local"
chown mibers:mibers "$APP/env"
chmod 600 "$APP/env"

rsync -a --delete \
  --exclude '/storage' --exclude '/.env' --exclude '/node_modules' --exclude '/.next' \
  "$IN/src/" "$APP/app/"
ln -sfn "$APP/env" "$APP/app/.env"
rm -rf "$APP/app/storage"
grep -q '^UPLOAD_DIR=' "$APP/env" || echo "UPLOAD_DIR=\"$APP/storage/uploads\"" >> "$APP/env"
chown -R mibers:mibers "$APP/app" "$APP/storage"

STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$APP/backup"
if [ -f "$IN/data.dump" ]; then
  TABLES="$(sudo -u postgres psql -d mibers -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")"
  if [ "$TABLES" = "0" ]; then
    sudo -u postgres pg_restore --no-owner --no-acl --role=mibers -d mibers "$IN/data.dump"
    echo "Database dari laptop berhasil dipindahkan."
  else
    echo "Database server sudah berisi data. Impor dilewati supaya data di server tidak tertimpa."
  fi
  mv "$IN/data.dump" "$APP/backup/import-$STAMP.dump"
fi
if [ -f "$IN/uploads.tar.gz" ]; then
  tar -xzf "$IN/uploads.tar.gz" -C "$APP/storage" --skip-old-files
  mv "$IN/uploads.tar.gz" "$APP/backup/uploads-$STAMP.tar.gz"
  echo "File unggahan dari laptop berhasil dipindahkan."
fi
chown -R mibers:mibers "$APP/storage"
chown -R root:root "$APP/backup"
chmod 700 "$APP/backup"

if [ "$(sudo -u postgres psql -d mibers -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")" != "0" ]; then
  sudo -u postgres pg_dump -Fc mibers > "$APP/backup/before-update-$STAMP.dump"
fi

cd "$APP/app"
as_app npm ci --no-audit --no-fund
as_app npx prisma generate --config prisma7.config.ts
as_app npx prisma migrate deploy --config prisma7.config.ts

USERS="$(sudo -u postgres psql -d mibers -tAc 'SELECT COUNT(*) FROM "User"')"
if [ "$USERS" = "0" ]; then
  as_app npx tsx prisma/seed.ts
fi

as_app npm run build
systemctl restart mibers

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect \
    || echo "HTTPS belum bisa dipasang. Pastikan DNS $DOMAIN sudah mengarah ke IP server ini, lalu jalankan deploy lagi."
fi

for i in $(seq 1 30); do
  if curl -fs -o /dev/null http://127.0.0.1:3000/login; then
    echo "Website berjalan: https://$DOMAIN"
    exit 0
  fi
  sleep 2
done
echo "Website belum merespons. Cek log: sudo journalctl -u mibers -n 100"
exit 1
