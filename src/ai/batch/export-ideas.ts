/**
 * export-ideas.ts
 * arcadeとbarのアイデアを src/ai/v2/ideas-arcade-bar.json に書き出す
 *
 * 使い方:
 *   npx tsx src/ai/batch/export-ideas.ts
 *
 * 出力フォーマット: neta.json と同形式
 *   { id, title, idea, mechanic, theme }
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Arcade ideas ----
import { arcade2014Ideas }   from './ideas/arcade-2014.js';
import { arcade2015Ideas }   from './ideas/arcade-2015.js';
import { arcade2016Ideas }   from './ideas/arcade-2016.js';
import { arcade2017Ideas }   from './ideas/arcade-2017.js';
import { arcade2018Ideas }   from './ideas/arcade-2018.js';
import { arcade2019aIdeas }  from './ideas/arcade-2019a.js';
import { arcade2019bIdeas }  from './ideas/arcade-2019b.js';
import { arcade2020q1Ideas } from './ideas/arcade-2020q1.js';
import { arcade2020q2Ideas } from './ideas/arcade-2020q2.js';
import { arcade2020q3Ideas } from './ideas/arcade-2020q3.js';
import { arcade2020q4Ideas } from './ideas/arcade-2020q4.js';
import { arcade2021q1Ideas } from './ideas/arcade-2021q1.js';
import { arcade2021q2Ideas } from './ideas/arcade-2021q2.js';
import { arcade2021q3Ideas } from './ideas/arcade-2021q3.js';
import { arcade2021q4Ideas } from './ideas/arcade-2021q4.js';
import { arcade2022q1Ideas } from './ideas/arcade-2022q1.js';
import { arcade2022q2Ideas } from './ideas/arcade-2022q2.js';
import { arcade2022q3Ideas } from './ideas/arcade-2022q3.js';
import { arcade2022q4Ideas } from './ideas/arcade-2022q4.js';
import { arcade2023q1Ideas } from './ideas/arcade-2023q1.js';
import { arcade2023q2Ideas } from './ideas/arcade-2023q2.js';
import { arcade2023q3Ideas } from './ideas/arcade-2023q3.js';
import { arcade2023q4Ideas } from './ideas/arcade-2023q4.js';
import { arcade2024q1Ideas } from './ideas/arcade-2024q1.js';
import { arcade2024q2Ideas } from './ideas/arcade-2024q2.js';
import { arcade2024q3Ideas } from './ideas/arcade-2024q3.js';
import { arcade2024q4Ideas } from './ideas/arcade-2024q4.js';
import { arcade2025q1Ideas } from './ideas/arcade-2025q1.js';
import { arcade2025q2Ideas } from './ideas/arcade-2025q2.js';
import { arcade2025q3Ideas } from './ideas/arcade-2025q3.js';
import { arcade2025q4Ideas } from './ideas/arcade-2025q4.js';

// ---- Bar ideas ----
import { bar01Ideas } from './ideas/bar-01.js';
import { bar02Ideas } from './ideas/bar-02.js';
import { bar03Ideas } from './ideas/bar-03.js';
import { bar04Ideas } from './ideas/bar-04.js';
import { bar05Ideas } from './ideas/bar-05.js';
import { bar06Ideas } from './ideas/bar-06.js';
import { bar07Ideas } from './ideas/bar-07.js';
import { bar08Ideas } from './ideas/bar-08.js';
import { bar09Ideas } from './ideas/bar-09.js';
import { bar10Ideas } from './ideas/bar-10.js';
import { bar11Ideas } from './ideas/bar-11.js';
import { bar12Ideas } from './ideas/bar-12.js';
import { bar13Ideas } from './ideas/bar-13.js';
import { bar14Ideas } from './ideas/bar-14.js';
import { bar15Ideas } from './ideas/bar-15.js';
import { bar16Ideas } from './ideas/bar-16.js';
import { bar17Ideas } from './ideas/bar-17.js';
import { bar18Ideas } from './ideas/bar-18.js';
import { bar19Ideas } from './ideas/bar-19.js';
import { bar20Ideas } from './ideas/bar-20.js';

// ---- Mechanic classifier ----
function arcadeMechanic(concept: string): string {
  if (/連打|押し続|mash/i.test(concept)) return 'rapidTap';
  if (/裏返|ベル.*落|落.*ベル|2段階|(その後|次に).*タップ/i.test(concept)) return 'twoStep';
  if (/候補|扇状|選んで|青旗|安全な.*危険|危険.*安全|正しい.*形態|形態.*正しい|左右どちら|色を読/i.test(concept)) return 'choiceSelect';
  return 'timingWindow';
}

function barMechanic(concept: string): string {
  if (/連打|連続タップ|mash|押し続/i.test(concept)) return 'rapidTap';
  if (/[234]択|選択肢|候補|どちら.*正解|正解.*どちら/i.test(concept)) return 'quiz';
  return 'reveal';
}

// ---- Build combined ideas list ----
const arcadeIdeas = [
  ...arcade2014Ideas, ...arcade2015Ideas, ...arcade2016Ideas, ...arcade2017Ideas,
  ...arcade2018Ideas, ...arcade2019aIdeas, ...arcade2019bIdeas,
  ...arcade2020q1Ideas, ...arcade2020q2Ideas, ...arcade2020q3Ideas, ...arcade2020q4Ideas,
  ...arcade2021q1Ideas, ...arcade2021q2Ideas, ...arcade2021q3Ideas, ...arcade2021q4Ideas,
  ...arcade2022q1Ideas, ...arcade2022q2Ideas, ...arcade2022q3Ideas, ...arcade2022q4Ideas,
  ...arcade2023q1Ideas, ...arcade2023q2Ideas, ...arcade2023q3Ideas, ...arcade2023q4Ideas,
  ...arcade2024q1Ideas, ...arcade2024q2Ideas, ...arcade2024q3Ideas, ...arcade2024q4Ideas,
  ...arcade2025q1Ideas, ...arcade2025q2Ideas, ...arcade2025q3Ideas, ...arcade2025q4Ideas,
] as const;

const barIdeas = [
  ...bar01Ideas, ...bar02Ideas, ...bar03Ideas, ...bar04Ideas, ...bar05Ideas,
  ...bar06Ideas, ...bar07Ideas, ...bar08Ideas, ...bar09Ideas, ...bar10Ideas,
  ...bar11Ideas, ...bar12Ideas, ...bar13Ideas, ...bar14Ideas, ...bar15Ideas,
  ...bar16Ideas, ...bar17Ideas, ...bar18Ideas, ...bar19Ideas, ...bar20Ideas,
] as const;

// ---- Convert to neta format ----
let sequentialId = 1;

const items: Array<{
  id: number;
  sourceId: string;
  title: string;
  idea: string;
  mechanic: string;
  theme: string;
}> = [];

// Arcade
for (const idea of arcadeIdeas) {
  const a = idea as any;
  const mechanic = arcadeMechanic(a.concept);

  // idea テキスト: concept + winTrigger + failTrigger を組み合わせて context を豊かにする
  let ideaText = a.concept as string;
  if (a.winTrigger) ideaText += `\n成功条件: ${a.winTrigger}`;
  if (a.failTrigger) ideaText += `\n失敗条件: ${a.failTrigger}`;

  items.push({
    id: sequentialId++,
    sourceId: a.id,
    title: a.title,
    idea: ideaText,
    mechanic,
    theme: `アーケード（${a.brand}・${a.year}年）`,
  });
}

// Bar
for (const idea of barIdeas) {
  const b = idea as any;
  const mechanic = barMechanic(b.concept);

  let ideaText = b.concept as string;
  if (b.resultTrigger) ideaText += `\n結果表示: ${b.resultTrigger}`;

  items.push({
    id: sequentialId++,
    sourceId: b.id,
    title: b.title,
    idea: ideaText,
    mechanic,
    theme: 'バー・飲み会',
  });
}

// ---- Write output ----
const output = {
  version: '1.0',
  description: 'arcadeとbarのゲームアイデア（592件）',
  totalCount: items.length,
  items,
};

const outPath = path.join(__dirname, '../v2/ideas-arcade-bar.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ ${items.length} ideas written to ${outPath}`);
console.log(`   Arcade: ${arcadeIdeas.length}`);
console.log(`   Bar:    ${barIdeas.length}`);

// Mechanic distribution
const mecDist: Record<string, number> = {};
for (const item of items) {
  mecDist[item.mechanic] = (mecDist[item.mechanic] ?? 0) + 1;
}
console.log('\nMechanic distribution:');
for (const [k, v] of Object.entries(mecDist)) {
  console.log(`  ${k}: ${v}`);
}
