# Secure 🔒

Application web professionnelle pour partager des mots de passe et informations sensibles de manière sécurisée avec vos clients.

## 🚀 Déploiement rapide

### Sur VM Linux
👉 **Guide complet :** [INSTALLATION_COMPLETE.md](INSTALLATION_COMPLETE.md)

**Installation en 3 commandes :**
```bash
git clone https://github.com/Nabsflix/dfmsecure.git
cd dfmsecure && chmod +x *.sh
sudo ./install.sh
```

### Sur Netlify
👉 **Guide :** [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md)

## ✨ Fonctionnalités

- 🔐 **Chiffrement côté navigateur** - Le serveur ne voit jamais les données en clair
- ⏱️ **Expiration automatique** - Liens avec durée de vie limitée (1h, 1j, 1 semaine)
- 🔥 **Auto-destruction** - Les secrets sont détruits après lecture
- 🛡️ **Protection contre les abus** - Rate limiting intégré
- 🎨 **Interface moderne** - Design sombre et élégant
- 📱 **Responsive** - Fonctionne sur mobile et desktop
- 📊 **Monitoring** - Logs et statistiques disponibles

## 🚀 Installation

### Prérequis

- Node.js >= 14.0.0
- npm ou yarn

### Étapes

1. **Cloner ou télécharger le projet**
   ```bash
   cd dfmsecure
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer l'environnement** (optionnel)
   ```bash
   cp .env.example .env
   # Éditez .env selon vos besoins
   ```

4. **Démarrer le serveur**
   ```bash
   npm start
   ```

5. **Accéder à l'application**
   Ouvrez votre navigateur à l'adresse : `http://localhost:3000`

## 📁 Structure du projet

```
dfmsecure/
├── index.html          # Page principale
├── app.js              # Logique JavaScript côté client
├── styles.css          # Styles CSS
├── server.js           # Serveur Express (backend)
├── package.json        # Dépendances Node.js
├── .env.example        # Exemple de configuration
├── .gitignore          # Fichiers à ignorer
├── assets/
│   └── logo.png        # Logo de l'application
└── README.md           # Documentation
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` à partir de `.env.example` :

```bash
# Port du serveur
PORT=3000

# Taille maximale du payload en bytes (défaut: 100000 = 100KB)
MAX_PAYLOAD_SIZE=100000

# Nombre maximum de secrets stockés en mémoire (défaut: 10000)
MAX_SECRETS=10000

# Afficher les statistiques via /api/stats (true/false)
SHOW_STATS=false

# Environnement (development/production)
NODE_ENV=production
```

### Port du serveur

Par défaut, le serveur écoute sur le port 3000. Pour changer le port :

```bash
PORT=8080 npm start
```

Ou dans le fichier `.env` :
```
PORT=8080
```

### Accès réseau

Pour rendre l'application accessible sur le réseau local ou internet, le serveur écoute déjà sur `0.0.0.0`. Vous pouvez y accéder via l'IP de votre machine :

```
http://VOTRE_IP:3000
```

## 🔒 Sécurité

### Mesures de sécurité implémentées

- **Chiffrement** : AES-GCM 256 bits avec PBKDF2 (200 000 itérations)
- **Stockage** : Les secrets sont stockés en mémoire uniquement (non persistants)
- **Expiration** : Nettoyage automatique des secrets expirés
- **Auto-destruction** : Les secrets sont supprimés après lecture si activé
- **Rate Limiting** : Protection contre les abus (50 requêtes/15min pour création, 100/15min pour lecture)
- **Helmet** : Headers de sécurité HTTP configurés
- **Validation** : Validation stricte des entrées et des payloads
- **Limites** : Limitation de la taille des payloads et du nombre de secrets

### ⚠️ Déploiement en production

Pour un déploiement professionnel avec vos clients, considérez :

1. **HTTPS/TLS** : Utilisez un reverse proxy (nginx, Caddy) avec certificat SSL
2. **Base de données** : Remplacez le stockage mémoire par Redis ou MongoDB pour la persistance
3. **Monitoring** : Intégrez des outils de monitoring (PM2, Sentry, etc.)
4. **Backup** : Configurez des sauvegardes régulières si vous utilisez une DB
5. **Firewall** : Configurez les règles de pare-feu appropriées
6. **Domain** : Utilisez un nom de domaine professionnel

### Exemple de configuration nginx avec HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name secure.votredomaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring et statistiques

### Logs

Le serveur enregistre automatiquement :
- Toutes les requêtes avec timestamp et IP
- Création de secrets
- Destruction de secrets (burn after read)
- Nettoyage des secrets expirés
- Erreurs

### API Statistiques (optionnel)

Pour activer l'endpoint de statistiques, ajoutez dans `.env` :
```
SHOW_STATS=true
```

Puis accédez à : `http://localhost:3000/api/stats`

**⚠️ Désactivez cette fonctionnalité en production** pour éviter l'exposition d'informations sensibles.

## 🛠️ Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript (ES6+)
- **Backend** : Node.js, Express
- **Sécurité** : Helmet, express-rate-limit
- **Cryptographie** : Web Crypto API (navigateur)
- **Configuration** : dotenv

## 📝 Utilisation

### Pour vos clients

1. **Créer un secret** :
   - Entrez le mot de passe/information sensible à partager
   - Choisissez une durée d'expiration (1h, 1j, 1 semaine)
   - Créez une phrase de déchiffrement sécurisée (minimum 8 caractères)
   - Cliquez sur "Créer un lien"
   - Partagez le lien généré **ET** la phrase de déchiffrement par un canal séparé (email, SMS, appel)

2. **Lire un secret** :
   - Ouvrez le lien reçu
   - Entrez la phrase de déchiffrement
   - Cliquez sur "Lire"
   - Le secret sera affiché (et supprimé automatiquement après lecture)

### Bonnes pratiques

- ✅ Envoyez toujours le lien et la phrase de déchiffrement par des canaux différents
- ✅ Utilisez des phrases de déchiffrement fortes (minimum 12 caractères recommandé)
- ✅ Choisissez une expiration appropriée selon la sensibilité
- ✅ Vérifiez que le destinataire a bien reçu le secret avant expiration
- ❌ Ne partagez jamais le lien et la phrase dans le même message

## 🐛 Dépannage

### Le serveur ne démarre pas
- Vérifiez que Node.js est installé : `node --version`
- Vérifiez que le port configuré n'est pas déjà utilisé
- Vérifiez les logs d'erreur dans la console

### Erreur "Cannot find module"
- Exécutez `npm install` pour installer les dépendances
- Vérifiez que toutes les dépendances sont installées

### Erreur "Trop de requêtes"
- Le rate limiting a été déclenché
- Attendez 15 minutes avant de réessayer
- En production, ajustez les limites dans `server.js` si nécessaire

### Le logo ne s'affiche pas
- Vérifiez que le fichier `assets/logo.png` existe
- Vérifiez les permissions du fichier
- Vérifiez la console du navigateur pour les erreurs

### Secrets non accessibles après redémarrage
- C'est normal : les secrets sont stockés en mémoire
- Pour la persistance, migrez vers Redis ou une base de données

## 🚀 Déploiement avec PM2 (recommandé)

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
pm2 start server.js --name secure

# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

## 📄 Licence

MIT

## 🤝 Support

Pour toute question ou problème, consultez les logs du serveur ou vérifiez la configuration dans `.env`.
