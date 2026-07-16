#!/bin/bash
# Author: Robert Massey | Created: 2026-07-15 | Module: Scripts / VPS bootstrap
# One-time production setup on the Hostinger VPS (AlmaLinux 10, run as root).
# Idempotent: safe to re-run after changing DOMAIN in /opt/attune-sb/.env.
#
# Usage:
#   1. Copy the repo's docker/ files to the server (the deploy workflow does
#      this too):  scp docker/docker-compose.prod.yml docker/env.production.example \
#        docker/nginx/attune-sb.conf.template root@<vps>:/opt/attune-sb/
#   2. cp /opt/attune-sb/env.production.example /opt/attune-sb/.env  && fill it in
#   3. bash vps-setup.sh
set -euo pipefail

APP_DIR=/opt/attune-sb
ENV_FILE="$APP_DIR/.env"
NGINX_TEMPLATE="$APP_DIR/attune-sb.conf.template"
NGINX_CONF=/etc/nginx/conf.d/attune-sb.conf
ACME_WEBROOT=/var/www/letsencrypt

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — copy env.production.example and fill it in"; exit 1; }
[ -f "$NGINX_TEMPLATE" ] || { echo "Missing $NGINX_TEMPLATE"; exit 1; }

DOMAIN=$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
[ -n "$DOMAIN" ] || { echo "DOMAIN is not set in $ENV_FILE"; exit 1; }
echo "==> Setting up for domain: $DOMAIN"

echo "==> Installing certbot (if missing)"
command -v certbot >/dev/null 2>&1 || dnf -y install certbot

echo "==> ACME webroot"
mkdir -p "$ACME_WEBROOT"

# SELinux (enforcing on AlmaLinux): allow nginx to talk to the loopback
# upstreams and serve the ACME webroot.
echo "==> SELinux booleans"
setsebool -P httpd_can_network_connect 1
command -v restorecon >/dev/null 2>&1 && restorecon -R "$ACME_WEBROOT" || true

echo "==> Rendering nginx config"
# Render only ${DOMAIN}; nginx runtime vars ($host, $request_uri...) untouched.
DOMAIN="$DOMAIN" envsubst '${DOMAIN}' <"$NGINX_TEMPLATE" >"$NGINX_CONF.pending"

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "==> No certificate yet — issuing via HTTP challenge"
  # Serve the challenge over plain HTTP first (cert paths don't exist yet).
  cat >"$NGINX_CONF" <<BOOTSTRAP
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root $ACME_WEBROOT; }
    location / { return 503; }
}
BOOTSTRAP
  nginx -t && systemctl reload nginx
  certbot certonly --webroot -w "$ACME_WEBROOT" -d "$DOMAIN" \
    --non-interactive --agree-tos -m robert@attuneitus.com
fi

echo "==> Activating full site config"
mv "$NGINX_CONF.pending" "$NGINX_CONF"
nginx -t && systemctl reload nginx

echo "==> Enabling certbot auto-renewal timer"
systemctl enable --now certbot-renew.timer
# Reload nginx after each renewal so it picks up the new cert.
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/bash
systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

echo "==> Starting the application stack"
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d

echo "==> Done. Check: curl -s https://$DOMAIN/api/v1/health"
