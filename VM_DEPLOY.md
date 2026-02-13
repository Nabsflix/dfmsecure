# Déploiement sur VM Linux 🐧

Guide complet pour déployer DFM Secure sur une machine virtuelle Linux.

## 📋 Prérequis

- VM Linux (Ubuntu 20.04+ ou Debian 11+ recommandé)
- Accès root ou sudo
- Connexion Internet
- Port 80 et 443 ouverts (si HTTPS)

## 🚀 Installation rapide

### Méthode 1 : Installation automatique (recommandée)

```bash
# Se connecter à la VM en SSH
ssh user@votre-vm-ip

# Cloner le dépôt
git clone https://github.com/Nabsflix/dfmsecure.git
cd dfmsecure

# Rendre les scripts exécutables
chmod +x install.sh setup-nginx.sh update.sh

# Lancer l'installation
sudo ./install.sh
```

L'installation va :
- ✅ Installer Node.js 18
- ✅ Créer l'utilisateur système `dfmsecure`
- ✅ Cloner l'application dans `/opt/dfmsecure`
- ✅ Installer les dépendances npm
- ✅ Configurer le service systemd
- ✅ Activer le service au démarrage

### Méthode 2 : Installation manuelle

```bash
# 1. Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Cloner le dépôt
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/Nabsflix/dfmsecure.git
cd dfmsecure

# 3. Installer les dépendances
sudo npm install --production

# 4. Créer le fichier .env
sudo cp .env.example .env
sudo nano .env  # Configurer les variables
```

## ⚙️ Configuration

### 1. Configurer les variables d'environnement

```bash
sudo nano /opt/dfmsecure/.env
```

Variables importantes :
```env
PORT=3000
NODE_ENV=production
MAX_PAYLOAD_SIZE=100000
MAX_SECRETS=10000

# Upstash Redis (optionnel mais recommandé)
UPSTASH_REDIS_REST_URL=https://votre-base.upstash.io
UPSTASH_REDIS_REST_TOKEN=votre_token
```

### 2. Démarrer le service

```bash
sudo systemctl start dfmsecure
sudo systemctl enable dfmsecure  # Démarrage automatique
```

### 3. Vérifier le statut

```bash
sudo systemctl status dfmsecure
```

## 🌐 Configuration nginx (reverse proxy)

### Installation automatique

```bash
cd /opt/dfmsecure
sudo ./setup-nginx.sh
```

Le script va :
- ✅ Installer nginx si nécessaire
- ✅ Créer la configuration
- ✅ Configurer HTTPS avec Let's Encrypt (optionnel)
- ✅ Redémarrer nginx

### Configuration manuelle

1. **Installer nginx**
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

2. **Créer la configuration**
```bash
sudo nano /etc/nginx/sites-available/dfmsecure
```

Contenu :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Activer le site**
```bash
sudo ln -s /etc/nginx/sites-available/dfmsecure /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Configuration HTTPS avec Let's Encrypt

```bash
# Installer certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Générer le certificat
sudo certbot --nginx -d votre-domaine.com

# Renouvellement automatique (déjà configuré par certbot)
```

## 📝 Commandes de gestion

### Service systemd

```bash
# Démarrer
sudo systemctl start dfmsecure

# Arrêter
sudo systemctl stop dfmsecure

# Redémarrer
sudo systemctl restart dfmsecure

# Statut
sudo systemctl status dfmsecure

# Logs en temps réel
sudo journalctl -u dfmsecure -f

# Logs des 100 dernières lignes
sudo journalctl -u dfmsecure -n 100
```

### Mise à jour depuis GitHub

```bash
cd /opt/dfmsecure
sudo ./update.sh
```

Ou manuellement :
```bash
cd /opt/dfmsecure
sudo -u dfmsecure git pull origin main
sudo -u dfmsecure npm install --production
sudo systemctl restart dfmsecure
```

## 🔧 Dépannage

### Le service ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u dfmsecure -n 50

# Vérifier la configuration
sudo systemctl status dfmsecure

# Vérifier les permissions
ls -la /opt/dfmsecure
```

### Port déjà utilisé

```bash
# Vérifier quel processus utilise le port 3000
sudo lsof -i :3000

# Modifier le port dans .env
sudo nano /opt/dfmsecure/.env
# PORT=3001
```

### Problèmes de permissions

```bash
# Corriger les permissions
sudo chown -R dfmsecure:dfmsecure /opt/dfmsecure
```

### nginx ne fonctionne pas

```bash
# Tester la configuration
sudo nginx -t

# Vérifier les logs
sudo tail -f /var/log/nginx/error.log

# Redémarrer nginx
sudo systemctl restart nginx
```

## 🔥 Firewall (UFW)

```bash
# Autoriser HTTP
sudo ufw allow 80/tcp

# Autoriser HTTPS
sudo ufw allow 443/tcp

# Autoriser SSH (important !)
sudo ufw allow 22/tcp

# Activer le firewall
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

## 📊 Monitoring

### Vérifier l'utilisation des ressources

```bash
# CPU et mémoire
htop

# Espace disque
df -h

# Processus Node.js
ps aux | grep node
```

### Logs

```bash
# Logs de l'application
sudo journalctl -u dfmsecure -f

# Logs nginx
sudo tail -f /var/log/nginx/dfmsecure-access.log
sudo tail -f /var/log/nginx/dfmsecure-error.log
```

## 🔄 Sauvegarde

### Script de sauvegarde

```bash
#!/bin/bash
BACKUP_DIR="/backup/dfmsecure"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/dfmsecure_$DATE.tar.gz /opt/dfmsecure
```

### Restauration

```bash
tar -xzf backup/dfmsecure_YYYYMMDD_HHMMSS.tar.gz -C /
sudo systemctl restart dfmsecure
```

## 📚 Structure des fichiers

```
/opt/dfmsecure/
├── index.html
├── app.js
├── styles.css
├── server.js
├── package.json
├── .env              # Configuration (à créer)
├── assets/
│   └── logo.png
└── netlify/          # (non utilisé sur VM)
```

## ✅ Checklist de déploiement

- [ ] VM Linux configurée avec accès SSH
- [ ] Ports 80/443 ouverts dans le firewall
- [ ] Installation exécutée (`./install.sh`)
- [ ] Fichier `.env` configuré
- [ ] Service démarré et vérifié
- [ ] nginx configuré (`./setup-nginx.sh`)
- [ ] HTTPS configuré (si domaine)
- [ ] Application accessible depuis l'extérieur
- [ ] Logs vérifiés

## 🆘 Support

En cas de problème :
1. Vérifier les logs : `sudo journalctl -u dfmsecure -n 100`
2. Vérifier le statut : `sudo systemctl status dfmsecure`
3. Vérifier nginx : `sudo nginx -t && sudo systemctl status nginx`

## 📝 Notes importantes

- L'application écoute sur le port 3000 par défaut
- Le service démarre automatiquement au boot
- Les mises à jour se font via `./update.sh`
- Les secrets sont stockés en mémoire (ou Redis si configuré)
- Le service redémarre automatiquement en cas de crash
