const { getSecret, deleteSecret, cleanupExpired } = require('./_shared/storage');

exports.handler = async (event, context) => {
  await cleanupExpired();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  try {
    // Extraire l'ID de l'URL
    const pathParts = event.path.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id || id.length !== 32 || !/^[a-f0-9]+$/.test(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID invalide' }),
      };
    }

    const secret = await getSecret(id);

    if (!secret) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'not_found' }),
      };
    }

    if (secret.expiresAt && secret.expiresAt < Date.now()) {
      await deleteSecret(id);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'not_found' }),
      };
    }

    const response = { payload: secret.payload };

    if (secret.burnAfterRead) {
      await deleteSecret(id);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
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
