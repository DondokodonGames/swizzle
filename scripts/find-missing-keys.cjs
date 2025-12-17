#!/usr/bin/env node

/**
 * Find missing translation keys
 * Compares keys used in source code with keys defined in translation files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all keys from nested object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Load English translation files
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en');
const files = ['common', 'auth', 'editor', 'gameLogic', 'social', 'monetization', 'game'];
let en = {};
for (const file of files) {
  const filePath = path.join(localesDir, `${file}.json`);
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    en = { ...en, ...content };
  }
}
const definedKeys = new Set(getAllKeys(en));

// Extract used keys from source code
const srcDir = path.join(__dirname, '..', 'src');

// Search for t('key') or t("key") patterns
let result = '';
try {
  result = execSync(
    `grep -r -h -o "t(['\"][^'\"]*['\"]" "${srcDir}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
} catch (e) {
  console.error('Error searching source files:', e.message);
}

const usedKeys = new Set();
const lines = result.split('\n');
for (const line of lines) {
  const match = line.match(/t\(['"]([^'"]+)['"]/);
  if (match) {
    usedKeys.add(match[1]);
  }
}

console.log('='.repeat(60));
console.log('Translation Key Analysis');
console.log('='.repeat(60));
console.log('');
console.log('Used keys in code:', usedKeys.size);
console.log('Defined keys in en:', definedKeys.size);
console.log('');

// Find keys used but not defined
const missingKeys = [];
for (const key of usedKeys) {
  if (!definedKeys.has(key)) {
    // Exclude dynamic keys (containing template literals or ending with .)
    if (!key.includes('$') && !key.endsWith('.') && !key.includes('{')) {
      missingKeys.push(key);
    }
  }
}

console.log('-'.repeat(60));
console.log('MISSING KEYS (used in code but not in translation files):');
console.log('-'.repeat(60));

if (missingKeys.length === 0) {
  console.log('  (none)');
} else {
  // Group by prefix
  const grouped = {};
  for (const key of missingKeys.sort()) {
    const prefix = key.split('.')[0];
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(key);
  }

  for (const prefix of Object.keys(grouped).sort()) {
    console.log(`\n  [${prefix}]`);
    grouped[prefix].forEach(key => console.log(`    - ${key}`));
  }
}

console.log('');
console.log('='.repeat(60));
console.log('Total missing keys:', missingKeys.length);
console.log('='.repeat(60));

// Output as JSON for easier processing
if (missingKeys.length > 0) {
  fs.writeFileSync(
    path.join(__dirname, 'missing-keys.json'),
    JSON.stringify(missingKeys.sort(), null, 2)
  );
  console.log('\nMissing keys saved to: scripts/missing-keys.json');
}
