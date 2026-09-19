/**
 * check-game.ts — 1本の .js を validator v3 + scorer v2 で検査する開発用ヘルパー。
 * バッチ制作中に「この1本、通るか」を素早く確認するためのもの(games:ledger は全数再構築で重い)。
 *
 * 使い方: npx tsx scripts/check-game.ts <path-to-game.js> [--v3off]
 */
import * as fs from 'fs';
import { CodeGameValidator } from '../src/ai/code/CodeGameValidator.js';
import { CodeQualityScorer } from '../src/ai/code/CodeQualityScorer.js';

const file = process.argv[2];
const v3 = !process.argv.includes('--v3off');
if (!file) {
  console.error('使い方: npx tsx scripts/check-game.ts <path-to-game.js>');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`ファイルが見つかりません: ${file}`);
  process.exit(1);
}

const code = fs.readFileSync(file, 'utf-8');
const validation = new CodeGameValidator().validate(code, { v3 });
const quality = new CodeQualityScorer().score(code, null, validation);

console.log(`\n${file}`);
console.log(`valid: ${validation.valid}`);
if (validation.errors.length) {
  console.log('ERRORS:');
  validation.errors.forEach((e) => console.log(`  [${e.code}] ${e.message}`));
}
if (validation.warnings.length) {
  console.log('WARNINGS:');
  validation.warnings.forEach((w) => console.log(`  [${w.code}] ${w.message}`));
}
console.log(`score: ${quality.total}/100`);
console.log(`breakdown: ${JSON.stringify(quality.breakdown)}`);
if (quality.hints?.length) console.log('hints:\n  ' + quality.hints.join('\n  '));

const pass = validation.valid && validation.errors.length === 0 && quality.total >= 80;
console.log(pass ? '\n✅ PASS (validator clean + score>=80)' : '\n❌ NOT PASS YET');
process.exit(pass ? 0 : 1);
