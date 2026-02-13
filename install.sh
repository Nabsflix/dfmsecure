#!/bin/bash

# Script d'installation pour VM Linux
# Usage: ./install.sh

set -e

echo "🚀 Installation de DFM Secure sur Linux..."
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script en tant que root (sudo ./install.sh)"
    exit 1
fi

# Variables
APP_NAME="dfmsecure"
APP_DIR="/opt/$APP_NAME"
APP_USER="dfmsecure"
SERVICE_NAME="$APP_NAME"
NODE_VERSION="18"

echo "📦 Mise à jour du système..."
apt-get update -qq

echo "📦 Installation des dépendances système..."
apt-get install -y curl git build-essential

echo "📦 Installation de Node.js v$NODE_VERSION..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Créer l'utilisateur système
if ! id "$APP_USER" &>/dev/null; then
    echo "👤 Création de l'utilisateur $APP_USER..."
    useradd -r -s /bin/false -d $APP_DIR $APP_USER
fi

# Créer le répertoire de l'application
echo "📁 Création du répertoire $APP_DIR..."
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

# Cloner ou mettre à jour depuis GitHub
if [ -d "$APP_DIR/.git" ]; then
    echo "🔄 Mise à jour depuis GitHub..."
    cd $APP_DIR
    sudo -u $APP_USER git pull origin main
else
    echo "📥 Clonage depuis GitHub..."
    cd /opt
    sudo -u $APP_USER git clone https://github.com/Nabsflix/dfmsecure.git $APP_NAME
fi

cd $APP_DIR

# Installer les dépendances npm
echo "📦 Installation des dépendances npm..."
sudo -u $APP_USER npm install --production

# Créer le fichier .env s'il n'existe pas
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚙️  Création du fichier .env..."
    sudo -u $APP_USER cp .env.example .env
    echo "⚠️  IMPORTANT: Modifiez $APP_DIR/.env avec vos configurations"
fi

# Créer le service systemd
echo "🔧 Configuration du service systemd..."
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=DFM Secure - Partage sécurisé de mots de passe
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment="NODE_ENV=production"
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME

[Install]
WantedBy=multi-user.target
EOF

# Recharger systemd
systemctl daemon-reload

# Activer le service au démarrage
systemctl enable ${SERVICE_NAME}

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Configurez les variables d'environnement: nano $APP_DIR/.env"
echo "2. Démarrez le service: systemctl start $SERVICE_NAME"
echo "3. Vérifiez le statut: systemctl status $SERVICE_NAME"
echo "4. Consultez les logs: journalctl -u $SERVICE_NAME -f"
echo ""
echo "🌐 Pour configurer nginx, exécutez: ./setup-nginx.sh"
