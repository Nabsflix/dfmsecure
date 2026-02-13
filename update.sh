#!/bin/bash

# Script de mise à jour depuis GitHub
# Usage: sudo ./update.sh

set -e

APP_NAME="dfmsecure"
APP_DIR="/opt/$APP_NAME"
APP_USER="dfmsecure"
SERVICE_NAME="$APP_NAME"

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script en tant que root (sudo ./update.sh)"
    exit 1
fi

echo "🔄 Mise à jour de $APP_NAME..."
echo ""

cd $APP_DIR

# Sauvegarder le fichier .env
if [ -f "$APP_DIR/.env" ]; then
    echo "💾 Sauvegarde du fichier .env..."
    cp .env .env.backup
fi

# Récupérer les dernières modifications
echo "📥 Récupération des modifications depuis GitHub..."
sudo -u $APP_USER git fetch origin
sudo -u $APP_USER git pull origin main

# Installer les nouvelles dépendances
echo "📦 Mise à jour des dépendances..."
sudo -u $APP_USER npm install --production

# Restaurer le fichier .env
if [ -f "$APP_DIR/.env.backup" ]; then
    echo "♻️  Restauration du fichier .env..."
    mv .env.backup .env
fi

# Redémarrer le service
echo "🔄 Redémarrage du service..."
systemctl restart $SERVICE_NAME

echo ""
echo "✅ Mise à jour terminée !"
echo ""
echo "📊 Statut du service:"
systemctl status $SERVICE_NAME --no-pager -l
