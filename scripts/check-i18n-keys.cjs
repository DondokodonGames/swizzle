#!/usr/bin/env node

/**
 * i18n Key Consistency Checker
 *
 * This script compares translation keys between languages to ensure consistency.
 * It identifies missing keys and helps maintain translation completeness.
 *
 * Usage:
 *   node scripts/check-i18n-keys.js [--verbose]
 *
 * Options:
 *   --verbose  Show all missing keys (default: summary only)
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const verbose = process.argv.includes('--verbose');

// Helper to get all keys from nested object
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

// Load locale files
function loadLocale(lang) {
  const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

  // Check if it's a split structure (en/ja) or legacy single file
  const splitDir = path.join(localesDir, lang);
  const legacyFile = path.join(localesDir, `${lang}.json`);

  if (fs.existsSync(splitDir) && fs.statSync(splitDir).isDirectory()) {
    // Load split structure
    const files = ['common', 'auth', 'editor', 'gameLogic', 'social', 'monetization', 'game'];
    let merged = {};
    for (const file of files) {
      const filePath = path.join(splitDir, `${file}.json`);
      if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        merged = { ...merged, ...content };
      }
    }
    return merged;
  } else if (fs.existsSync(legacyFile)) {
    // Load legacy single file
    return JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
  }

  throw new Error(`Locale not found: ${lang}`);
}

// Compare two locales
function compareLocales(baseLang, targetLang) {
  const base = loadLocale(baseLang);
  const target = loadLocale(targetLang);

  const baseKeys = getAllKeys(base);
  const targetKeys = getAllKeys(target);

  const missingInTarget = baseKeys.filter((k) => !targetKeys.includes(k));
  const extraInTarget = targetKeys.filter((k) => !baseKeys.includes(k));

  return { missingInTarget, extraInTarget };
}

// Main execution
console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}         Swizzle i18n Key Consistency Checker${colors.reset}`);
console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

const languages = ['en', 'ja', 'fr', 'de', 'es', 'it', 'zh', 'ko', 'pt'];
const baseLang = 'en';

let hasErrors = false;

for (const lang of languages) {
  if (lang === baseLang) continue;

  try {
    const { missingInTarget, extraInTarget } = compareLocales(baseLang, lang);

    console.log(`${colors.blue}────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.blue}  ${lang.toUpperCase()} vs ${baseLang.toUpperCase()} (base)${colors.reset}`);
    console.log(`${colors.blue}────────────────────────────────────────────${colors.reset}`);

    if (missingInTarget.length === 0 && extraInTarget.length === 0) {
      console.log(`  ${colors.green}✓ All keys match!${colors.reset}\n`);
    } else {
      hasErrors = true;

      if (missingInTarget.length > 0) {
        console.log(`  ${colors.red}✗ Missing ${missingInTarget.length} keys in ${lang}${colors.reset}`);
        if (verbose) {
          missingInTarget.slice(0, 20).forEach((key) => {
            console.log(`    ${colors.yellow}- ${key}${colors.reset}`);
          });
          if (missingInTarget.length > 20) {
            console.log(`    ${colors.yellow}... and ${missingInTarget.length - 20} more${colors.reset}`);
          }
        }
      }

      if (extraInTarget.length > 0) {
        console.log(`  ${colors.yellow}⚠ Extra ${extraInTarget.length} keys in ${lang} (not in ${baseLang})${colors.reset}`);
        if (verbose) {
          extraInTarget.slice(0, 10).forEach((key) => {
            console.log(`    ${colors.cyan}+ ${key}${colors.reset}`);
          });
          if (extraInTarget.length > 10) {
            console.log(`    ${colors.cyan}... and ${extraInTarget.length - 10} more${colors.reset}`);
          }
        }
      }
      console.log('');
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error loading ${lang}: ${error.message}${colors.reset}\n`);
    hasErrors = true;
  }
}

console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);

if (hasErrors) {
  console.log(`${colors.yellow}⚠ Some languages have missing or extra keys.${colors.reset}`);
  console.log(`${colors.yellow}  Run with --verbose to see details.${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  process.exit(1);
} else {
  console.log(`${colors.green}✓ All languages have consistent keys!${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  process.exit(0);
}
