#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:?Pakai: sudo bash setup-server.sh <domain> <email>}"
EMAIL="${2:?Pakai: sudo bash setup-server.sh <domain> <email>}"
APP=/opt/mibers

export DEBIAN_FRONTEND=noninteractive

MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "$MEM_MB" -lt 3500 ] && ! swapon --show | grep -q .; then
  fallocate -l 3G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=3072
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update
apt-get -y upgrade
apt-get install -y curl ca-certificates gnupg openssl rsync nginx certbot python3-certbot-nginx postgresql-common
if ! dpkg -s postgresql-18 >/dev/null 2>&1; then
  /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
  apt-get install -y postgresql-18
fi

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v24" ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

id -u mibers >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin mibers
mkdir -p "$APP/app" "$APP/storage/uploads" "$APP/incoming"

if [ ! -f "$APP/.dbpass" ]; then
  openssl rand -hex 24 > "$APP/.dbpass"
  chmod 600 "$APP/.dbpass"
fi
DB_PASS="$(cat "$APP/.dbpass")"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='mibers'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE ROLE mibers LOGIN PASSWORD '$DB_PASS'"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='mibers'" | grep -q 1; then
  sudo -u postgres createdb -O mibers mibers
fi
chown -R mibers:mibers "$APP"
chown root:root "$APP/.dbpass"

for port in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    line="$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')"
    if [ -n "$line" ]; then
      iptables -I INPUT "$line" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    else
      iptables -A INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    fi
  fi
done
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; fi
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

sed "s/__DOMAIN__/$DOMAIN/g" "$(dirname "$0")/nginx.conf" > /etc/nginx/sites-available/mibers
ln -sf /etc/nginx/sites-available/mibers /etc/nginx/sites-enabled/mibers
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

cp "$(dirname "$0")/mibers.service" /etc/systemd/system/mibers.service
systemctl daemon-reload
systemctl enable mibers

echo "$DOMAIN" > "$APP/.domain"
echo "$EMAIL" > "$APP/.email"
echo "Setup server selesai."
