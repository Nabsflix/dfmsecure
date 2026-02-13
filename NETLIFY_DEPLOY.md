# Déploiement sur Netlify 🚀

Guide pour déployer l'application Secure sur Netlify.

## Méthode 1 : Déploiement via l'interface Netlify (Recommandé)

1. **Connecter votre dépôt GitHub**
   - Allez sur [netlify.com](https://www.netlify.com)
   - Cliquez sur "Add new site" > "Import an existing project"
   - Connectez votre compte GitHub
   - Sélectionnez le dépôt `dfmsecure`

2. **Configuration du build**
   - **Build command** : `npm run build`
   - **Publish directory** : `.` (racine du projet)
   - Cliquez sur "Deploy site"

3. **Variables d'environnement** (optionnel)
   - Allez dans "Site settings" > "Environment variables"
   - Ajoutez si nécessaire :
     - `MAX_PAYLOAD_SIZE` = `100000`
     - `MAX_SECRETS` = `10000`
     - `NODE_ENV` = `production`

## Méthode 2 : Déploiement via Netlify CLI

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

4. **Déployer**
   ```bash
   netlify deploy --prod
   ```

## ⚠️ Limitations importantes

### Stockage en mémoire
Les fonctions Netlify sont **stateless** et chaque fonction a sa propre instance. Le stockage en mémoire ne sera **pas partagé** entre les fonctions de création et de lecture.

### Solutions recommandées

#### Option 1 : Upstash Redis (Gratuit jusqu'à 10K requêtes/jour)
1. Créez un compte sur [upstash.com](https://upstash.com)
2. Créez une base Redis
3. Ajoutez la variable d'environnement `NETLIFY_REDIS_URL` dans Netlify
4. Modifiez `netlify/functions/_shared/storage.js` pour utiliser Redis

#### Option 2 : Utiliser un autre backend
Pour un usage professionnel avec vos clients, considérez :
- Déployer le serveur Express sur Railway, Render, ou Fly.io
- Utiliser Vercel avec des Serverless Functions
- Utiliser AWS Lambda avec DynamoDB

## Configuration recommandée pour la production

1. **HTTPS** : Activé automatiquement par Netlify
2. **CDN** : Activé automatiquement par Netlify
3. **Custom Domain** : Configurez votre domaine dans les paramètres Netlify
4. **Rate Limiting** : Configuré dans les fonctions Netlify

## Vérification après déploiement

1. Testez la création d'un secret
2. Testez la lecture d'un secret
3. Vérifiez les logs dans Netlify Dashboard > Functions

## Support

Pour toute question, consultez la [documentation Netlify](https://docs.netlify.com/).
