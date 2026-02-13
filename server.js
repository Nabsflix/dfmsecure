require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_PAYLOAD_SIZE = parseInt(process.env.MAX_PAYLOAD_SIZE) || 100000; // 100KB par défaut
const MAX_SECRETS = parseInt(process.env.MAX_SECRETS) || 10000; // Limite de secrets en mémoire

// Sécurité avec Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting pour protéger contre les abus
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requêtes par IP toutes les 15 minutes
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Plus de requêtes pour la lecture
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});

// Middleware
app.use(express.json({ limit: '200kb' })); // Limite la taille du body
app.use(express.static(path.join(__dirname)));

// Logging des requêtes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Stockage en mémoire avec limite
const secrets = new Map();
let secretCount = 0;

// Statistiques
const stats = {
  created: 0,
  read: 0,
  expired: 0,
  burned: 0,
  errors: 0,
};

// Nettoyage automatique des secrets expirés
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, data] of secrets.entries()) {
    if (data.expiresAt && data.expiresAt < now) {
      secrets.delete(id);
      secretCount--;
      cleaned++;
      stats.expired++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Nettoyage: ${cleaned} secret(s) expiré(s) supprimé(s)`);
  }
}, 60000); // Vérifie toutes les minutes

// Générer un ID unique
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Validation du payload
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload invalide' };
  }
  
  const requiredFields = ['v', 'ct', 'iv', 'salt'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return { valid: false, error: `Champ manquant: ${field}` };
    }
  }
  
  // Vérifier la taille totale du payload
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    return { valid: false, error: `Payload trop volumineux (max: ${MAX_PAYLOAD_SIZE} bytes)` };
  }
  
  return { valid: true };
}

// POST /api/secret - Créer un secret
app.post('/api/secret', createLimiter, (req, res) => {
  try {
    const { ttl, payload, burnAfterRead } = req.body;

    // Validation des champs requis
    if (!payload || !ttl) {
      stats.errors++;
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Validation du payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      stats.errors++;
      return res.status(400).json({ error: validation.error });
    }

    // Vérifier la limite de secrets
    if (secretCount >= MAX_SECRETS) {
      stats.errors++;
      return res.status(503).json({ error: 'Service temporairement indisponible. Réessayez plus tard.' });
    }

    // Validation du TTL
    const ttlNum = parseInt(ttl);
    const validTTLs = [1800, 3600, 86400, 604800]; // 30min, 1h, 1j, 1 semaine
    if (!validTTLs.includes(ttlNum)) {
      stats.errors++;
      return res.status(400).json({ error: 'TTL invalide' });
    }

    const id = generateId();
    const expiresAt = Date.now() + (ttlNum * 1000);

    secrets.set(id, {
      payload,
      expiresAt,
      burnAfterRead: burnAfterRead === true,
      createdAt: Date.now(),
      ip: req.ip,
    });

    secretCount++;
    stats.created++;

    console.log(`✅ Secret créé: ${id.substring(0, 8)}... (TTL: ${ttlNum}s)`);

    res.json({ id });
  } catch (error) {
    stats.errors++;
    console.error('❌ Erreur lors de la création du secret:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/secret/:id - Récupérer un secret
app.get('/api/secret/:id', readLimiter, (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!id || id.length !== 32 || !/^[a-f0-9]+$/.test(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const secret = secrets.get(id);

    if (!secret) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Vérifier l'expiration
    if (secret.expiresAt && secret.expiresAt < Date.now()) {
      secrets.delete(id);
      secretCount--;
      stats.expired++;
      return res.status(404).json({ error: 'not_found' });
    }

    const response = { payload: secret.payload };

    // Si burnAfterRead est activé, supprimer immédiatement
    if (secret.burnAfterRead) {
      secrets.delete(id);
      secretCount--;
      stats.burned++;
      console.log(`🔥 Secret détruit après lecture: ${id.substring(0, 8)}...`);
    } else {
      stats.read++;
    }

    res.json(response);
  } catch (error) {
    stats.errors++;
    console.error('❌ Erreur lors de la récupération du secret:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/stats - Statistiques (optionnel, peut être désactivé en production)
app.get('/api/stats', (req, res) => {
  if (process.env.SHOW_STATS !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    ...stats,
    activeSecrets: secretCount,
    maxSecrets: MAX_SECRETS,
  });
});

// Route pour servir index.html sur toutes les routes non-API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Secure démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📝 Accédez à l'application: http://localhost:${PORT}`);
  console.log(`⚙️  Configuration: MAX_PAYLOAD=${MAX_PAYLOAD_SIZE}B, MAX_SECRETS=${MAX_SECRETS}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🔒 Mode production activé`);
  }
});
