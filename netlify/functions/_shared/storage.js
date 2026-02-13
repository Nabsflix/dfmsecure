// Système de stockage partagé pour Netlify Functions avec Upstash Redis
const { Redis } = require('@upstash/redis');

let redis = null;
let fallbackStorage = new Map(); // Fallback en mémoire si Redis n'est pas configuré
let initialized = false;

// Initialiser le client Redis
async function initStorage() {
  if (initialized) return;
  
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (redisUrl && redisToken) {
    try {
      redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      console.log('✅ Upstash Redis connecté');
    } catch (error) {
      console.error('❌ Erreur de connexion Redis:', error);
      console.log('⚠️  Utilisation du stockage mémoire en fallback');
    }
  } else {
    console.log('⚠️  Redis non configuré - utilisation du stockage mémoire');
  }
  
  initialized = true;
}

async function getSecret(id) {
  await initStorage();
  
  if (redis) {
    try {
      const data = await redis.get(`secret:${id}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erreur Redis getSecret:', error);
      // Fallback sur mémoire
      return fallbackStorage.get(id) || null;
    }
  }
  
  return fallbackStorage.get(id) || null;
}

async function setSecret(id, data) {
  await initStorage();
  
  if (redis) {
    try {
      // Stocker avec expiration automatique si expiresAt est défini
      const expiresIn = data.expiresAt ? Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)) : null;
      
      if (expiresIn && expiresIn > 0) {
        await redis.setex(`secret:${id}`, expiresIn, JSON.stringify(data));
      } else {
        await redis.set(`secret:${id}`, JSON.stringify(data));
      }
      return;
    } catch (error) {
      console.error('Erreur Redis setSecret:', error);
      // Fallback sur mémoire
    }
  }
  
  fallbackStorage.set(id, data);
}

async function deleteSecret(id) {
  await initStorage();
  
  if (redis) {
    try {
      await redis.del(`secret:${id}`);
      return;
    } catch (error) {
      console.error('Erreur Redis deleteSecret:', error);
      // Fallback sur mémoire
    }
  }
  
  fallbackStorage.delete(id);
}

async function getAllSecrets() {
  await initStorage();
  
  if (redis) {
    try {
      // Récupérer toutes les clés commençant par "secret:"
      const keys = await redis.keys('secret:*');
      const result = new Map();
      
      if (keys && keys.length > 0) {
        const values = await redis.mget(...keys);
        keys.forEach((key, index) => {
          if (values[index]) {
            const id = key.replace('secret:', '');
            result.set(id, JSON.parse(values[index]));
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erreur Redis getAllSecrets:', error);
      // Fallback sur mémoire
      return fallbackStorage;
    }
  }
  
  return fallbackStorage;
}

async function cleanupExpired() {
  await initStorage();
  
  if (redis) {
    try {
      // Redis gère automatiquement l'expiration avec setex
      // Mais on peut nettoyer manuellement si nécessaire
      const keys = await redis.keys('secret:*');
      let cleaned = 0;
      
      if (keys && keys.length > 0) {
        const values = await redis.mget(...keys);
        const now = Date.now();
        
        for (let i = 0; i < keys.length; i++) {
          if (values[i]) {
            const data = JSON.parse(values[i]);
            if (data.expiresAt && data.expiresAt < now) {
              await redis.del(keys[i]);
              cleaned++;
            }
          }
        }
      }
      
      return cleaned;
    } catch (error) {
      console.error('Erreur Redis cleanupExpired:', error);
      // Fallback sur mémoire
    }
  }
  
  // Nettoyage mémoire
  const now = Date.now();
  let cleaned = 0;
  for (const [id, data] of fallbackStorage.entries()) {
    if (data.expiresAt && data.expiresAt < now) {
      fallbackStorage.delete(id);
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
