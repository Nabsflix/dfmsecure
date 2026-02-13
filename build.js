#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔨 Build de l\'application Secure...\n');

// Vérifier les fichiers essentiels
const requiredFiles = [
  'index.html',
  'app.js',
  'styles.css',
  'server.js',
  'package.json',
  'assets/logo.png'
];

let hasErrors = false;

console.log('📋 Vérification des fichiers...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MANQUANT`);
    hasErrors = true;
  }
});

// Vérifier node_modules
console.log('\n📦 Vérification des dépendances...');
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('  ✅ node_modules existe');
  
  // Vérifier les dépendances critiques
  const criticalDeps = ['express', 'express-rate-limit', 'helmet', 'dotenv'];
  criticalDeps.forEach(dep => {
    const depPath = path.join(__dirname, 'node_modules', dep);
    if (fs.existsSync(depPath)) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ⚠️  ${dep} - Non installé`);
      hasErrors = true;
    }
  });
} else {
  console.log('  ⚠️  node_modules n\'existe pas - Exécutez "npm install"');
  hasErrors = true;
}

// Vérifier .env.example
console.log('\n⚙️  Vérification de la configuration...');
if (fs.existsSync(path.join(__dirname, '.env.example'))) {
  console.log('  ✅ .env.example existe');
  
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('  ℹ️  .env n\'existe pas (normal si pas encore configuré)');
  } else {
    console.log('  ✅ .env existe');
  }
} else {
  console.log('  ⚠️  .env.example manquant');
  hasErrors = true;
}

// Vérifier la syntaxe des fichiers JS
console.log('\n🔍 Vérification de la syntaxe...');
try {
  require('./server.js');
  console.log('  ✅ server.js - Syntaxe valide');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('dotenv')) {
    console.log('  ⚠️  Dépendances manquantes - Exécutez "npm install"');
  } else {
    console.log(`  ❌ server.js - Erreur: ${error.message}`);
    hasErrors = true;
  }
}

// Résumé
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Build terminé avec des erreurs');
  console.log('💡 Exécutez "npm install" pour installer les dépendances manquantes');
  process.exit(1);
} else {
  console.log('✅ Build réussi !');
  console.log('🚀 L\'application est prête pour la production');
  console.log('💡 Exécutez "npm start" pour démarrer le serveur');
  process.exit(0);
}
