'use strict';

// Helpers UI
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

function b64uEncode(bytes) {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64uDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  str += '='.repeat(pad);
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function utf8Encode(s){ return new TextEncoder().encode(s); }
function utf8Decode(b){ return new TextDecoder().decode(b); }

async function deriveKey(passphrase, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8Encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 200000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}

async function encryptSecret(secretText, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    utf8Encode(secretText)
  );
  const ct = new Uint8Array(ctBuf);
  return {
    v: 1,
    ct: b64uEncode(ct),
    iv: b64uEncode(iv),
    salt: b64uEncode(salt),
  };
}

async function decryptSecret(payload, passphrase) {
  const salt = b64uDecode(payload.salt);
  const iv = b64uDecode(payload.iv);
  const ct = b64uDecode(payload.ct);
  const key = await deriveKey(passphrase, salt);
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  );
  return utf8Decode(new Uint8Array(ptBuf));
}

// Tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('tab--active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('panel--active'));
    btn.classList.add('tab--active');
    document.getElementById(btn.dataset.tab).classList.add('panel--active');
  });
});

// Create
$('btnCreate').addEventListener('click', async () => {
  hide($('errCreate'));
  hide($('out'));

  const secret = $('secret').value || '';
  const pass = $('pass').value || '';
  const ttl = $('ttl').value;

  if (secret.trim().length < 1) {
    $('errCreate').textContent = 'Veuillez saisir un secret.';
    show($('errCreate'));
    return;
  }
  if (pass.length < 8) {
    $('errCreate').textContent = 'Phrase trop courte (minimum 8 caractères).';
    show($('errCreate'));
    return;
  }

  try {
    $('btnCreate').disabled = true;
    $('btnCreate').textContent = 'Chiffrement en cours...';
    
    const payload = await encryptSecret(secret, pass);
    
    // Timeout pour la requête (30 secondes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const r = await fetch('/api/secret', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ ttl, payload, burnAfterRead: true }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const j = await r.json();
    if (!r.ok) {
      const errorMsg = j.error || 'Erreur inconnue';
      throw new Error(errorMsg);
    }

    const link = `${location.origin}/#id=${encodeURIComponent(j.id)}`;
    window.generatedLink = link;
    $('link').value = link;
    show($('out'));
  } catch (e) {
    let errorMessage = 'Erreur: impossible de créer le lien.';
    
    if (e.name === 'AbortError') {
      errorMessage = 'Erreur: la requête a pris trop de temps. Vérifiez votre connexion.';
    } else if (e.message.includes('Trop de requêtes')) {
      errorMessage = 'Trop de requêtes. Veuillez patienter quelques minutes avant de réessayer.';
    } else if (e.message.includes('trop volumineux')) {
      errorMessage = 'Le secret est trop volumineux. Réduisez sa taille.';
    } else if (e.message) {
      errorMessage = `Erreur: ${e.message}`;
    }
    
    $('errCreate').textContent = errorMessage;
    show($('errCreate'));
  } finally {
    $('btnCreate').disabled = false;
    $('btnCreate').textContent = 'Créer un lien';
  }
});

$('btnCopy').addEventListener('click', async () => {
  await navigator.clipboard.writeText(window.generatedLink);
});

// Read
function getIdFromHash() {
  const h = (location.hash || '').replace(/^#/, '');
  const params = new URLSearchParams(h);
  return params.get('id');
}

$('btnRead').addEventListener('click', async () => {
  hide($('errRead'));
  hide($('plainWrap'));

  const id = getIdFromHash();
  const pass = $('passRead').value || '';

  if (!id) {
    $('errRead').textContent = 'Aucun identifiant dans le lien (#id=...). Ouvrez le lien reçu.';
    show($('errRead'));
    return;
  }
  if (pass.length < 8) {
    $('errRead').textContent = 'Phrase trop courte (minimum 8 caractères).';
    show($('errRead'));
    return;
  }

  try {
    $('btnRead').disabled = true;
    $('btnRead').textContent = 'Déchiffrement...';
    
    // Timeout pour la requête (30 secondes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const url = `/api/secret/${encodeURIComponent(id)}`;
    console.log('Requête vers:', url);
    
    const r = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!r.ok) {
      const errorText = await r.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`Erreur HTTP ${r.status}: ${errorText}`);
      }
      
      if (errorData.error === 'not_found') throw new Error('not_found');
      throw new Error(errorData.error || 'error');
    }
    
    const j = await r.json();
    const plain = await decryptSecret(j.payload, pass);
    $('plain').value = plain;
    show($('plainWrap'));
  } catch (e) {
    let errorMessage = 'Impossible de déchiffrer (phrase incorrecte ?).';
    
    if (e.name === 'AbortError') {
      errorMessage = 'Erreur: la requête a pris trop de temps. Vérifiez votre connexion.';
    } else if (e.message === 'not_found') {
      errorMessage = 'Secret introuvable ou déjà détruit.';
    } else if (e.message.includes('Trop de requêtes')) {
      errorMessage = 'Trop de requêtes. Veuillez patienter quelques minutes avant de réessayer.';
    } else if (e.message) {
      errorMessage = `Erreur: ${e.message}`;
    }
    
    $('errRead').textContent = errorMessage;
    show($('errRead'));
  } finally {
    $('btnRead').disabled = false;
    $('btnRead').textContent = 'Lire';
  }
});

$('btnCopyPlain').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('plain').value);
});

// Auto: si un id est présent, basculer sur l'onglet Lire
window.addEventListener('load', () => {
  const id = getIdFromHash();
  if (id) {
    document.querySelector('[data-tab="read"]').click();
  }
});
