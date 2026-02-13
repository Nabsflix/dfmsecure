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
    // Extraire l'ID de différentes façons selon le format de l'URL
    let id = null;
    
    // Méthode 1: Depuis pathParameters (si disponible)
    if (event.pathParameters && event.pathParameters.id) {
      id = event.pathParameters.id;
    }
    // Méthode 2: Depuis queryStringParameters
    else if (event.queryStringParameters && event.queryStringParameters.id) {
      id = event.queryStringParameters.id;
    }
    // Méthode 3: Depuis le path (fallback)
    else {
      const pathParts = event.path.split('/');
      // Chercher l'ID dans les parties du path
      // Il peut être à la fin ou avant "secret-get"
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const part = pathParts[i];
        // Un ID valide fait 32 caractères hexadécimaux
        if (part && part.length === 32 && /^[a-f0-9]+$/.test(part)) {
          id = part;
          break;
        }
      }
    }

    // Décoder l'ID si nécessaire (au cas où il serait encodé)
    if (id) {
      try {
        id = decodeURIComponent(id);
      } catch (e) {
        // Si le décodage échoue, utiliser l'ID tel quel
      }
    }

    // Validation de l'ID
    if (!id || id.length !== 32 || !/^[a-f0-9]+$/.test(id)) {
      console.error('ID invalide:', id, 'Path:', event.path);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID invalide' }),
      };
    }

    console.log('Recherche du secret avec ID:', id.substring(0, 8) + '...');

    const secret = await getSecret(id);

    if (!secret) {
      console.log('Secret non trouvé pour ID:', id.substring(0, 8) + '...');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'not_found' }),
      };
    }

    // Vérifier l'expiration
    if (secret.expiresAt && secret.expiresAt < Date.now()) {
      console.log('Secret expiré pour ID:', id.substring(0, 8) + '...');
      await deleteSecret(id);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'not_found' }),
      };
    }

    const response = { payload: secret.payload };

    // Si burnAfterRead est activé, supprimer immédiatement
    if (secret.burnAfterRead) {
      console.log('Secret détruit après lecture pour ID:', id.substring(0, 8) + '...');
      await deleteSecret(id);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    console.error('Event path:', event.path);
    console.error('Event pathParameters:', event.pathParameters);
    console.error('Event queryStringParameters:', event.queryStringParameters);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur' }),
    };
  }
};
