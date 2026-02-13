# 📘 Guide d'installation complet - DFM Secure

Guide étape par étape pour installer DFM Secure sur une VM Linux.

## 🎯 Vue d'ensemble

Ce guide vous permettra d'installer l'application **DFM Secure** sur votre VM Linux en quelques minutes. L'installation est entièrement automatisée.

**Temps estimé :** 10-15 minutes

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Une VM Linux (Ubuntu 20.04+ ou Debian 11+)
- ✅ Un accès SSH avec les droits root/sudo
- ✅ Une connexion Internet active
- ✅ Les ports 80 et 443 ouverts (si vous utilisez HTTPS)

---

## 🚀 Installation - Procédure complète

### Étape 1 : Se connecter à la VM

```bash
# Se connecter via SSH
ssh votre-utilisateur@adresse-ip-vm

# Exemple :
# ssh root@192.168.1.100
# ou
# ssh ubuntu@votre-vm.com
```

### Étape 2 : Cloner le dépôt GitHub

```bash
# Aller dans le répertoire home ou /tmp
cd ~

# Cloner le dépôt
git clone https://github.com/Nabsflix/dfmsecure.git

# Entrer dans le dossier
cd dfmsecure
```

### Étape 3 : Rendre les scripts exécutables

```bash
# Donner les permissions d'exécution aux scripts
chmod +x install.sh setup-nginx.sh update.sh
```

### Étape 4 : Lancer l'installation automatique

```bash
# Exécuter le script d'installation (nécessite sudo)
sudo ./install.sh
```

**Ce que fait le script automatiquement :**
- ✅ Met à jour le système
- ✅ Installe Node.js 18
- ✅ Crée l'utilisateur système `dfmsecure`
- ✅ Clone l'application dans `/opt/dfmsecure`
- ✅ Installe toutes les dépendances npm
- ✅ Configure le service systemd
- ✅ Active le démarrage automatique

**Durée :** 3-5 minutes

### Étape 5 : Configurer les variables d'environnement

```bash
# Ouvrir le fichier de configuration
sudo nano /opt/dfmsecure/.env
```

**Configuration minimale :**

```env
PORT=3000
NODE_ENV=production
MAX_PAYLOAD_SIZE=100000
MAX_SECRETS=10000
```

**Configuration avec Redis (recommandé) :**

Si vous avez un compte Upstash Redis, ajoutez :

```env
UPSTASH_REDIS_REST_URL=https://votre-base.upstash.io
UPSTASH_REDIS_REST_TOKEN=votre_token_complet
```

**Sauvegarder :** `Ctrl+O` puis `Entrée`, puis `Ctrl+X`

### Étape 6 : Démarrer le service

```bash
# Démarrer le service
sudo systemctl start dfmsecure

# Vérifier que le service fonctionne
sudo systemctl status dfmsecure
```

Vous devriez voir : `Active: active (running)`

### Étape 7 : Vérifier que l'application fonctionne

```bash
# Tester localement
curl http://localhost:3000

# Ou depuis un autre terminal
curl http://votre-ip-vm:3000
```

Si vous voyez du HTML, c'est que ça fonctionne ! ✅

---

## 🌐 Configuration nginx (reverse proxy) - Optionnel mais recommandé

### Pourquoi nginx ?

- ✅ Accès via le port 80/443 (standard)
- ✅ Support HTTPS avec certificat SSL
- ✅ Meilleure sécurité
- ✅ Gestion du trafic

### Installation automatique de nginx

```bash
# Retourner dans le dossier du projet
cd ~/dfmsecure

# Lancer le script de configuration nginx
sudo ./setup-nginx.sh
```

Le script va vous demander :
1. **Nom de domaine** (ex: `secure.dfm.fr`) ou appuyez sur Entrée pour utiliser l'IP
2. **HTTPS avec Let's Encrypt** : Tapez `o` pour oui ou `n` pour non

**Exemple d'exécution :**

```
🌐 Configuration de nginx pour dfmsecure...

🌍 Entrez votre nom de domaine (ex: secure.dfm.fr) ou appuyez sur Entrée pour utiliser l'IP: secure.dfm.fr
📍 Nom de domaine: secure.dfm.fr

🔒 Voulez-vous configurer HTTPS avec Let's Encrypt ? (o/n): o
```

**Durée :** 2-3 minutes

### Vérifier nginx

```bash
# Vérifier le statut
sudo systemctl status nginx

# Tester la configuration
sudo nginx -t
```

---

## ✅ Vérification finale

### 1. Vérifier le service

```bash
sudo systemctl status dfmsecure
```

**Résultat attendu :**
```
● dfmsecure.service - DFM Secure - Partage sécurisé de mots de passe
   Loaded: loaded (/etc/systemd/system/dfmsecure.service; enabled)
   Active: active (running) since ...
```

### 2. Vérifier les logs

```bash
# Voir les dernières lignes
sudo journalctl -u dfmsecure -n 50

# Suivre les logs en temps réel
sudo journalctl -u dfmsecure -f
```

### 3. Tester l'application

**Depuis un navigateur :**
- Si nginx configuré : `http://votre-domaine` ou `https://votre-domaine`
- Sinon : `http://votre-ip-vm:3000`

**Depuis la ligne de commande :**
```bash
curl http://localhost:3000
```

---

## 🔧 Commandes utiles

### Gestion du service

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

# Désactiver le démarrage automatique
sudo systemctl disable dfmsecure

# Réactiver le démarrage automatique
sudo systemctl enable dfmsecure
```

### Mise à jour depuis GitHub

```bash
cd /opt/dfmsecure
sudo ./update.sh
```

### Configuration

```bash
# Modifier la configuration
sudo nano /opt/dfmsecure/.env

# Après modification, redémarrer
sudo systemctl restart dfmsecure
```

### Logs

```bash
# Logs de l'application (50 dernières lignes)
sudo journalctl -u dfmsecure -n 50

# Logs nginx
sudo tail -f /var/log/nginx/dfmsecure-access.log
sudo tail -f /var/log/nginx/dfmsecure-error.log
```

---

## 🔥 Configuration du firewall (si nécessaire)

Si vous utilisez UFW (Ubuntu Firewall) :

```bash
# Autoriser HTTP
sudo ufw allow 80/tcp

# Autoriser HTTPS
sudo ufw allow 443/tcp

# Autoriser SSH (IMPORTANT - ne pas oublier !)
sudo ufw allow 22/tcp

# Activer le firewall
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

---

## 🐛 Dépannage

### Le service ne démarre pas

```bash
# 1. Vérifier les logs détaillés
sudo journalctl -u dfmsecure -n 100

# 2. Vérifier que le port n'est pas utilisé
sudo lsof -i :3000

# 3. Vérifier les permissions
ls -la /opt/dfmsecure

# 4. Vérifier le fichier .env
cat /opt/dfmsecure/.env
```

### Erreur "Port already in use"

```bash
# Trouver le processus qui utilise le port
sudo lsof -i :3000

# Tuer le processus (remplacer PID par le numéro trouvé)
sudo kill -9 PID

# Ou changer le port dans .env
sudo nano /opt/dfmsecure/.env
# PORT=3001
sudo systemctl restart dfmsecure
```

### Erreur de permissions

```bash
# Corriger les permissions
sudo chown -R dfmsecure:dfmsecure /opt/dfmsecure
sudo systemctl restart dfmsecure
```

### nginx ne fonctionne pas

```bash
# Tester la configuration
sudo nginx -t

# Vérifier les erreurs
sudo tail -f /var/log/nginx/error.log

# Redémarrer nginx
sudo systemctl restart nginx

# Vérifier le statut
sudo systemctl status nginx
```

### L'application ne répond pas

```bash
# 1. Vérifier que le service tourne
sudo systemctl status dfmsecure

# 2. Vérifier les logs
sudo journalctl -u dfmsecure -n 50

# 3. Tester localement
curl http://localhost:3000

# 4. Vérifier le firewall
sudo ufw status
```

---

## 📊 Monitoring

### Vérifier l'utilisation des ressources

```bash
# Installer htop si nécessaire
sudo apt-get install -y htop

# Voir l'utilisation CPU/RAM
htop

# Filtrer les processus Node.js
htop -p $(pgrep -f "node.*server.js")
```

### Espace disque

```bash
# Vérifier l'espace disponible
df -h

# Vérifier la taille de l'application
du -sh /opt/dfmsecure
```

---

## 🔄 Sauvegarde et restauration

### Créer une sauvegarde

```bash
# Créer un dossier de sauvegarde
sudo mkdir -p /backup/dfmsecure

# Créer l'archive
sudo tar -czf /backup/dfmsecure/backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /opt dfmsecure

# Sauvegarder aussi le .env
sudo cp /opt/dfmsecure/.env /backup/dfmsecure/.env.backup
```

### Restaurer une sauvegarde

```bash
# Arrêter le service
sudo systemctl stop dfmsecure

# Restaurer l'archive
sudo tar -xzf /backup/dfmsecure/backup_YYYYMMDD_HHMMSS.tar.gz -C /opt

# Restaurer le .env
sudo cp /backup/dfmsecure/.env.backup /opt/dfmsecure/.env

# Redémarrer
sudo systemctl start dfmsecure
```

---

## 📝 Checklist de déploiement

Utilisez cette checklist pour vérifier que tout est bien installé :

- [ ] VM Linux accessible via SSH
- [ ] Dépôt cloné depuis GitHub
- [ ] Scripts rendus exécutables (`chmod +x`)
- [ ] Installation exécutée (`sudo ./install.sh`)
- [ ] Fichier `.env` créé et configuré
- [ ] Service démarré (`systemctl start dfmsecure`)
- [ ] Service vérifié (`systemctl status dfmsecure`)
- [ ] Application accessible (`curl http://localhost:3000`)
- [ ] nginx configuré (`sudo ./setup-nginx.sh`) - optionnel
- [ ] HTTPS configuré (si domaine) - optionnel
- [ ] Firewall configuré (ports 80/443 ouverts)
- [ ] Application accessible depuis l'extérieur
- [ ] Logs vérifiés (pas d'erreurs)

---

## 🎉 C'est terminé !

Votre application **DFM Secure** est maintenant installée et fonctionnelle !

### Accès à l'application

- **Sans nginx :** `http://votre-ip-vm:3000`
- **Avec nginx :** `http://votre-domaine` ou `https://votre-domaine`

### Prochaines étapes

1. ✅ Tester la création d'un secret
2. ✅ Tester la lecture d'un secret
3. ✅ Configurer Upstash Redis (optionnel mais recommandé)
4. ✅ Configurer un nom de domaine (si pas encore fait)
5. ✅ Configurer les sauvegardes automatiques

---

## 📞 Support

En cas de problème :

1. **Consulter les logs :**
   ```bash
   sudo journalctl -u dfmsecure -n 100
   ```

2. **Vérifier le statut :**
   ```bash
   sudo systemctl status dfmsecure
   ```

3. **Vérifier nginx (si configuré) :**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

---

## 📚 Documentation supplémentaire

- **Guide détaillé :** `VM_DEPLOY.md`
- **Documentation générale :** `README.md`
- **Déploiement Netlify :** `NETLIFY_DEPLOY.md`

---

**Bon déploiement ! 🚀**
