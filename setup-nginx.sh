#!/bin/bash

# Script de configuration nginx pour DFM Secure
# Usage: sudo ./setup-nginx.sh

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script en tant que root (sudo ./setup-nginx.sh)"
    exit 1
fi

APP_NAME="dfmsecure"
APP_PORT="3000"
NGINX_DIR="/etc/nginx"
SITES_AVAILABLE="$NGINX_DIR/sites-available"
SITES_ENABLED="$NGINX_DIR/sites-enabled"

echo "🌐 Configuration de nginx pour $APP_NAME..."
echo ""

# Vérifier si nginx est installé
if ! command -v nginx &> /dev/null; then
    echo "📦 Installation de nginx..."
    apt-get update -qq
    apt-get install -y nginx
fi

# Demander le nom de domaine
read -p "🌍 Entrez votre nom de domaine (ex: secure.dfm.fr) ou appuyez sur Entrée pour utiliser l'IP: " DOMAIN

if [ -z "$DOMAIN" ]; then
    # Utiliser l'IP publique
    DOMAIN=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    echo "📍 Utilisation de l'adresse IP: $DOMAIN"
else
    echo "📍 Nom de domaine: $DOMAIN"
fi

# Demander si HTTPS est souhaité
read -p "🔒 Voulez-vous configurer HTTPS avec Let's Encrypt ? (o/n): " USE_HTTPS

# Créer la configuration nginx
CONFIG_FILE="$SITES_AVAILABLE/$APP_NAME"

if [ "$USE_HTTPS" = "o" ] || [ "$USE_HTTPS" = "O" ]; then
    # Configuration HTTPS
    cat > $CONFIG_FILE <<EOF
# Redirection HTTP vers HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL (sera configuré par certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Recommandations SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/${APP_NAME}-access.log;
    error_log /var/log/nginx/${APP_NAME}-error.log;

    # Proxy vers l'application Node.js
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF
else
    # Configuration HTTP uniquement
    cat > $CONFIG_FILE <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Logs
    access_log /var/log/nginx/${APP_NAME}-access.log;
    error_log /var/log/nginx/${APP_NAME}-error.log;

    # Proxy vers l'application Node.js
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF
fi

# Activer le site
if [ -L "$SITES_ENABLED/$APP_NAME" ]; then
    rm "$SITES_ENABLED/$APP_NAME"
fi
ln -s $CONFIG_FILE $SITES_ENABLED/$APP_NAME

# Tester la configuration nginx
echo "🔍 Vérification de la configuration nginx..."
nginx -t

# Redémarrer nginx
echo "🔄 Redémarrage de nginx..."
systemctl restart nginx

if [ "$USE_HTTPS" = "o" ] || [ "$USE_HTTPS" = "O" ]; then
    echo ""
    echo "🔒 Configuration de Let's Encrypt..."
    
    # Vérifier si certbot est installé
    if ! command -v certbot &> /dev/null; then
        echo "📦 Installation de certbot..."
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    echo "📝 Génération du certificat SSL..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    echo ""
    echo "✅ HTTPS configuré avec succès !"
fi

echo ""
echo "✅ Configuration nginx terminée !"
echo ""
echo "🌐 Votre application est accessible sur: http://$DOMAIN"
if [ "$USE_HTTPS" = "o" ] || [ "$USE_HTTPS" = "O" ]; then
    echo "🔒 HTTPS: https://$DOMAIN"
fi
echo ""
echo "📝 Commandes utiles:"
echo "  - Vérifier nginx: systemctl status nginx"
echo "  - Logs nginx: tail -f /var/log/nginx/${APP_NAME}-access.log"
echo "  - Recharger nginx: systemctl reload nginx"
