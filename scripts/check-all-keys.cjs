#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all keys from nested object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Load translation files
function loadLocale(lang) {
  const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
  const splitDir = path.join(localesDir, lang);

  if (fs.existsSync(splitDir) && fs.statSync(splitDir).isDirectory()) {
    const files = ['common', 'auth', 'editor', 'gameLogic', 'social', 'monetization', 'game'];
    let merged = {};
    for (const file of files) {
      const filePath = path.join(splitDir, file + '.json');
      if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        merged = { ...merged, ...content };
      }
    }
    return merged;
  }
  return {};
}

// Load used keys
const usedKeysFile = '/tmp/used_keys.txt';
const usedKeys = fs.readFileSync(usedKeysFile, 'utf8').trim().split('\n').filter(k => k.length > 0);

// Load EN keys
const en = loadLocale('en');
const enKeys = new Set(getAllKeys(en));

// Load JA keys
const ja = loadLocale('ja');
const jaKeys = new Set(getAllKeys(ja));

console.log('='.repeat(70));
console.log('  Translation Key Comprehensive Check');
console.log('='.repeat(70));
console.log('');
console.log('Total keys used in code:', usedKeys.length);
console.log('Total keys defined in EN:', enKeys.size);
console.log('Total keys defined in JA:', jaKeys.size);
console.log('');

// Find missing in EN
const missingInEn = usedKeys.filter(k => !enKeys.has(k));
console.log('-'.repeat(70));
console.log('Missing in EN (used in code but not in en/*.json):');
console.log('-'.repeat(70));
if (missingInEn.length === 0) {
  console.log('  (none)');
} else {
  missingInEn.forEach(k => console.log('  - ' + k));
}
console.log('Total:', missingInEn.length);
console.log('');

// Find missing in JA (that exist in EN)
const missingInJa = [];
for (const key of enKeys) {
  if (!jaKeys.has(key)) {
    missingInJa.push(key);
  }
}
console.log('-'.repeat(70));
console.log('Missing in JA (exists in EN but not in ja/*.json):');
console.log('-'.repeat(70));
if (missingInJa.length === 0) {
  console.log('  (none)');
} else {
  // Group by prefix
  const grouped = {};
  for (const key of missingInJa.sort()) {
    const parts = key.split('.');
    const prefix = parts.slice(0, 2).join('.');
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(key);
  }

  for (const prefix of Object.keys(grouped).sort()) {
    console.log('');
    console.log('  [' + prefix + '] (' + grouped[prefix].length + ' keys)');
    grouped[prefix].slice(0, 5).forEach(k => console.log('    - ' + k));
    if (grouped[prefix].length > 5) {
      console.log('    ... and ' + (grouped[prefix].length - 5) + ' more');
    }
  }
}
console.log('');
console.log('Total missing in JA:', missingInJa.length);
console.log('');

// Extra keys in JA (not in EN)
const extraInJa = [];
for (const key of jaKeys) {
  if (!enKeys.has(key)) {
    extraInJa.push(key);
  }
}
if (extraInJa.length > 0) {
  console.log('-'.repeat(70));
  console.log('Extra in JA (exists in JA but not in EN):');
  console.log('-'.repeat(70));
  extraInJa.forEach(k => console.log('  + ' + k));
  console.log('Total:', extraInJa.length);
  console.log('');
}

console.log('='.repeat(70));
if (missingInEn.length === 0 && missingInJa.length === 0) {
  console.log('  All keys are properly defined in both EN and JA!');
} else {
  console.log('  Summary: EN missing ' + missingInEn.length + ', JA missing ' + missingInJa.length);
}
console.log('='.repeat(70));
