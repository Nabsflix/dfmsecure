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
  
  console.log('🔍 Initialisation du stockage...');
  console.log('Redis URL configurée:', redisUrl ? 'Oui' : 'Non');
  console.log('Redis Token configuré:', redisToken ? 'Oui' : 'Non');
  
  if (redisUrl && redisToken) {
    try {
      redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      // Test de connexion
      await redis.ping();
      console.log('✅ Upstash Redis connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur de connexion Redis:', error.message);
      console.log('⚠️  Utilisation du stockage mémoire en fallback');
      redis = null;
    }
  } else {
    console.log('⚠️  Redis non configuré - utilisation du stockage mémoire');
    console.log('💡 Configurez UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN dans Netlify');
  }
  
  initialized = true;
}

async function getSecret(id) {
  await initStorage();
  
  const key = `secret:${id}`;
  console.log(`🔍 Recherche du secret avec la clé: ${key}`);
  
  if (redis) {
    try {
      const data = await redis.get(key);
      console.log(`📦 Données Redis récupérées:`, data ? 'Trouvé' : 'Non trouvé');
      
      if (data) {
        // Si c'est déjà un objet, le retourner tel quel
        if (typeof data === 'object') {
          console.log('✅ Secret trouvé dans Redis (format objet)');
          return data;
        }
        // Sinon, parser le JSON
        if (typeof data === 'string') {
          const parsed = JSON.parse(data);
          console.log('✅ Secret trouvé dans Redis (format JSON)');
          return parsed;
        }
      }
      
      console.log('❌ Secret non trouvé dans Redis');
      return null;
    } catch (error) {
      console.error('❌ Erreur Redis getSecret:', error.message);
      console.error('Stack:', error.stack);
      // Fallback sur mémoire
      const fallback = fallbackStorage.get(id);
      console.log('🔄 Fallback mémoire:', fallback ? 'Trouvé' : 'Non trouvé');
      return fallback || null;
    }
  }
  
  const fallback = fallbackStorage.get(id);
  console.log('💾 Stockage mémoire:', fallback ? 'Trouvé' : 'Non trouvé');
  return fallback || null;
}

async function setSecret(id, data) {
  await initStorage();
  
  const key = `secret:${id}`;
  console.log(`💾 Stockage du secret avec la clé: ${key}`);
  console.log(`📊 Données à stocker:`, {
    hasPayload: !!data.payload,
    expiresAt: data.expiresAt,
    burnAfterRead: data.burnAfterRead
  });
  
  if (redis) {
    try {
      // Stocker avec expiration automatique si expiresAt est défini
      const expiresIn = data.expiresAt ? Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)) : null;
      
      const dataString = JSON.stringify(data);
      console.log(`⏱️  Expiration dans ${expiresIn} secondes`);
      
      if (expiresIn && expiresIn > 0) {
        await redis.setex(key, expiresIn, dataString);
        console.log('✅ Secret stocké dans Redis avec expiration');
      } else {
        await redis.set(key, dataString);
        console.log('✅ Secret stocké dans Redis sans expiration');
      }
      
      // Vérifier que le stockage a fonctionné
      const verify = await redis.get(key);
      if (verify) {
        console.log('✅ Vérification: Secret bien stocké dans Redis');
      } else {
        console.error('❌ Vérification échouée: Secret non trouvé après stockage');
      }
      
      return;
    } catch (error) {
      console.error('❌ Erreur Redis setSecret:', error.message);
      console.error('Stack:', error.stack);
      // Fallback sur mémoire
      console.log('🔄 Fallback sur stockage mémoire');
    }
  }
  
  fallbackStorage.set(id, data);
  console.log('💾 Secret stocké en mémoire (fallback)');
}

async function deleteSecret(id) {
  await initStorage();
  
  const key = `secret:${id}`;
  console.log(`🗑️  Suppression du secret avec la clé: ${key}`);
  
  if (redis) {
    try {
      await redis.del(key);
      console.log('✅ Secret supprimé de Redis');
      return;
    } catch (error) {
      console.error('❌ Erreur Redis deleteSecret:', error.message);
      // Fallback sur mémoire
    }
  }
  
  fallbackStorage.delete(id);
  console.log('💾 Secret supprimé de la mémoire (fallback)');
}

async function getAllSecrets() {
  await initStorage();
  
  if (redis) {
    try {
      // Récupérer toutes les clés commençant par "secret:"
      const keys = await redis.keys('secret:*');
      console.log(`📋 Nombre de secrets dans Redis: ${keys ? keys.length : 0}`);
      
      const result = new Map();
      
      if (keys && keys.length > 0) {
        const values = await redis.mget(...keys);
        keys.forEach((key, index) => {
          if (values[index]) {
            const id = key.replace('secret:', '');
            try {
              const data = typeof values[index] === 'string' 
                ? JSON.parse(values[index]) 
                : values[index];
              result.set(id, data);
            } catch (e) {
              console.error(`Erreur parsing pour ${key}:`, e.message);
            }
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur Redis getAllSecrets:', error.message);
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
            try {
              const data = typeof values[i] === 'string' 
                ? JSON.parse(values[i]) 
                : values[i];
              if (data.expiresAt && data.expiresAt < now) {
                await redis.del(keys[i]);
                cleaned++;
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 ${cleaned} secret(s) expiré(s) nettoyé(s)`);
      }
      
      return cleaned;
    } catch (error) {
      console.error('❌ Erreur Redis cleanupExpired:', error.message);
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
