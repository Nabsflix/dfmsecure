// Système de stockage partagé pour Netlify Functions
// Utilise un stockage en mémoire avec synchronisation optionnelle via Upstash Redis

let secrets = new Map();
let initialized = false;

// Pour utiliser Upstash Redis (recommandé pour la production)
// Décommentez et configurez les variables d'environnement NETLIFY_REDIS_URL
async function initStorage() {
  if (initialized) return;
  
  // Option 1: Utiliser Upstash Redis (recommandé)
  if (process.env.NETLIFY_REDIS_URL) {
    try {
      // Implémentation Redis serait ici
      // Pour l'instant, on utilise le stockage mémoire
      console.log('Redis configuré mais non implémenté - utilisation du stockage mémoire');
    } catch (error) {
      console.error('Erreur Redis:', error);
    }
  }
  
  initialized = true;
}

async function getSecret(id) {
  await initStorage();
  return secrets.get(id);
}

async function setSecret(id, data) {
  await initStorage();
  secrets.set(id, data);
}

async function deleteSecret(id) {
  await initStorage();
  secrets.delete(id);
}

async function getAllSecrets() {
  await initStorage();
  return secrets;
}

async function cleanupExpired() {
  await initStorage();
  const now = Date.now();
  let cleaned = 0;
  for (const [id, data] of secrets.entries()) {
    if (data.expiresAt && data.expiresAt < now) {
      secrets.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}

module.exports = {
  getSecret,
  setSecret,
  deleteSecret,
  getAllSecrets,
  cleanupExpired,
};
