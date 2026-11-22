// K-DS-0028v3-dragon-boat-drum-sprint.js
// 竜舟の号令スプリント — 舳先の太鼓が号令を打つ間は8分の拍に乗せて連打で漕ぎ、拍に合ったひとかきだけ舟が進む。号令は段ごとに速まり、隣の組と競り合う
// 操作: 画面のどこでも押すと櫂をひとかき入れる(押した瞬間で判定)。水面を右から流れてくる漕ぎ印(大=拍の頭・小=裏の8分)が黄色の入水線に重なる瞬間に押すとPERFECT/GOOD、ひとかき分舟が進む。印のない所を押す・同じ印に2回押すと水しぶきのMISSで舟が少し戻る。段の頭の2拍は太鼓打ちが撥を掲げて新しい速さを刻む「櫂上げ」で、ここで漕ぐとMISS(1拍半前に笛+赤い櫂上げ帯+速さの数字で予告。最初の段だけは罰なし)
// 終わり: 3段(100→120→140BPM、各 櫂上げ2拍+号令6拍・約12秒)を漕ぎ切った時点で隣の組より先にゴール線へ届いていればCLEAR。届いていない/MISS 7回/残りの印を全部取っても届かなくなった時点でGAME OVER
// @mechanic: mash
// @theme: dragon_boat_drum_sprint
// 世界観: 初夏の川の競漕大会で、竜頭の舟の漕ぎ手が舳先の太鼓打ちの号令に合わせて櫂を連打で入れ、隣の組の竜舟と並んでゴールを競う
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・決まったひとかきの数・最大コンボ・ゴール時の差
// スタイル: 90s BIG SPRITE
var STYLE = { bg: ['#5ab0ee', '#e6f6ff'], main: ['#2a6fd0', '#f0c020', '#d83838'], accent: ['#30b060', '#ffffff'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;
  // 90s BIG SPRITE: 画面の1/3を占める巨大な漕ぎ手。舟べりに楕円の影、背景は横1層の川岸だけ
  var C = {
    skyT: STYLE.bg[0], skyB: STYLE.bg[1], water: STYLE.main[0], gold: STYLE.main[1], red: STYLE.main[2],
    green: STYLE.accent[0], white: STYLE.accent[1],
    waterD: '#1d4f9e', waterL: '#6fb4f0', ink: '#1a1020', skin: '#f0b47c', skinD: '#c07a48', hair: '#2a1a14',
    wood: '#8a5a2c', woodD: '#5a3416', hull: '#c83030', hullD: '#7a1818', rival: '#3a58c8', grey: '#8a96a8',
  };

  var GAME_TITLE = 'DRAGON SPRINT';
  var STAGES = [100, 120, 140];
  var DEMO_STAGES = [100, 124];
  var SB = 8;                  // 1段の拍数(櫂上げ2拍 + 号令6拍)
  var COUNT_IN = 2;
  var RIVAL_RATE = 0.66;       // 隣の組は印の66%ぶん進む
  var MISS_MAX = 7;
  var HIT_STOP = 0.32;
  var TIME_LIMIT = 13;
  var CATCH_X = 560;           // 入水線
  var LANE_Y = Math.round(H * 0.79);
  var PXS = 520;               // 漕ぎ印の流れる速さ(px/秒)
  var GUN_Y = Math.round(H * 0.69);   // 舟べり
  var WATER_Y = Math.round(H * 0.75);
  var PADDLER_X = 300;
  var FAR_Y = Math.round(H * 0.4);    // 隣の組の水路(舟べりの高さ)

  // 笛の句(自作・各段の号令6拍ぶん)
  var PHRASE = [
    [['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['C6', 0.5]],
    [['A5', 0.5], ['C6', 0.5], ['D6', 1], ['C6', 0.5], ['A5', 0.5], ['G5', 1], ['A5', 0.5], ['C6', 0.5], ['D6', 0.5], ['E6', 0.5]],
    [['D6', 0.5], ['E6', 0.5], ['G6', 0.5], ['E6', 0.5], ['D6', 0.5], ['C6', 0.5], ['A5', 0.5], ['C6', 0.5], ['D6', 1], ['E6', 1]],
  ];
  var PBASS = [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['G2', 1], ['D3', 1]];
  var ST_COL = ['#30b060', '#f0c020', '#ff5a3a'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;
  var R = null;
  var demo = { t: 0, taps: [], ti: 0, press: 0 };

  // ── スプライト ─────────────────────────────────────────
  var PAD_A = [
    '....RRRRRRR.....',
    '...KKKKKKKKK....',
    '..KKKKKKKKKKK...',
    'RRRRRRRRRRRRK...',
    '.R.KKSSSSSSSK...',
    '...KSSSSSSKSS...',
    '...KSSSSSSSSSS..',
    '....SSSSSSSMS...',
    '.....SSSSSSS....',
    '.......SSS......',
    '....YYYYYYYYY...',
    '...YYYYYYYYYYY..',
    '..YYYYRRRYYYYY..',
    '..YYYYRRRYYYYY..',
    '..YYYYYYYYYYYY..',
    '...YYYYYYYYYY...',
  ];
  var PAD_B = PAD_A.slice();          // 掛け声(口が開く)
  PAD_B[7] = '....SSSSSSMMS...';
  PAD_B[8] = '.....SSSSSMMS...';
  var PAD_C = PAD_A.slice();          // しまった
  PAD_C[5] = '...KSSSSSKSKS...';
  PAD_C[7] = '....SSSSSSMMS...';
  var PAD_PAL = { R: C.red, K: C.hair, S: C.skin, M: '#7a1a1a', Y: C.gold };

  var DRUMMER = [
    ['...RRRR...', '..KKKKKK..', '..KSSSSK..', '...SSKS...', '....SS....', '.WWWWWWWW.', 'WWWWWWWWWW', '.WWWWWWWW.', '..BBBBBB..', '.BBB..BBB.'],
    ['...RRRR...', '..KKKKKK..', '..KSSSSK..', '...SMMS...', '....SS....', '.WWWWWWWW.', 'WWWWWWWWWW', '.WWWWWWWW.', '..BBBBBB..', '.BBB..BBB.'],
  ];
  var DR_PAL = { R: C.red, K: C.hair, S: C.skin, M: '#7a1a1a', W: C.white, B: C.rival };

  var HEAD = [
    ['.......GG.....', '......GGGG....', '..GGGGGGGGGG..', '.GGGGKGGGGGGG.', 'GGGGGGGGGGGGGY', 'GGGGGGGWYWYWYY', 'GGGGGGG.......', 'GGGGGGGWYWYWYY', 'GGGGGGGGGGGGGY', '.GGYYYYYYYYG..', '..GGRRRRRGG...', '...GGGGGGG....'],
    ['.......GG.....', '......GGGG....', '..GGGGGGGGGG..', '.GGGGKGGGGGGG.', 'GGGGGGGGGGGGGY', 'GGGGGGGWYWYWYY', 'GGGGGGGRRRRRRR', 'GGGGGGGWYWYWYY', 'GGGGGGGGGGGGGY', '.GGYYYYYYYYG..', '..GGRRRRRGG...', '...GGGGGGG....'],
  ];
  var HEAD_PAL = { G: C.green, K: C.ink, Y: C.gold, W: C.white, R: C.red };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    for (var y = -ry; y < ry; y += 6) {
      var yy = y + 3;
      var hw = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - hw, cy + y, hw * 2, 6, col, a === undefined ? 1 : a);
    }
  }
  function vq(v) { return armed ? (R && R.demo ? v * 0.4 : v) : 0.001; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  // ── 進行(拍クロックは1本。段ごとにBPMが上がる) ─────────────
  function newRun(isDemo) {
    var stages = isDemo ? DEMO_STAGES : STAGES;
    var bt = [], t = 0, slots = [], dangers = [];
    for (var s = 0; s < stages.length; s++) {
      var spb = 60 / stages[s];
      for (var k = 0; k < SB; k++) {
        bt.push(t);
        if (k >= COUNT_IN) {
          slots.push({ t: t, head: true, stage: s, gw: spb * 0.18, st: 0, fx: 0 });
          slots.push({ t: t + spb / 2, head: false, stage: s, gw: spb * 0.18, st: 0, fx: 0 });
        }
        t += spb;
      }
      if (s > 0) dangers.push({ t0: bt[s * SB], t1: bt[s * SB] + spb * COUNT_IN, stage: s });
    }
    bt.push(t);
    return {
      demo: isDemo, stages: stages, bt: bt, slots: slots, dangers: dangers, nBeats: stages.length * SB,
      goal: RIVAL_RATE * slots.length,
      ready: isDemo ? 0 : 0.8, running: isDemo, songT: 0, beatT: 0, beatN: 0, melDone: -1, annDone: 0, stDone: 0,
      P: 0, Rv: 0, dispP: 0, dispR: 0, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, strokes: 0,
      stMiss: [0, 0, 0], stHit: [0, 0, 0],
      phase: 1, hitStop: 0, pendingBad: null, shout: 0, drumHit: 0, flagT: 0, pulse: 0, splash: 0, bankX: 0, waterX: 0,
      over: false, ok: false, endWait: 0, prevBest: game.best, overtaken: false,
    };
  }
  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (!R.demo) game.audio.stopBgm();
  }

  function stageOf(b) { return Math.min(R.stages.length - 1, Math.floor(b / SB)); }
  function spbOf(b) { return 60 / R.stages[stageOf(b)]; }

  function onBeat(b) {
    if (b >= R.nBeats) return;
    var s = stageOf(b), local = b - s * SB;
    var q = R.demo ? 0.4 : 1;
    R.pulse = 1;
    if (local < COUNT_IN) {
      // 櫂上げ: 撥を打ち合わせて新しい速さを刻む
      tone(1500, 0.04, { wave: 'square', volume: 0.06 * q });
      tone(1900, 0.03, { wave: 'square', volume: 0.04 * q });
      if (local === 0) {
        R.flagT = Math.max(R.flagT, 0.6);
        game.fx.popup('' + R.stages[s], W / 2, FAR_Y - 200, { color: ST_COL[s], size: 110 });
      }
    } else {
      // 号令の太鼓 + 掛け声
      R.drumHit = 0.12;
      tone(82, 0.16, { wave: 'sine', volume: 0.3 * q, slide: -30 });
      tone(local % 2 === 0 ? 'A4' : 'E4', 0.06, { wave: 'square', volume: 0.04 * q, slide: 40 });
      R.shout = 0.14;
    }
  }

  function stepClock(dt) {
    if (!R.running || R.over) return;
    R.beatT += dt;
    var spb = spbOf(R.beatN);
    while (R.beatT >= spb && R.beatN < R.nBeats) {
      R.beatT -= spb; R.beatN++;
      onBeat(R.beatN);
      spb = spbOf(R.beatN);
    }
    R.songT = R.bt[Math.min(R.beatN, R.nBeats)] + R.beatT;
    var t = R.songT;
    // 笛の句は号令の頭(各段の3拍目)の少し前に仕込む
    var s = stageOf(R.beatN);
    var melAt = R.bt[s * SB + COUNT_IN] - 0.06;
    if (R.melDone < s && t >= melAt && armed) {
      R.melDone = s;
      game.audio.melody(PHRASE[s % PHRASE.length], { tempo: R.stages[s], wave: 'triangle', volume: R.demo ? 0.02 : 0.05, bass: PBASS, bassWave: 'square', bassVolume: R.demo ? 0.015 : 0.035 });
    }
    // 櫂上げの予告(1拍半前): 笛 + 旗 + 赤帯
    while (R.annDone < R.dangers.length && t >= R.dangers[R.annDone].t0 - 1.5 * spbOf(R.dangers[R.annDone].stage * SB - 1)) {
      R.annDone++;
      R.flagT = 1.4;
      tone(1760, 0.18, { wave: 'triangle', volume: (R.demo ? 0.03 : 0.08), slide: 300 });
      tone(2093, 0.22, { wave: 'triangle', volume: (R.demo ? 0.02 : 0.05), slide: 200 });
    }
    // 取り逃した印
    var passed = 0;
    for (var i = 0; i < R.slots.length; i++) {
      var sl = R.slots[i];
      if (sl.t <= t) passed++;
      if (sl.st === 0 && t > sl.t + sl.gw) { sl.st = 'gone'; R.combo = 0; }
    }
    R.Rv = RIVAL_RATE * passed;
    // 段の締め(MISSなしなら NICE)
    while (R.stDone < R.stages.length && t >= R.bt[(R.stDone + 1) * SB] - 0.05) {
      if (!R.demo && R.stMiss[R.stDone] === 0 && R.stHit[R.stDone] >= 9) {
        game.fx.popup('NICE', W / 2, 820, { color: ST_COL[R.stDone], size: 96 });
        game.audio.play('se_milestone', 0.45);
      }
      R.stDone++;
    }
    if (R.demo) return;
    var last = R.slots[R.slots.length - 1];
    var remain = 0;
    for (var j = 0; j < R.slots.length; j++) if (R.slots[j].st === 0) remain++;
    if (R.P + remain < R.goal - 0.001) { endRun(false); return; }
    if (t > last.t + last.gw + 0.05 || t > TIME_LIMIT) endRun(R.P >= R.goal - 0.001);
  }

  // 櫂を入れる(押した瞬間で判定。入力とデモで共通)
  function stroke() {
    if (!R || R.over || !R.running) return 'none';
    var t = R.songT;
    var best = null, bd = 99;
    for (var i = 0; i < R.slots.length; i++) {
      var sl = R.slots[i];
      if (sl.st !== 0) continue;
      var d = t - sl.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = sl; }
    }
    if (best && Math.abs(bd) <= best.gw) {
      var perfect = Math.abs(bd) <= best.gw * 0.45;
      best.st = perfect ? 'p' : 'g';
      R.P += perfect ? 1 : 0.75;
      R.strokes++; R.stHit[best.stage]++;
      R.combo++; if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      R.score += (perfect ? 100 : 60) + Math.min(R.combo, 20) * 4;
      if (perfect) R.perfect++; else R.good++;
      R.phase = 0; R.splash = 0.2;
      game.feedback.good(CATCH_X + 40, LANE_Y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.white, size: perfect ? 46 : 38, count: perfect ? 8 : 5, volume: vq(0.16) });
      tone(perfect ? 220 : 196, 0.08, { wave: 'triangle', volume: R.demo ? 0.04 : 0.12, slide: -80 });
      if (!R.demo && R.combo > 0 && R.combo % 12 === 0) {
        game.fx.popup('x' + R.combo, CATCH_X + 120, LANE_Y - 260, { color: C.gold, size: 90 });
        game.audio.play('se_milestone', 0.4);
      }
      if (!R.demo && !R.overtaken && R.P > R.Rv + 1.5 && R.strokes > 6) {
        R.overtaken = true;
        game.fx.popup('NICE', W / 2, FAR_Y + 20, { color: C.gold, size: 80 });
      }
      return perfect ? 'perfect' : 'good';
    }
    // 1段目の櫂上げだけは罰なし(空振り)
    if (t < R.bt[COUNT_IN] - R.slots[0].gw) {
      R.phase = 0.5;
      tone(300, 0.05, { wave: 'triangle', volume: 0.05 });
      return 'air';
    }
    splashMiss();
    return 'miss';
  }

  function splashMiss() {
    R.miss++; R.combo = 0;
    var s = stageOf(R.beatN);
    R.stMiss[s]++;
    R.P = Math.max(0, R.P - 0.5);
    R.hitStop = HIT_STOP; R.phase = 0;
    R.pendingBad = { t: 0.3 };
    tone(140, 0.2, { wave: 'sawtooth', volume: R.demo ? 0.03 : 0.1, slide: -50 });
    game.fx.burst(CATCH_X, WATER_Y, { color: C.white, count: 10, speed: 320 });
    if (!R.demo && R.miss >= MISS_MAX) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.6;
    game.audio.stopBgm();
    if (ok) {
      var margin = Math.max(0, R.P - R.goal);
      R.score += 500 + Math.round(margin * 40);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(150 + i * 195, 520 + (i % 2) * 220, { color: [C.gold, C.red, C.green, C.white, C.gold][i], count: 24, speed: 520 });
      game.fx.flash(C.gold, 0.18);
      if (R.score > R.prevBest) { game.fx.popup('NEW RECORD', W / 2, 640, { color: C.gold, size: 80 }); game.audio.play('se_milestone', 0.6); }
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 時間の進み(演出) ─────────────────────────────────
  function tickRun(dt) {
    if (R.hitStop > 0) R.hitStop -= dt;
    if (R.shout > 0) R.shout -= dt;
    if (R.drumHit > 0) R.drumHit -= dt;
    if (R.flagT > 0) R.flagT -= dt;
    if (R.splash > 0) R.splash -= dt;
    R.pulse = Math.max(0, R.pulse - dt * 4);
    if (R.hitStop <= 0 && R.phase < 1) R.phase = Math.min(1, R.phase + dt / 0.36);
    if (R.pendingBad) {
      R.pendingBad.t -= dt;
      if (R.pendingBad.t <= 0) {
        game.feedback.bad(CATCH_X, WATER_Y - 80, { text: 'MISS', shake: R.demo ? 4 : 10, volume: vq(0.45) });
        R.pendingBad = null;
      }
    }
    for (var i = 0; i < R.slots.length; i++) if (R.slots[i].st !== 0) R.slots[i].fx += dt;
    R.dispP += (R.P - R.dispP) * Math.min(1, dt * 5);
    R.dispR += (R.Rv - R.dispR) * Math.min(1, dt * 5);
    var spd = R.running && !R.over ? 140 + 60 * (R.stages[stageOf(R.beatN)] / 100) : 40;
    R.bankX += spd * 0.4 * dt;
    R.waterX += spd * dt;
  }

  // ATTRACT: ゴーストが実ロジックで印どおりに漕ぐ(2段目で1回、印のない所を押して水しぶきMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cycLen = R ? R.bt[R.nBeats] + 1.2 : 10;
    if (demo.t <= dt || demo.t >= cycLen) {
      demo.t = dt;
      R = newRun(true);
      demo.taps = []; demo.ti = 0;
      for (var i = 0; i < R.slots.length; i++) {
        var sl = R.slots[i];
        if (sl.stage === 1 && i % 12 === 5) { demo.taps.push(sl.t - sl.gw * 2.6); continue; }   // わざと外す
        if (i % 12 === 9) continue;                                                            // ひとかき休む
        demo.taps.push(sl.t);
      }
      onBeat(0);
    }
    demo.press = Math.max(0, demo.press - dt);
    while (demo.ti < demo.taps.length && R.songT >= demo.taps[demo.ti]) {
      demo.ti++;
      stroke();
      demo.press = 0.1;
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBank(t) {
    game.draw.gradient(0, WATER_Y, [[0, C.skyT], [0.42, C.skyB], [0.43, '#9ed890'], [1, '#9ed890']]);
    // 遠い山並みと雲
    for (var m = 0; m < 6; m++) game.draw.circle(((m * 230 - R.bankX * 0.1) % 1380 + 1380) % 1380 - 150, 610, 170 + (m % 3) * 30, '#8cc4e0', 0.8);
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + t * 14 - R.bankX * 0.05) % 1320 + 1320) % 1320 - 120;
      game.draw.circle(cx, 330 + (c % 2) * 50, 46, C.white, 0.9);
      game.draw.circle(cx + 50, 320 + (c % 2) * 50, 56, C.white, 0.9);
      game.draw.circle(cx + 104, 334 + (c % 2) * 50, 40, C.white, 0.9);
    }
    // 土手の並木・見物の人だかり・のぼり(横1層、舟の速さで流れる)
    var off = ((R.bankX % 120) + 120) % 120;
    for (var tr = -1; tr < 11; tr++) {
      var tx = tr * 120 - off;
      game.draw.circle(tx + 60, 586, 52, '#3a9a4a');
      game.draw.circle(tx + 30, 600, 34, '#2e8a40');
      game.draw.rect(tx + 56, 610, 10, 40, C.woodD);
    }
    var off2 = ((R.bankX * 1.3 % 90) + 90) % 90;
    for (var p = -1; p < 14; p++) {
      var px = p * 90 - off2;
      var hop = Math.sin(t * 8 + p) > 0.6 ? -6 : 0;
      game.draw.circle(px + 20, 648 + hop, 13, ['#f0c020', '#d83838', '#ffffff', '#3a58c8'][(p + 400) % 4]);
      game.draw.circle(px + 20, 630 + hop, 10, C.skin);
      game.draw.circle(px + 60, 652, 13, ['#30b060', '#ff8ac0', '#f0c020'][(p + 300) % 3]);
      game.draw.circle(px + 60, 634, 10, C.skinD);
      if ((p + 300) % 3 === 0) {
        game.draw.rect(px + 40, 520, 6, 140, C.woodD);
        game.draw.rect(px + 46, 524 + Math.sin(t * 3 + p) * 3, 34, 90, ST_COL[(p + 300) % 3 === 0 ? (Math.floor(p / 3) + 300) % 3 : 0]);
      }
    }
    // 遠い水面(隣の組の水路)
    game.draw.rect(0, 664, W, WATER_Y - 664, C.waterL);
    for (var s = 0; s < 10; s++) {
      var sx = ((s * 137 - R.waterX * 0.5) % 1200 + 1200) % 1200 - 60;
      game.draw.rect(sx, 680 + (s % 4) * 18, 60, 4, C.white, 0.6);
    }
  }

  function drawRival(t) {
    var spb = spbOf(R.beatN);
    var gap = Math.max(-1, Math.min(1, (R.dispR - R.dispP) / 8));
    var bx = W / 2 + gap * 420;
    var y = FAR_Y;
    // 竜舟(小・青組)
    game.draw.rect(bx - 230, y, 440, 22, C.rival);
    game.draw.rect(bx - 230, y + 22, 440, 8, '#24388a');
    game.draw.rect(bx + 210, y - 30, 30, 52, C.green);
    game.draw.rect(bx + 236, y - 26, 26, 12, C.gold);
    var ph = R.running ? (R.beatT / spb) * 2 % 1 : 0.5;
    for (var k = 0; k < 8; k++) {
      var x = bx - 200 + k * 50;
      game.draw.rect(x - 8, y - 26, 16, 22, '#ffffff');
      game.draw.circle(x, y - 34, 9, C.skinD);
      var a = 0.5 - ph;
      game.draw.line(x + 4, y - 26, x + 14 + a * 30, y + 26, C.woodD, 4);
    }
    if (gap < -0.02) game.draw.rect(bx - 230, y - 4, 4, 30, C.white);
  }

  function drawCourse() {
    // コース図: 自分の竜(黄)と隣の組(青)がゴール旗へ向かう
    var x0 = 70, x1 = W - 110, y = Math.round(H * 0.14);
    game.draw.rect(x0, y - 6, x1 - x0, 12, '#1a3a7a', 0.7);
    for (var s = 0; s < R.stages.length; s++) {
      var ax = x0 + (x1 - x0) * (s / R.stages.length);
      game.draw.rect(ax, y - 14, 4, 28, ST_COL[s]);
    }
    game.draw.rect(x1, y - 40, 6, 60, C.white);
    for (var f = 0; f < 3; f++) for (var g = 0; g < 2; g++) game.draw.rect(x1 + 6 + f * 14, y - 40 + g * 14, 14, 14, (f + g) % 2 ? C.ink : C.white);
    var pr = Math.min(1, R.dispR / R.goal), pp = Math.min(1, R.dispP / R.goal);
    game.draw.circle(x0 + (x1 - x0) * pr, y + 22, 16, C.rival);
    game.draw.circle(x0 + (x1 - x0) * pp, y - 22, 20, C.gold);
    game.draw.circle(x0 + (x1 - x0) * pp + 12, y - 26, 6, C.red);
  }

  function drawBoat(t) {
    // 手前の水
    game.draw.rect(0, WATER_Y, W, H - WATER_Y, C.water);
    for (var s = 0; s < 16; s++) {
      var sx = ((s * 173 - R.waterX) % 1300 + 1300) % 1300 - 100;
      var sy = WATER_Y + 40 + (s % 6) * 70;
      game.draw.rect(sx, sy, 80 + (s % 3) * 30, 6, C.waterL, 0.7);
    }
    for (var d = 0; d < 6; d++) game.draw.rect(0, H - 120 + d * 20, W, 10, C.waterD, 0.25);
    // 舟体(竜の鱗)
    game.draw.rect(-10, GUN_Y, W + 20, WATER_Y - GUN_Y + 16, C.hull);
    game.draw.rect(-10, GUN_Y, W + 20, 14, C.gold);
    game.draw.rect(-10, WATER_Y, W + 20, 16, C.hullD);
    for (var k = 0; k < 20; k++) {
      var kx = k * 60;
      game.draw.circle(kx + 30, GUN_Y + 56, 24, C.hullD);
      game.draw.circle(kx + 30, GUN_Y + 50, 22, C.gold, 0.85);
      game.draw.circle(kx + 30, GUN_Y + 46, 16, C.hull);
    }
    // 太鼓打ち
    var dx = 870, dy = GUN_Y - 120;
    ellipse(dx, GUN_Y + 6, 90, 14, C.ink, 0.35);
    game.draw.sprite(DRUMMER[R.shout > 0 ? 1 : 0], DR_PAL, dx, dy + Math.round(R.pulse * 3) * 2, 11, { anchor: 'center' });
    game.draw.circle(dx - 90, GUN_Y - 40, 58, C.woodD);
    game.draw.circle(dx - 90, GUN_Y - 40, 48, R.drumHit > 0 ? '#fff6dc' : '#ecd2a4');
    var up = R.flagT > 0 && Math.floor(t * 10) % 2 === 0;
    var stickY = R.drumHit > 0 ? GUN_Y - 60 : (R.flagT > 0 ? GUN_Y - 260 : GUN_Y - 150);
    game.draw.line(dx - 30, dy + 10, dx - 80, stickY, C.woodD, 10);
    game.draw.line(dx - 10, dy + 10, dx - 40, stickY - 20, C.woodD, 10);
    if (R.flagT > 0) {
      game.draw.rect(dx - 52, stickY - 100, 70, 60, up ? C.red : C.white);
      game.draw.rect(dx - 52, stickY - 100, 70, 60, C.red, 0.5);
    }
    if (R.drumHit > 0) game.draw.circle(dx - 90, GUN_Y - 40, 80, C.white, 0.3);
    // 舳先の竜頭(拍で口を開ける)
    var hf = R.drumHit > 0 ? 1 : 0;
    game.draw.sprite(HEAD[hf], HEAD_PAL, W - 96, GUN_Y - 70 + Math.round(Math.sin(t * 2) * 2) * 3, 14, { anchor: 'center' });
  }

  // 櫂先の軌道: 入水(入水線の少し先)→水中を後ろへかく→持ち上げて前へ戻し、水面の上で構える
  function paddleGeo() {
    var ph = R.phase, tx, ty;
    if (ph < 0.45) { var u = ph / 0.45; tx = CATCH_X + 60 - u * 220; ty = WATER_Y + 50; }
    else { var v = (ph - 0.45) / 0.55; tx = CATCH_X - 160 + v * 220; ty = WATER_Y + 50 - Math.sin(v * Math.PI) * 150 - v * 90; }
    var lean = (tx - CATCH_X) * 0.25;
    var top = { x: PADDLER_X + 210 + lean, y: GUN_Y - 480 };
    function at(k) { return { x: top.x + (tx - top.x) * k, y: top.y + (ty - top.y) * k }; }
    return { lean: lean, top: top, low: at(0.45), tip: { x: tx, y: ty }, bladeFrom: at(0.66) };
  }

  function drawPaddler(t) {
    var stop = R.hitStop > 0;
    var g = paddleGeo();
    var lean = Math.round(g.lean / 4) * 4;
    var bob = Math.round((Math.sin(t * 3) * 3 - R.pulse * 6) / 2) * 2;
    var bodyX = PADDLER_X + lean, bodyY = GUN_Y - 240 + bob;
    ellipse(PADDLER_X + 20, GUN_Y + 4, 230, 26, C.ink, 0.35);   // 舟べりの影
    var frameS = stop ? PAD_C : (R.shout > 0 ? PAD_B : PAD_A);
    game.draw.sprite(frameS, PAD_PAL, bodyX, bodyY, 28, { anchor: 'center' });
    // 腕と櫂(櫂の角度は押した瞬間からのひとかきで決まる)
    var sh = { x: bodyX + 100, y: bodyY + 80 };
    game.draw.line(g.top.x, g.top.y, g.tip.x, g.tip.y, C.ink, 26);
    game.draw.line(g.top.x, g.top.y, g.tip.x, g.tip.y, C.wood, 16);
    var bw = stop ? 70 : 48;
    game.draw.line(g.bladeFrom.x, g.bladeFrom.y, g.tip.x, g.tip.y, C.ink, bw + 10);
    game.draw.line(g.bladeFrom.x, g.bladeFrom.y, g.tip.x, g.tip.y, stop ? C.white : C.red, bw);
    game.draw.line(sh.x, sh.y, g.top.x, g.top.y, C.ink, 40);
    game.draw.line(sh.x, sh.y, g.top.x, g.top.y, C.skin, 28);
    game.draw.line(sh.x - 30, sh.y + 40, g.low.x, g.low.y, C.ink, 40);
    game.draw.line(sh.x - 30, sh.y + 40, g.low.x, g.low.y, C.skin, 28);
    game.draw.circle(g.top.x, g.top.y, 20, C.skinD);
    game.draw.circle(g.low.x, g.low.y, 20, C.skinD);
    // 水面より下の櫂は水に沈んで見える
    game.draw.rect(CATCH_X - 300, WATER_Y + 16, 480, 90, C.water, 0.6);
    if (stop) game.draw.circle(g.tip.x, Math.min(g.tip.y, WATER_Y + 30), 90, C.white, 0.45);
    // 入水のしぶき
    if (R.splash > 0) {
      for (var i = 0; i < 6; i++) {
        var a = Math.PI + (i + 0.5) / 6 * Math.PI;
        var rr = 30 + (0.2 - R.splash) * 500;
        game.draw.circle(CATCH_X + Math.cos(a) * rr, WATER_Y + Math.sin(a) * rr * 0.6, 12, C.white, 0.9);
      }
    }
  }

  function laneX(ts) { return CATCH_X + (ts - R.songT) * PXS; }

  function drawLane(t) {
    var y = LANE_Y;
    game.draw.rect(0, y - 54, W, 108, C.waterD, 0.45);
    // 櫂上げの区間(赤い帯 + ×)
    for (var d = 0; d < R.dangers.length; d++) {
      var dz = R.dangers[d];
      var xa = laneX(dz.t0), xb = laneX(dz.t1);
      if (xb < 0 || xa > W) continue;
      game.draw.rect(xa, y - 50, xb - xa, 100, C.red, 0.55);
      for (var z = xa + 30; z < xb - 20; z += 70) {
        game.draw.line(z - 18, y - 18, z + 18, y + 18, C.white, 8);
        game.draw.line(z + 18, y - 18, z - 18, y + 18, C.white, 8);
      }
    }
    // 入水線
    var pl = 0.6 + R.pulse * 0.4;
    game.draw.rect(CATCH_X - 6, y - 70, 12, 140, C.gold, pl);
    game.draw.circle(CATCH_X, y, 48, C.gold, 0.25 + R.pulse * 0.3);
    // 漕ぎ印
    for (var i = 0; i < R.slots.length; i++) {
      var sl = R.slots[i];
      var x = laneX(sl.t);
      if (x < CATCH_X - 160 || x > W + 50) continue;
      if (sl.st === 'p' || sl.st === 'g') continue;
      var col = ST_COL[sl.stage];
      if (sl.st === 'gone') {
        game.draw.circle(x, y, sl.head ? 22 : 14, C.grey, Math.max(0, 0.6 - sl.fx));
        continue;
      }
      var r = sl.head ? 36 : 22;
      game.draw.circle(x, y + 4, r + 6, C.ink, 0.5);
      game.draw.circle(x, y, r + 4, C.white);
      game.draw.circle(x, y, r, col);
      if (sl.head) game.draw.circle(x - 10, y - 10, 9, C.white, 0.8);
    }
  }

  function bpmBadge(x, y) {
    var s = stageOf(R.beatN);
    for (var c = 0; c <= s; c++) {
      var cx = x - 110 + c * 30;
      game.draw.line(cx, y - 16, cx + 14, y, ST_COL[s], 8);
      game.draw.line(cx + 14, y, cx, y + 16, ST_COL[s], 8);
    }
    txt('' + R.stages[s], x + 20, y + 4, 50, ST_COL[s], 'left');
  }

  function drawWorld(t) {
    drawBank(t);
    drawRival(t);
    drawBoat(t);
    drawPaddler(t);
    drawLane(t);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.ink, 0.6);
    txt('SCORE ' + R.score, 36, 66, 48, C.white, 'left');
    txt('BEST ' + R.prevBest, 36, 124, 30, C.gold, 'left');
    bpmBadge(600, 70);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 60 - m * 46, 130, 15, m < R.miss ? C.red : '#3a3a5a');
    if (R.combo >= 3) txt('x' + R.combo, W - 40, 66, 52, C.gold, 'right');
    txt(Math.floor(R.dispP) + ' / ' + Math.ceil(R.goal), 420, 136, 34, C.white, 'left');
    var progress = Math.max(0, Math.min(1, R.songT / R.bt[R.nBeats]));
    game.draw.rect(36, 196, W - 72, 12, '#1a1a3a');
    game.draw.rect(36, 196, (W - 72) * progress, 12, ST_COL[stageOf(R.beatN)]);
    drawCourse();
  }

  function drawResult(t) {
    game.draw.rect(40, 360, W - 80, 560, C.ink, 0.85);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, 440, 96, R.ok ? C.gold : C.red);
    txt('SCORE ' + R.score, W / 2, 540, 60, C.white);
    txt('PERFECT ' + R.perfect + '  GOOD ' + R.good + '  MISS ' + R.miss, W / 2, 616, 34, C.gold);
    txt(R.strokes + ' / ' + R.slots.length + '   x' + R.maxCombo, W / 2, 686, 44, ST_COL[0]);
    if (R.ok && R.score > R.prevBest) txt('NEW RECORD', W / 2, 776, 58, Math.floor(t * 6) % 2 ? C.gold : C.white);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, 776, 44, C.gold);
    if (!R.ok) {
      var need = Math.max(1, Math.ceil((R.goal - R.P) / 0.75));
      txt('あと' + need + 'かき', W / 2, 862, 50, C.red);
    }
  }

  function drawAttractHud(t) {
    game.draw.rect(0, 0, W, 226, C.ink, 0.6);
    var bob = Math.round(Math.sin(t * 2.4) * 2) * 4;
    game.draw.text(GAME_TITLE, W / 2 + 8, 92 + bob, { size: 104, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 84 + bob, { size: 104, color: C.gold, bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 182, 40, C.white);
    drawCourse();
    if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 50, C.gold);
    else txt('TAP TO START', W / 2, H * 0.965, 44, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || !R || R.over) return;
    if (!R.running) { game.audio.play('se_tap', 0.2); game.fx.burst(x, y, { color: C.white, count: 3, speed: 100 }); return; }
    var r = stroke();
    if (r === 'perfect' || r === 'good') game.fx.burst(CATCH_X, WATER_Y, { color: C.white, count: 6, speed: 220 });
    else if (r === 'air') game.fx.burst(x, y, { color: C.white, count: 3, speed: 90 });
  });
  game.onTap(function() {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (!R) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepClock(dt);
      tickRun(dt);
      drawWorld(t);
      game.draw.hand(CATCH_X + 140, LANE_Y + 150 + (demo.press > 0 ? 24 : 0), { press: demo.press > 0, scale: 16 });
      drawAttractHud(t);
      return;
    }

    if (state === S.RESULT) {
      tickRun(dt);
      drawWorld(t);
      drawHud();
      drawResult(t);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 42, C.white);
      return;
    }

    // ---- PLAYING ----
    if (R.over) {
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, strokes: R.strokes, maxCombo: R.maxCombo, lead: Math.round((R.P - R.goal) * 10) / 10 };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    } else if (R.ready > 0) {
      R.ready -= dt;
      if (R.ready <= 0) { R.running = true; R.beatT = 0; R.beatN = 0; onBeat(0); game.audio.play('se_tap', 0.4); }
    } else {
      stepClock(dt);
    }
    tickRun(dt);

    drawWorld(t);
    drawHud();
    if (R.ready > 0) txt(R.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 120, C.gold);
    if (R.over && R.ok) txt('FINISH', W / 2, H * 0.44, 110, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
