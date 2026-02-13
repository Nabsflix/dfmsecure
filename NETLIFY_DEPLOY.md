# Déploiement sur Netlify 🚀

Guide pour déployer l'application Secure sur Netlify avec Upstash Redis.

## 📋 Prérequis

- Compte GitHub avec le dépôt `dfmsecure`
- Compte Netlify (gratuit)
- Compte Upstash (gratuit jusqu'à 10K requêtes/jour)

## 🚀 Méthode 1 : Déploiement via l'interface Netlify (Recommandé)

### Étape 1 : Connecter votre dépôt

1. Allez sur [app.netlify.com](https://app.netlify.com)
2. Cliquez sur **"Add new site"** > **"Import an existing project"**
3. Connectez votre compte GitHub
4. Sélectionnez le dépôt `dfmsecure`

### Étape 2 : Configuration du build

- **Build command** : `npm run build`
- **Publish directory** : `.` (racine du projet)
- Cliquez sur **"Deploy site"**

### Étape 3 : Configurer Upstash Redis ⚙️

1. **Créer une base Redis sur Upstash**
   - Allez sur [console.upstash.com](https://console.upstash.com)
   - Créez une nouvelle base Redis
   - Choisissez la région la plus proche de vos utilisateurs
   - Notez l'**URL** et le **Token**

2. **Ajouter les variables d'environnement dans Netlify**
   - Dans Netlify, allez dans **"Site settings"** > **"Environment variables"**
   - Ajoutez les variables suivantes :
   
   ```
   UPSTASH_REDIS_REST_URL = https://allowing-crow-42956.upstash.io
   UPSTASH_REDIS_REST_TOKEN = votre_token_ici
   ```
   
   ⚠️ **Important** : Remplacez les valeurs par celles de votre compte Upstash !

3. **Variables d'environnement optionnelles**
   ```
   MAX_PAYLOAD_SIZE = 100000
   MAX_SECRETS = 10000
   NODE_ENV = production
   ```

4. **Redéployer**
   - Après avoir ajouté les variables, allez dans **"Deploys"**
   - Cliquez sur **"Trigger deploy"** > **"Deploy site"**

## 🔧 Méthode 2 : Déploiement via Netlify CLI

1. **Installer Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Se connecter à Netlify**
   ```bash
   netlify login
   ```

3. **Initialiser le site**
   ```bash
   netlify init
   ```
   - Choisissez "Create & configure a new site"
   - Suivez les instructions

4. **Configurer les variables d'environnement**
   ```bash
   netlify env:set UPSTASH_REDIS_REST_URL "https://allowing-crow-42956.upstash.io"
   netlify env:set UPSTASH_REDIS_REST_TOKEN "votre_token_ici"
   netlify env:set MAX_PAYLOAD_SIZE "100000"
   netlify env:set MAX_SECRETS "10000"
   netlify env:set NODE_ENV "production"
   ```

5. **Déployer**
   ```bash
   netlify deploy --prod
   ```

## ✅ Vérification après déploiement

1. **Tester la création d'un secret**
   - Accédez à votre site Netlify
   - Créez un secret de test
   - Vérifiez que le lien est généré

2. **Tester la lecture d'un secret**
   - Ouvrez le lien généré dans un nouvel onglet
   - Entrez la phrase de déchiffrement
   - Vérifiez que le secret s'affiche correctement

3. **Vérifier les logs**
   - Dans Netlify Dashboard > **"Functions"**
   - Vérifiez les logs pour confirmer la connexion Redis
   - Vous devriez voir : `✅ Upstash Redis connecté`

## 🔒 Sécurité et configuration

### Upstash Redis

- ✅ **Stockage persistant** : Les secrets sont stockés dans Redis
- ✅ **Expiration automatique** : Redis gère automatiquement l'expiration
- ✅ **Partagé entre fonctions** : Toutes les fonctions Netlify partagent le même stockage
- ✅ **Gratuit** : Jusqu'à 10 000 requêtes par jour

### Configuration recommandée pour la production

1. **HTTPS** : Activé automatiquement par Netlify ✅
2. **CDN** : Activé automatiquement par Netlify ✅
3. **Custom Domain** : Configurez votre domaine dans les paramètres Netlify
4. **Rate Limiting** : Configuré dans les fonctions Netlify ✅
5. **Redis** : Configuré avec Upstash ✅

## 🐛 Dépannage

### Les secrets ne sont pas partagés entre création et lecture

- Vérifiez que les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` sont bien configurées
- Vérifiez les logs dans Netlify Functions pour voir si Redis est connecté
- Redéployez le site après avoir ajouté les variables d'environnement

### Erreur "Redis non configuré"

- Vérifiez que les variables d'environnement sont correctement nommées :
  - `UPSTASH_REDIS_REST_URL` (pas `NETLIFY_REDIS_URL`)
  - `UPSTASH_REDIS_REST_TOKEN` (pas `NETLIFY_REDIS_TOKEN`)

### Erreur de connexion Redis

- Vérifiez que l'URL et le token sont corrects
- Vérifiez que votre base Redis est active sur Upstash
- Vérifiez que vous n'avez pas dépassé la limite gratuite (10K requêtes/jour)

## 📊 Monitoring

- **Netlify Dashboard** : Consultez les logs des fonctions
- **Upstash Dashboard** : Surveillez l'utilisation de Redis
- **Netlify Analytics** : Suivez les visites et performances

## 🎉 C'est prêt !

Votre application est maintenant déployée sur Netlify avec un stockage Redis persistant et partagé. Vos clients peuvent utiliser l'application en toute sécurité !

## 📚 Ressources

- [Documentation Netlify](https://docs.netlify.com/)
- [Documentation Upstash Redis](https://docs.upstash.com/redis)
- [Guide Upstash pour Netlify](https://docs.upstash.com/redis/tutorials/netlify)
