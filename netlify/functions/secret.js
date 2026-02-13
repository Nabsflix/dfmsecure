const crypto = require('crypto');
const { setSecret, cleanupExpired, getAllSecrets } = require('./_shared/storage');

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

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
  
  const payloadSize = JSON.stringify(payload).length;
  const MAX_PAYLOAD_SIZE = parseInt(process.env.MAX_PAYLOAD_SIZE) || 100000;
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    return { valid: false, error: `Payload trop volumineux (max: ${MAX_PAYLOAD_SIZE} bytes)` };
  }
  
  return { valid: true };
}

exports.handler = async (event, context) => {
  await cleanupExpired();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { ttl, payload, burnAfterRead } = body;

    if (!payload || !ttl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Champs requis manquants' }),
      };
    }

    const validation = validatePayload(payload);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validation.error }),
      };
    }

    const ttlNum = parseInt(ttl);
    const validTTLs = [3600, 86400, 604800];
    if (!validTTLs.includes(ttlNum)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'TTL invalide' }),
      };
    }

    const secrets = await getAllSecrets();
    const MAX_SECRETS = parseInt(process.env.MAX_SECRETS) || 10000;
    if (secrets.size >= MAX_SECRETS) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Service temporairement indisponible. Réessayez plus tard.' }),
      };
    }

    const id = generateId();
    const expiresAt = Date.now() + (ttlNum * 1000);

    await setSecret(id, {
      payload,
      expiresAt,
      burnAfterRead: burnAfterRead === true,
      createdAt: Date.now(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id }),
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur' }),
    };
  }
};
