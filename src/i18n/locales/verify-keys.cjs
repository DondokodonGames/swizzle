const fs = require('fs');
const path = require('path');

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

const targetLang = process.argv[2] || 'it';
const files = ['common.json', 'auth.json', 'game.json', 'gameLogic.json', 'social.json', 'monetization.json', 'editor.json'];
let totalEnKeys = 0;
let totalTargetKeys = 0;
let allMatch = true;

files.forEach(file => {
  const enData = JSON.parse(fs.readFileSync(path.join(__dirname, 'en', file), 'utf8'));
  const targetData = JSON.parse(fs.readFileSync(path.join(__dirname, targetLang, file), 'utf8'));

  const enKeys = getAllKeys(enData).sort();
  const targetKeys = getAllKeys(targetData).sort();

  totalEnKeys += enKeys.length;
  totalTargetKeys += targetKeys.length;

  const missingInTarget = enKeys.filter(k => !targetKeys.includes(k));
  const extraInTarget = targetKeys.filter(k => !enKeys.includes(k));

  if (missingInTarget.length > 0 || extraInTarget.length > 0) {
    allMatch = false;
    console.log(`\n❌ ${file}: 不一致あり`);
    if (missingInTarget.length > 0) {
      console.log(`  ${targetLang}に不足: ${missingInTarget.length}キー`);
      missingInTarget.forEach(k => console.log(`    - ${k}`));
    }
    if (extraInTarget.length > 0) {
      console.log(`  ${targetLang}に余分: ${extraInTarget.length}キー`);
      extraInTarget.forEach(k => console.log(`    + ${k}`));
    }
  } else {
    console.log(`✅ ${file}: ${enKeys.length}キー一致`);
  }
});

console.log(`\n📊 合計: 英語 ${totalEnKeys}キー / ${targetLang} ${totalTargetKeys}キー`);
console.log(allMatch ? '🎉 全ファイル完全一致！' : '⚠️ 一部不一致があります');
