import { GameConcept } from '../v2/types.js';
import { CodeValidationResult } from './CodeGameValidator.js';
import { ONE_SHOT_OK, durationBandFor } from './mechanics-v3.js';

/**
 * CodeQualityScorer v2 — GAME_QUALITY_STANDARD_V2 に対応した静的採点。
 *
 * v1(文字列マッチ4x25)から、品質基準v2の軸へ刷新:
 *   actionFeedback 25 : 全入力ハンドラが「行動の結果」を返しているか
 *                       (feedback/fx/audio呼び出し + 結果分岐)
 *   audioVisual    20 : BGM(melody/bgm)・SEの多様性・sprite・gradient
 *   layout         15 : 縦画面3ゾーン(上/中/下)を使っているか(静的近似。
 *                       正確な判定は games:smoke のスクリーンショット監査)
 *   goalEndings    15 : CLEAR/GAME OVERの演出差・進捗表示・game.best・
 *                       走行中マイルストーン
 *   structure      15 : バリデーションエラー + ATTRACT/RESULT状態機械
 *   runtime        10 : スモークハーネス結果(未実行時は中立5点)
 *
 * concept(LLM自己評価)はv2では採点に使わない — 成果物そのものを測る。
 * 引数互換のため受け取りは維持している。
 */

export interface CodeQualityScore {
  total: number;
  breakdown: {
    actionFeedback: number; // 0–25
    audioVisual: number;    // 0–20
    layout: number;         // 0–15
    goalEndings: number;    // 0–15
    structure: number;      // 0–15
    runtime: number;        // 0–10
  };
  validationErrors: number;
  validationWarnings: number;
  /** 改善ポイントの短い指摘(バッチ書き換えセッションへのヒント) */
  hints: string[];
}

export interface RuntimeCheckResult {
  passed: boolean;
}

const INPUT_HANDLER_RE = /game\.on(Tap|Swipe|Hold|Press|Release|Move)\s*\(/g;
const FEEDBACK_CALLS = ['game.feedback.', 'game.fx.', 'game.audio.play', 'game.audio.tone'];

/** `openIndex` 位置の '{' から対応する '}' までを返す(見つからなければ null) */
function extractBraceBlock(code: string, openIndex: number): string | null {
  let depth = 0;
  for (let i = openIndex; i < code.length; i++) {
    const ch = code[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return code.slice(openIndex, i + 1);
    }
  }
  return null;
}

/** 入力ハンドラの関数本体を抽出(インライン関数 or 同ファイル内の名前付き関数) */
function extractHandlerBodies(code: string): string[] {
  const bodies: string[] = [];
  let m: RegExpExecArray | null;
  INPUT_HANDLER_RE.lastIndex = 0;
  while ((m = INPUT_HANDLER_RE.exec(code)) !== null) {
    const argStart = m.index + m[0].length;
    const rest = code.slice(argStart, argStart + 200);

    // インライン: function(...) { / (...) => { / x => {
    const inline = /^\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>|[\w$]+\s*=>)\s*\{/.exec(rest);
    if (inline) {
      const body = extractBraceBlock(code, argStart + inline[0].length - 1);
      if (body) { bodies.push(body); continue; }
    }

    // 名前付き参照: game.onTap(handleTap)
    const named = /^\s*([\w$]+)\s*\)/.exec(rest);
    if (named) {
      const defRe = new RegExp(
        '(?:function\\s+' + named[1] + '\\s*\\([^)]*\\)|(?:var|let|const)\\s+' + named[1] + '\\s*=\\s*(?:function\\s*\\([^)]*\\)|\\([^)]*\\)\\s*=>))\\s*\\{'
      );
      const def = defRe.exec(code);
      if (def) {
        const body = extractBraceBlock(code, def.index + def[0].length - 1);
        if (body) { bodies.push(body); continue; }
      }
    }

    // 抽出失敗はハンドラとしてだけカウント(フィードバックなし扱い)
    bodies.push('');
  }
  return bodies;
}

// ── テキストレス検査(PLAY_GRAMMAR_V3 §3) ────────────────────────────────
// draw.text に渡す文字列リテラルと、draw.text を内部で呼ぶローカルヘルパーの
// 第1引数リテラルを収集する。
function extractDisplayedTexts(code: string): string[] {
  const texts: string[] = [];
  let m: RegExpExecArray | null;

  // 直接呼び出し: game.draw.text('...' / "..."
  const directRe = /draw\.text\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  while ((m = directRe.exec(code)) !== null) texts.push(m[2]);

  // draw.text を呼ぶローカルヘルパー名を収集(txt() 等)
  const helperNames = new Set<string>();
  const fnRe = /(?:function\s+([\w$]+)\s*\([^)]*\)|(?:var|let|const)\s+([\w$]+)\s*=\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>|[\w$]+\s*=>))\s*\{/g;
  while ((m = fnRe.exec(code)) !== null) {
    const name = m[1] || m[2];
    const body = extractBraceBlock(code, m.index + m[0].length - 1);
    if (name && body && body.includes('draw.text')) helperNames.add(name);
  }
  for (const name of helperNames) {
    const callRe = new RegExp(name.replace(/\$/g, '\\$') + '\\s*\\(\\s*([\'"])((?:\\\\.|(?!\\1).)*)\\1', 'g');
    while ((m = callRe.exec(code)) !== null) texts.push(m[2]);
  }
  return texts;
}

// §3 ホワイトリスト語(長いものから消し込むため長さ降順)
const TEXT_WHITELIST_PHRASES = [
  'TAP TO CONTINUE', 'TAP TO START', 'TAP TO PLAY', 'INSERT COIN', 'NEW RECORD',
  'GAME OVER', 'GAMEOVER', 'HI-SCORE', 'HI SCORE', 'HISCORE', 'TIME UP', 'TIMEUP',
  'CONTINUE', 'PERFECT', 'FINISH', 'RECORD', 'SCORE', 'CLEAR', 'READY', 'GREAT',
  'GOOD', 'NICE', 'MISS', 'BEST', 'COMBO', 'FEVER', 'BONUS', 'START', 'GO', 'TAP',
  '投入', '円',
].sort((a, b) => b.length - a.length);

function isWhitelistText(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  if (/^あと/.test(t)) return true; // ニアミス定型「あと◯◯」
  let s = t.toUpperCase();
  for (const p of TEXT_WHITELIST_PHRASES) s = s.split(p.toUpperCase()).join(' ');
  // 数字・記号・空白・矢印・単位を除去 → 残りが無ければ許可(数字/カウンタ/筐体定型/判定語)
  s = s.replace(/[0-9\s/%×xX:.,+\-!?()（）「」『』►◄▶◀◆●○★☆…・、。¥$秒回個点段目位人本個m]/g, '');
  return s.trim() === '';
}

/** 「指導文」= ホワイトリスト外 かつ 14文字超 or 空白区切り3語以上 */
function isInstructionalText(raw: string): boolean {
  const t = raw.trim();
  if (!t || isWhitelistText(t)) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  return t.length > 14 || words >= 3;
}

export class CodeQualityScorer {
  score(
    code: string,
    _concept: GameConcept | null,
    validationResult: CodeValidationResult,
    runtime?: RuntimeCheckResult | null
  ): CodeQualityScore {
    const hints: string[] = [];

    // ── actionFeedback (25) ──────────────────────────────────────────────
    const bodies = extractHandlerBodies(code);
    let actionFeedback = 0;
    if (bodies.length > 0) {
      const withFeedback = bodies.filter(
        (b) => b && FEEDBACK_CALLS.some((c) => b.includes(c))
      ).length;
      const withBranch = bodies.filter(
        (b) => b && (/\bif\s*\(/.test(b) || b.includes('?'))
      ).length;
      actionFeedback += Math.round((withFeedback / bodies.length) * 15);
      if (code.includes('game.feedback.good') && code.includes('game.feedback.bad')) {
        actionFeedback += 5;
      } else {
        hints.push('game.feedback.good/bad で行動の正否を提示する');
      }
      if (withBranch >= Math.ceil(bodies.length / 2)) actionFeedback += 5;
      if (withFeedback < bodies.length) {
        hints.push('全入力ハンドラで即時フィードバック(feedback/fx/audio)を返す');
      }
    } else {
      hints.push('入力ハンドラがありません');
    }
    actionFeedback = Math.min(25, actionFeedback);

    // ── audioVisual (20) ─────────────────────────────────────────────────
    let audioVisual = 0;
    if (code.includes('game.audio.melody(')) audioVisual += 8;
    else if (code.includes('game.audio.bgm(')) audioVisual += 6;
    else hints.push('BGM(game.audio.melody か bgm)を鳴らす');
    // distinct SE 3種以上で満点(§6.1)。2種以下は種数ぶんの部分点。
    const distinctSe = new Set(code.match(/se_[a-z_]+/g) || []).size;
    audioVisual += distinctSe >= 3 ? 4 : distinctSe;
    if (distinctSe < 3) hints.push('イベント別のSE(se_*)を3種以上に増やす(§6.1)');
    if (code.includes('game.draw.sprite(')) audioVisual += 5;
    else hints.push('キャラ/モチーフを game.draw.sprite で描く');
    if (code.includes('game.draw.gradient(')) audioVisual += 3;
    else hints.push('背景に game.draw.gradient を使う(黒一色回避)');
    audioVisual = Math.min(20, audioVisual);

    // ── layout (15) — 縦3ゾーンの静的近似 ────────────────────────────────
    const factors: number[] = [];
    const factorRe = /(?:H|game\.canvas\.height)\s*\*\s*(0?\.\d+|1(?:\.0*)?)/g;
    let fm: RegExpExecArray | null;
    while ((fm = factorRe.exec(code)) !== null) factors.push(parseFloat(fm[1]));
    const usesTop = factors.some((f) => f <= 0.28);
    const usesMiddle = factors.some((f) => f > 0.28 && f < 0.72);
    const usesBottom = factors.some((f) => f >= 0.72) || /\bH\s*-\s*\d/.test(code);
    let layout = (usesTop ? 5 : 0) + (usesMiddle ? 5 : 0) + (usesBottom ? 5 : 0);
    if (!usesBottom) hints.push('画面下部(親指ゾーン/H*0.72以深)を使う');
    if (!usesMiddle) hints.push('プレイフィールド(画面中央帯)に遊びを配置する');
    layout = Math.min(15, layout);

    // ── goalEndings (15) ─────────────────────────────────────────────────
    let goalEndings = 0;
    const hasWinText = /(CLEAR|SUCCESS|COMPLETE|WIN|やった|クリア)/i.test(code);
    const hasLoseText = /(GAME OVER|GAMEOVER|FAILED|TIME UP|TIMEUP|LOSE|しっぱい|ゲームオーバー)/i.test(code);
    if (hasWinText && hasLoseText) goalEndings += 5;
    else hints.push('CLEARとGAME OVERで異なる結果演出を出す');
    const hasProgress =
      /['"]\s*\/\s*['"]/.test(code) ||              // "3 / 10" カウンタ表示
      /timeLeft\s*\//.test(code) ||                  // 残時間バー
      code.includes('timeBar') || code.includes('progress');
    if (hasProgress) goalEndings += 4;
    else hints.push('進捗バーか達成カウンタを常時表示する');
    const usesBest = code.includes('game.best');
    if (usesBest) goalEndings += 3;
    else hints.push('ATTRACTやRESULTで game.best(実ベスト)を表示する');
    if (code.includes('game.fx.popup') || /milestone/i.test(code)) goalEndings += 3;
    else hints.push('走行中のマイルストーン演出(fx.popup)を入れる');
    // 偽HI-SCORE: game.best 不使用 かつ HI-SCORE 表記+ハードコード数値 → 減点(§3/§6)
    const fakeHiScore =
      /['"][^'"]*HI-?SCORE[^'"]*\d{2,}[^'"]*['"]/i.test(code) ||     // "HI-SCORE 12000"
      /HI-?SCORE[^;\n]{0,24}\+\s*\d{3,}/i.test(code) ||              // 'HI-SCORE ' + 12000
      /\d{3,}[^;\n]{0,10}HI-?SCORE/i.test(code);
    if (!usesBest && fakeHiScore) {
      goalEndings -= 3;
      hints.push('偽のHI-SCORE(ハードコード値)を game.best の実値に置換する');
    }
    goalEndings = Math.max(0, Math.min(15, goalEndings));

    // ── structure (15) ───────────────────────────────────────────────────
    let structure = Math.max(0, 10 - validationResult.errors.length * 4);
    if (/ATTRACT/.test(code) && /RESULT/.test(code)) structure += 5;
    else hints.push('ATTRACT/PLAYING/RESULT の状態機械を使う');
    structure = Math.min(15, structure);
    // テキストレス検査(§3): 指導文らしきリテラル1件につき −5(最大 −10)
    const displayedTexts = extractDisplayedTexts(code);
    const instructional = displayedTexts.filter(isInstructionalText);
    if (instructional.length > 0) {
      structure = Math.max(0, structure - Math.min(10, instructional.length * 5));
      hints.push(`指導文を削除しアート/実演で伝える(§3): 例 "${instructional[0].slice(0, 20)}"`);
    }

    // ── 尺・NEEDED(hint のみ・減点しない。合否は台帳照合で判定) ──────────
    const mech = (code.match(/^\s*\/\/\s*@mechanic:\s*(\S+)/m) || [])[1];
    const maxTimeStr = (code.match(/\b(?:MAX_TIME|TIME_LIMIT)\s*=\s*(\d+(?:\.\d+)?)/) || [])[1];
    const neededStr = (code.match(/\bNEEDED\s*=\s*(\d+)/) || [])[1];
    const maxTime = maxTimeStr !== undefined ? parseFloat(maxTimeStr) : NaN;
    const needed = neededStr !== undefined ? parseInt(neededStr, 10) : NaN;
    if (mech && !Number.isNaN(maxTime)) {
      const band = durationBandFor(mech);
      if (band && (maxTime < band[0] || maxTime > band[1])) {
        hints.push(`MAX_TIME=${maxTime}s は ${mech} の帯域 ${band[0]}〜${band[1]}s の外(§4)`);
      }
    }
    if (mech && needed <= 2 && maxTime >= 10 && !ONE_SHOT_OK.has(mech)) {
      hints.push(`NEEDED=${needed} は尺${maxTime}sに対し少ない(§5: 尺10秒あたり3〜8アクション)`);
    }

    // ── runtime (10) ─────────────────────────────────────────────────────
    const runtimeScore = runtime == null ? 5 : runtime.passed ? 10 : 0;

    const total = Math.min(
      100,
      actionFeedback + audioVisual + layout + goalEndings + structure + runtimeScore
    );

    return {
      total,
      breakdown: {
        actionFeedback,
        audioVisual,
        layout,
        goalEndings,
        structure,
        runtime: runtimeScore,
      },
      validationErrors: validationResult.errors.length,
      validationWarnings: validationResult.warnings.length,
      hints,
    };
  }

  report(score: CodeQualityScore): void {
    const { total, breakdown } = score;
    const grade = total >= 80 ? '🟢' : total >= 60 ? '🟡' : '🔴';
    console.log(`   ${grade} 品質スコア: ${total}/100`);
    console.log(`      行動フィードバック: ${breakdown.actionFeedback}/25`);
    console.log(`      音・視覚:           ${breakdown.audioVisual}/20`);
    console.log(`      縦画面レイアウト:   ${breakdown.layout}/15`);
    console.log(`      ゴール・結末:       ${breakdown.goalEndings}/15`);
    console.log(`      構造:               ${breakdown.structure}/15`);
    console.log(`      ランタイム:         ${breakdown.runtime}/10`);
    if (score.validationErrors > 0) {
      console.log(`      ⚠️  バリデーションエラー: ${score.validationErrors}件`);
    }
    if (score.validationWarnings > 0) {
      console.log(`      ⚠️  警告: ${score.validationWarnings}件`);
    }
    for (const h of score.hints.slice(0, 6)) {
      console.log(`      💡 ${h}`);
    }
  }
}
