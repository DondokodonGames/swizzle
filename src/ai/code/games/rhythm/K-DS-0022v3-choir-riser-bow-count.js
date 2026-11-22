// K-DS-0022v3-choir-riser-bow-count.js
// 雛壇の会釈かぞえ — 合唱コンクールの雛壇を1拍に1人ずつ伝ってくる会釈の人数を数え、自分の番でその数ぴったりだけ拍に乗って頭を下げる。途中で表拍から裏拍へ切り替わる
// 操作: 会釈が伝わってくる間は数えるだけ(ここで頭を下げるとMISS)。前の団員まで来たら、次の拍から画面のどこでもタップで1回ずつ会釈(一番近い拍の頭からのずれでPERFECT/GOOD)。伝わってきた人数ぴったりで止める。多すぎ・拍外れ・同じ拍の二度打ちはその場でMISS、窓が閉じて足りなくてもMISS。中盤で指揮者が両手を上げ、伴奏と拍ランプが裏拍に切り替わった後は、会釈も自分も裏拍
// 終わり: 4回(3人→4人→切り替え→4人→6人・約21秒)を通してCLEAR(判定点+ぴったりボーナス+残りライフ)。MISS 3回でGAME OVER
// @mechanic: count_exact
// @theme: choir_riser_bow_count
// 世界観: 合唱コンクールの雛壇の端に立つ団員が、隣から伝わってくる会釈の拍を数え、伝わってきた人数ぴったりだけ伴奏の拍に乗って客席へ頭を下げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・数ぴったりの回数・PERFECT/GOOD/MISS数
// スタイル: 2000s ARCADE POP

(function(game) {
  var STYLE = { bg: ['#fff4fb', '#ffd0ea', '#c8d8ff'], main: ['#ff3a8a', '#2ab8ff', '#ffd200'], accent: ['#ffffff', '#7a3aff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステル背景、原色+太い白縁、光の柱と星の物量
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], bg2: STYLE.bg[2], pink: STYLE.main[0], cyan: STYLE.main[1], yel: STYLE.main[2],
    white: STYLE.accent[0], violet: STYLE.accent[1],
    ink: '#2a1a40', skin: '#ffd6b0', hair: '#3a2440', riser: '#f4ecff', riserF: '#c8b4f0', riserD: '#9a84d0',
    floor0: '#ffe0f2', floor1: '#d8c8ff', good: '#2ad86a', bad: '#ff3a3a', dim: '#b8a8d8', gold: '#ffb400'
  };

  var GAME_TITLE = 'BOW COUNT';
  var BPM = 144, SPB = 60 / BPM, BEATS = 50;
  var TIME_LIMIT = 21;                 // 50拍 × 0.417秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.12;
  var LIVES = 3;
  var MEDLEY_AT = 20, PART_B = 24;     // 20拍目から1小節かけて予告、24拍目から裏拍
  // 各回: tel=合図の拍、n=伝わる人数、off=0 表拍 / 0.5 裏拍
  var PLAN = [{ tel: 0, n: 3, off: 0 }, { tel: 9, n: 4, off: 0 }, { tel: 24, n: 4, off: 0.5 }, { tel: 35, n: 6, off: 0.5 }];
  var DEMO_PLAN = [{ tel: 0, n: 3, off: 0 }];
  var DEMO_BEATS = 9;
  var DEMO_CYCLE = DEMO_BEATS * SPB + 1.2;

  // 伴奏(オリジナル): 前半は行進の4拍(1・3拍にベース、2・4拍に和音)、後半は裏拍に和音を刻む
  var PROG = ['C', 'Am', 'F', 'G', 'C', 'G', 'F', 'C', 'Am', 'F', 'G', 'C', 'C'];
  var BASS = { C: 'C3', Am: 'A2', F: 'F2', G: 'G2' };
  var FIFTH = { C: 'G2', Am: 'E3', F: 'C3', G: 'D3' };
  var CHORD = { C: ['E4', 'G4'], Am: ['C4', 'E4'], F: ['A4', 'C5'], G: ['B3', 'D4'] };
  var MEL = ['E5', 'G5', 'C6', 'G5', 'A5', 'E5', 'C5', 'E5', 'F5', 'A5', 'C6', 'A5', 'G5', 'D5', 'B4', 'D5'];
  var CHAIN_NOTES = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];

  // 雛壇: 上段 左→右(0-4)、中段 右→左(5-9)、下段 左→右(10-14)、端の自分(15)
  var TIER_Y = [660, 850, 1040];
  var COL_X = [130, 275, 420, 565, 710];
  var ME = 15;
  var SEATS = [];
  (function() {
    for (var t = 0; t < 3; t++) for (var c = 0; c < 5; c++) {
      var cc = t === 1 ? 4 - c : c;
      SEATS.push({ x: COL_X[cc], y: TIER_Y[t], tier: t });
    }
    SEATS.push({ x: 900, y: TIER_Y[2], tier: 2 });
  })();
  var BTN_X = 620, BTN_Y = Math.round(H * 0.865), BTN_R = 120;

  // ── スプライト ─────────────────────────────────────────
  var SING = [
    '...hhhh...', '..hhhhhh..', '..skssks..', '..ssssss..', '...smms...', '..wwwwww..', '.rrrwwrrr.',
    '.rrrrrrrr.', '.rrrrrrrr.', '.srrrrrrs.', '..rrrrrr..', '..rrrrrr..', '..rr..rr..', '..kk..kk..'
  ];
  var HUM = [
    '...hhhh...', '..hhhhhh..', '..skssks..', '..ssssss..', '...ssss...', '..wwwwww..', '.rrrwwrrr.',
    '.rrrrrrrr.', '.rrrrrrrr.', '.srrrrrrs.', '..rrrrrr..', '..rrrrrr..', '..rr..rr..', '..kk..kk..'
  ];
  var BOW = [
    '..........', '..........', '..........', '...hhhh...', '..hhhhhh..', '.shhhhhhs.', '.rrwwwwrr.',
    '.rrrrrrrr.', '.rrrrrrrr.', '.srrrrrrs.', '..rrrrrr..', '..rrrrrr..', '..rr..rr..', '..kk..kk..'
  ];
  var OOPS = [
    '...hhhh...', '..hhhhhh..', '..skssks..', '..ssssss..', '...skks...', '..wwwwww..', 's.rrwwrr.s',
    'srrrrrrrrs', '.rrrrrrrr.', '..rrrrrr..', '..rrrrrr..', '..rrrrrr..', '..rr..rr..', '..kk..kk..'
  ];
  // 指揮者(後ろ姿)
  var COND = [
    '....hhhh....', '...hhhhhh...', '...hhhhhh...', '....hhhh....', '..kkkkkkkk..', '.kkkkkkkkkk.',
    '.kkkkwwkkkk.', '.kkkkkkkkkk.', '..kkkkkkkk..', '..kkkkkkkk..', '..kkk..kkk..', '..kkk..kkk..', '..ddd..ddd..'
  ];
  var STAR = ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'];
  var TIER_PAL = [
    { h: C.hair, s: C.skin, k: C.ink, m: '#e0406a', w: C.white, r: C.cyan },
    { h: C.hair, s: C.skin, k: C.ink, m: '#e0406a', w: C.white, r: C.violet },
    { h: C.hair, s: C.skin, k: C.ink, m: '#e0406a', w: C.white, r: C.pink }
  ];
  var ME_PAL = { h: '#5a3010', s: C.skin, k: C.ink, m: '#e0406a', w: C.yel, r: C.gold };
  var WHITE_PAL = { h: '#fff', s: '#fff', k: '#fff', m: '#fff', w: '#fff', r: '#fff' };
  var COND_PAL = { h: '#d8d8e8', k: '#2a2a3a', w: C.white, d: '#111111' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, cyc: 0, ti: 0, plan: [], press: 0, gx: BTN_X, gy: BTN_Y + 40 };

  // 白縁の太い文字(ARCADE POP)
  function txt(str, x, y, sz, col, align) {
    var o = { size: sz, color: C.white, bold: true, align: align || 'center' };
    var d = Math.max(3, Math.round(sz / 12));
    game.draw.text(str, x + d, y + d + 2, { size: sz, color: C.violet, bold: true, align: align || 'center' });
    game.draw.text(str, x - d, y, o); game.draw.text(str, x + d, y, o);
    game.draw.text(str, x, y - d, o); game.draw.text(str, x, y + d, o);
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var plan = isDemo ? DEMO_PLAN : PLAN;
    var rounds = [];
    for (var i = 0; i < plan.length; i++) {
      var p = plan[i];
      rounds.push({ tel: p.tel, n: p.n, off: p.off, s0: p.tel + 1, ws: p.tel + p.n + 1, we: p.tel + 2 * p.n + 1, count: 0, slots: [], st: 'wait', over: false });
    }
    var bows = [];
    for (var k = 0; k <= ME; k++) bows.push(0);
    return {
      demo: isDemo, rounds: rounds, beats: isDemo ? DEMO_BEATS : BEATS,
      clock: isDemo ? -0.3 : -READY_T, eIdx: isDemo ? -1 : -4,
      lives: LIVES, score: 0, combo: 0, perfect: 0, good: 0, miss: 0, exact: 0,
      bows: bows, me: 0, oops: 0, flash: 0, stop: 0, pulse: 0, offPulse: 0, announce: 0, partB: false,
      over: false, ok: false, endWait: 0, prevBest: game.best, cueR: -1
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    game.audio.stopBgm();
    if (state === S.PLAYING) game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5]], { tempo: BPM * 2, wave: 'triangle', volume: 0.06 });
  }

  function stepTime(r, k) { return (k + r.off) * SPB; }
  function roundAtStep(b, off) {
    for (var i = 0; i < R.rounds.length; i++) if (R.rounds[i].off === off && b >= R.rounds[i].tel && b <= R.rounds[i].we) return R.rounds[i];
    return null;
  }

  function accomp(i8) {
    var b = Math.floor(i8 / 2), odd = i8 % 2 === 1;
    var bar = Math.floor(b / 4), k = b % 4;
    var ch = PROG[Math.min(PROG.length - 1, bar)];
    var v = R.demo ? 0.4 : 1;
    var swing = b >= PART_B;
    if (!odd) {
      if (k === 0 || k === 2) game.audio.tone(BASS[ch], SPB * 0.8, { wave: 'triangle', volume: 0.13 * v });
      if (!swing && (k === 1 || k === 3)) { game.audio.tone(CHORD[ch][0], SPB * 0.4, { wave: 'square', volume: 0.03 * v }); game.audio.tone(CHORD[ch][1], SPB * 0.4, { wave: 'square', volume: 0.03 * v }); }
      if (swing && (k === 1 || k === 3)) game.audio.tone(FIFTH[ch], SPB * 0.5, { wave: 'triangle', volume: 0.09 * v });
      game.audio.tone(MEL[b % MEL.length], SPB * 0.7, { wave: 'sine', volume: 0.045 * v });
    } else if (swing) {
      game.audio.tone(CHORD[ch][0], SPB * 0.3, { wave: 'square', volume: 0.04 * v });
      game.audio.tone(CHORD[ch][1], SPB * 0.3, { wave: 'square', volume: 0.035 * v });
    }
  }

  function onTick(i8) {
    var b = Math.floor(i8 / 2), odd = i8 % 2 === 1;
    if (!odd) R.pulse = 1; else R.offPulse = 1;
    if (i8 < 0) {
      if (!R.demo && !odd) game.audio.tone(b === -1 ? 'G5' : 'C5', 0.07, { wave: 'square', volume: 0.07 });
      return;
    }
    if (b >= R.beats) return;
    accomp(i8);
    // 切り替えの予告(1小節前): 指揮者が両手を上げ、光の柱の色が変わり、上がる音
    if (!R.demo && !odd && b === MEDLEY_AT) {
      R.announce = 4 * SPB;
      game.audio.melody([['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['B5', 0.25], ['D6', 1]], { tempo: BPM, wave: 'triangle', volume: 0.07 });
      game.fx.popup('♪', W / 2, 420, { color: C.violet, size: 90 });
    }
    if (!R.demo && !odd && b === PART_B) { R.partB = true; game.audio.play('se_powerup', 0.4); }
    var off = odd ? 0.5 : 0;
    var r = roundAtStep(b, off);
    if (!r) return;
    if (b >= r.s0 && b < r.ws) {
      // 会釈が1人ずつ伝わる(人ごとに音が上がる)
      var idx = ME - r.n + (b - r.s0);
      R.bows[idx] = 1;
      game.audio.tone(CHAIN_NOTES[Math.min(6, b - r.s0)], 0.1, { wave: 'triangle', volume: R.demo ? 0.02 : 0.08 });
      if (b === r.ws - 1) { R.cueR = R.rounds.indexOf(r); if (!R.demo) game.audio.tone('C6', 0.06, { wave: 'square', volume: 0.05, slide: 200 }); }
    }
  }

  function windowRound() {
    for (var i = 0; i < R.rounds.length; i++) {
      var r = R.rounds[i];
      if (r.st !== 'wait') continue;
      if (R.clock >= stepTime(r, r.ws) - GOOD_W && R.clock <= stepTime(r, r.we) + GOOD_W) return r;
    }
    return null;
  }

  // 1回頭を下げる(本番の指も ATTRACT のゴーストも同じ関数)
  function bowMe() {
    if (!R || R.over || R.stop > 0 || R.clock < -0.05) return 'locked';
    R.me = 1;
    var r = windowRound();
    if (!r || r.over) { missMe(); return 'miss'; }           // 番の外で頭を下げた
    var k = Math.round(R.clock / SPB - r.off);
    var d = Math.abs(R.clock - stepTime(r, k));
    if (d > GOOD_W || r.slots.indexOf(k) >= 0 || k < r.ws || k > r.we) { missMe(); return 'miss'; }
    r.count++; r.slots.push(k);
    if (r.count > r.n) { r.over = true; missMe(); return 'over'; }
    R.combo++;
    var perfect = d <= PERFECT_W;
    if (perfect) { R.perfect++; R.score += 100 + Math.min(8, R.combo) * 10; } else { R.good++; R.score += 50 + Math.min(8, R.combo) * 5; }
    var me = SEATS[ME];
    game.feedback.good(me.x, me.y - 190, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.pink : C.cyan, size: perfect ? 50 : 42, count: perfect ? 14 : 8, volume: R.demo ? 0.04 : 0.45 });
    return 'ok';
  }

  function missMe() {
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.4; R.flash = 0.4; R.oops = 1.0; R.me = 0;
    if (!R.demo) game.audio.tone(140, 0.24, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    var me = SEATS[ME];
    game.feedback.bad(me.x, me.y - 190, { text: 'MISS', shake: R.demo ? 3 : 10, volume: R.demo ? 0.03 : 0.6 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function resolveRound(r) {
    if (r.over) { r.st = 'miss'; return; }
    if (r.count === r.n) {
      r.st = 'exact'; R.exact++; R.score += 300;
      game.fx.popup('NICE', SEATS[ME].x - 60, SEATS[ME].y - 260, { color: C.violet, size: R.demo ? 60 : 80 });
      game.fx.burst(SEATS[ME].x, SEATS[ME].y - 120, { color: C.yel, count: 18, speed: 380 });
      if (!R.demo) {
        game.audio.play('se_milestone', 0.45);
        if (R.exact === 2) game.fx.popup(R.exact + ' / ' + R.rounds.length, W / 2, H * 0.3, { color: C.pink, size: 72 });
      }
      return;
    }
    r.st = 'miss';
    game.fx.popup('あと' + (r.n - r.count) + '回', SEATS[ME].x - 60, SEATS[ME].y - 260, { color: C.pink, size: 54 });
    missMe();
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    if (ok) R.score += R.lives * 150;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) for (var i = 0; i < 8; i++) game.fx.burst(120 + i * 120, 500 + (i % 3) * 200, { color: [C.pink, C.cyan, C.yel, C.violet][i % 4], count: 16, speed: 420 });
    if (R.score > R.prevBest && R.prevBest > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.22, { color: C.pink, size: 76 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 4);
    R.offPulse = Math.max(0, R.offPulse - dt * 4);
    R.flash = Math.max(0, R.flash - dt);
    R.oops = Math.max(0, R.oops - dt);
    R.announce = Math.max(0, R.announce - dt);
    R.me = Math.max(0, R.me - dt * 4);
    for (var k = 0; k <= ME; k++) R.bows[k] = Math.max(0, R.bows[k] - dt * 2.6);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    var was = R.clock;
    R.clock += dt;
    if (!R.demo && was < -0.35 && R.clock >= -0.35) game.audio.play('se_tap', 0.4);
    var i8 = Math.floor(R.clock / (SPB / 2));
    while (R.eIdx < i8) { R.eIdx++; onTick(R.eIdx); }
    for (var i = 0; i < R.rounds.length; i++) {
      var r = R.rounds[i];
      if (r.st === 'wait' && R.clock > stepTime(r, r.we) + GOOD_W) { resolveRound(r); if (R.stop > 0) return; }
    }
    if (!R.demo && (R.clock >= R.beats * SPB || R.clock > TIME_LIMIT + 0.5)) endRun(R.lives > 0);
  }

  // ATTRACT: 3人伝わる→奇数周は3回会釈してNICE、偶数周は4回目を下げてしまいMISS
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true); demo.cyc++; demo.ti = 0;
      demo.plan = demo.cyc % 2 === 1 ? [4, 5, 6] : [4, 5, 6, 7];
    }
    stepRun(dt);
    if (demo.ti < demo.plan.length && R.stop <= 0 && R.clock >= demo.plan[demo.ti] * SPB - 0.004) {
      bowMe(); demo.ti++; demo.press = 0.15;
    }
    demo.press = Math.max(0, demo.press - dt);
    demo.gx += (BTN_X + 30 - demo.gx) * Math.min(1, dt * 12);
    demo.gy += (BTN_Y + 40 - (demo.press > 0 ? 24 : 0) - demo.gy) * Math.min(1, dt * 14);
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawStage() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg0], [0.45, C.bg1], [0.7, C.bg2], [1, C.floor1]]);
    // 光の柱(後半は色が入れ替わる)
    var cols = R.partB || R.announce > 0 ? [C.cyan, C.yel, C.violet] : [C.pink, C.yel, C.cyan];
    for (var i = 0; i < 6; i++) {
      var px = 90 + i * 180 + Math.sin(e * 0.9 + i) * 40;
      var a = 0.12 + 0.06 * Math.sin(e * 2 + i) + (i % 2 === 0 ? R.pulse : R.offPulse) * 0.1;
      game.draw.rect(px - 40, 230, 80, 1000, cols[i % 3], a);
      game.draw.rect(px - 14, 230, 28, 1000, C.white, a * 0.8);
    }
    // 星
    for (var s = 0; s < 12; s++) {
      var sx = (s * 197 + 60) % W, sy = 260 + (s * 113) % 300;
      var tw = 0.5 + 0.5 * Math.sin(e * 3 + s * 1.7);
      game.draw.sprite(STAR, { y: s % 2 ? C.yel : C.white }, sx, sy, 4 + tw * 3, { anchor: 'center', alpha: 0.5 + tw * 0.5 });
    }
    // 虹のアーチ(後半の予告で流れる)
    if (R.announce > 0 || R.partB) {
      var k = R.announce > 0 ? 1 - R.announce / (4 * SPB) : 1;
      var rb = [C.pink, C.yel, C.cyan, C.violet];
      for (var j = 0; j < 4; j++) game.draw.rect(0, 470 + j * 16, W * k, 14, rb[j], 0.35);
    }
    // 床(つやのある舞台)
    game.draw.gradient(1180, H, [[0, C.floor0], [1, C.floor1]]);
    for (var f = 0; f < 6; f++) game.draw.rect(0, 1200 + f * f * 14, W, 3, C.white, 0.5);
  }

  function drawLamps() {
    var y = 300;
    game.draw.rect(140, y - 50, 800, 100, C.white, 0.75);
    game.draw.rect(140, y - 50, 800, 6, C.violet);
    var b = Math.floor(R.clock / SPB), inBar = ((b % 4) + 4) % 4;
    var half = R.clock / SPB - b;
    for (var k = 0; k < 4; k++) {
      var lx = 230 + k * 200;
      var on = R.clock >= 0 && k === inBar && half < 0.5;
      var big = k === 0 ? 30 : 24;
      game.draw.circle(lx, y, big + (on ? R.pulse * 8 : 0), R.partB ? C.dim : (on ? C.pink : '#e8dcf8'));
      game.draw.circle(lx, y, big - 8, C.white, on && !R.partB ? 0.8 : 0.3);
      // 裏拍の菱形(後半はこちらが光る)
      var dx = lx + 100;
      var offOn = R.clock >= 0 && k === inBar && half >= 0.5;
      var s = 18 + (offOn ? R.offPulse * 8 : 0);
      var col = R.partB ? (offOn ? C.cyan : '#cfe8ff') : '#eee6f8';
      for (var t = -s; t < s; t += 4) { var w = s - Math.abs(t + 2); game.draw.rect(dx - w, y + t, w * 2, 4.5, col); }
    }
  }

  function drawRisers() {
    for (var t = 0; t < 3; t++) {
      var y = TIER_Y[t];
      game.draw.rect(40, y - 4, t === 2 ? 1010 : 780, 18, C.white);
      game.draw.rect(40, y + 14, t === 2 ? 1010 : 780, 70, C.riserF);
      game.draw.rect(40, y + 80, t === 2 ? 1010 : 780, 8, C.riserD);
    }
  }

  function drawMembers() {
    var e = game.time.elapsed;
    var b = R.clock / SPB;
    // 最初の団員にスポットライト(会釈が始まる1.5拍前から)
    for (var i = 0; i < R.rounds.length; i++) {
      var r = R.rounds[i];
      var startIdx = ME - r.n;
      if (b >= r.tel - 0.5 + r.off && b < r.s0 + r.off + 0.6) {
        var p = SEATS[startIdx];
        var blink = Math.floor(e * 10) % 2 === 0;
        game.draw.rect(p.x - 60, 230, 120, p.y - 230, C.yel, blink ? 0.3 : 0.18);
        game.draw.circle(p.x, p.y - 4, 70, C.yel, 0.35);
      }
    }
    for (var k = 0; k < ME; k++) {
      var s = SEATS[k];
      var pal = TIER_PAL[s.tier];
      var bow = R.bows[k] > 0.25;
      var sing = Math.floor(b * 2 + k) % 2 === 0;
      var sway = Math.sin(e * 2.6 + k * 0.8) * 3;
      game.draw.circle(s.x, s.y + 6, 34, C.violet, 0.18);
      if (R.bows[k] > 0) game.draw.circle(s.x, s.y - 60, 50 * R.bows[k] + 20, C.yel, 0.25 * R.bows[k]);
      game.draw.sprite(bow ? BOW : (sing ? SING : HUM), pal, s.x + sway, s.y - 54, 8, { anchor: 'center' });
    }
    // 自分(端)
    var me = SEATS[ME];
    var cue = R.cueR >= 0 && R.rounds[R.cueR] && R.rounds[R.cueR].st === 'wait';
    var wr = windowRound();
    if (wr || cue) game.draw.rect(me.x - 80, 230, 160, me.y - 230, C.pink, 0.16 + 0.08 * Math.sin(e * 12));
    game.draw.circle(me.x, me.y + 6, 44, C.violet, 0.25);
    var flash = R.flash > 0;
    if (flash) game.draw.circle(me.x, me.y - 60, 90, C.white, 0.7);
    var spr = R.oops > 0 ? OOPS : (R.me > 0.2 ? BOW : SING);
    game.draw.sprite(spr, flash ? WHITE_PAL : ME_PAL, me.x, me.y - 52 - (flash ? 10 : 0), flash ? 10 : 8, { anchor: 'center' });
    // 自分が下げた数(星)
    var cr = wr || (R.cueR >= 0 ? R.rounds[R.cueR] : null);
    if (cr) {
      for (var c = 0; c < Math.min(8, cr.count); c++) {
        var over = cr.over && c === cr.count - 1;
        game.draw.sprite(STAR, { y: over ? C.bad : C.gold }, me.x - 70 + (c % 4) * 46, me.y - 180 - Math.floor(c / 4) * 44, 8, { anchor: 'center' });
      }
      if (cr.st !== 'wait') {
        // 伝わってきた人数を答え合わせ(紫の点)
        for (var n = 0; n < cr.n; n++) game.draw.circle(me.x - 70 + (n % 4) * 46, me.y - 260 - Math.floor(n / 4) * 30, 11, C.violet);
      }
    }
  }

  function drawConductor() {
    var e = game.time.elapsed;
    var x = 190, y = 1330;
    game.draw.rect(x - 90, y + 40, 180, 40, C.violet);
    game.draw.rect(x - 90, y + 40, 180, 8, C.white);
    game.draw.sprite(COND, COND_PAL, x, y - 40, 9, { anchor: 'center' });
    var up = R.announce > 0;
    var b = R.clock / SPB, k = ((Math.floor(b) % 4) + 4) % 4, f = b - Math.floor(b);
    // 4拍の図形を振る(下・左・右・上)
    var TX = [0, -60, 70, 0], TY = [70, 20, 20, -60];
    var nk = (k + 1) % 4;
    var bx = x + 70 + TX[k] + (TX[nk] - TX[k]) * f, by = y - 110 + TY[k] + (TY[nk] - TY[k]) * f;
    if (R.clock < 0) { bx = x + 70; by = y - 150 + Math.sin(e * 4) * 10; }
    if (up) { bx = x + 90; by = y - 220; game.draw.line(x - 50, y - 70, x - 90, y - 220, '#2a2a3a', 14); }
    game.draw.line(x + 50, y - 70, bx, by, '#2a2a3a', 14);
    game.draw.line(bx, by, bx + 30, by - 50, C.white, 5);
    game.draw.circle(bx + 30, by - 50, 6, C.yel);
  }

  function drawButton() {
    var e = game.time.elapsed;
    var wr = windowRound();
    var live = !!wr && !R.over;
    var push = R.me > 0.2 ? 14 : 0;
    game.draw.circle(BTN_X, BTN_Y + 18, BTN_R + 12, C.violet, 0.4);
    game.draw.circle(BTN_X, BTN_Y + push, BTN_R + 12, C.white);
    game.draw.circle(BTN_X, BTN_Y + push, BTN_R, live ? C.pink : C.dim);
    game.draw.circle(BTN_X - 30, BTN_Y - 40 + push, 36, C.white, 0.45);
    if (live) game.draw.circle(BTN_X, BTN_Y + push, BTN_R + 30 + Math.sin(e * 12) * 8, C.pink, 0.18);
    game.draw.sprite(R.me > 0.2 ? BOW : SING, ME_PAL, BTN_X, BTN_Y + push, 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.white, 0.9);
    game.draw.rect(0, 220, W, 8, C.pink);
    txt('SCORE ' + R.score, 40, 72, 44, C.pink, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(STAR, { y: i < R.lives ? C.gold : '#ddd0ee' }, W - 70 - i * 70, 66, 10, { anchor: 'center' });
    var cur = 0;
    for (var k = 0; k < R.rounds.length; k++) if (R.rounds[k].st !== 'wait') cur++;
    txt(Math.min(R.rounds.length, cur + 1) + ' / ' + R.rounds.length, W / 2, 150, 42, C.violet);
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 36, C.cyan, 'left');
    var progress = clamp(R.clock / (R.beats * SPB), 0, 1);
    game.draw.rect(40, 192, W - 80, 14, C.dim, 0.5);
    game.draw.rect(40, 192, (W - 80) * progress, 14, C.pink);
    game.draw.rect(40 + (W - 80) * (PART_B / R.beats) - 3, 186, 6, 26, C.violet);
    if (R.clock < 0 && !R.over) txt(R.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 100, C.pink);
  }

  function drawResult() {
    game.draw.rect(60, H * 0.2, W - 120, H * 0.38, C.white, 0.92);
    game.draw.rect(60, H * 0.2, W - 120, 10, R.ok ? C.good : C.bad);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.265, 92, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.33, 58, C.pink);
    txt('PERFECT ' + R.perfect + '  GOOD ' + R.good + '  MISS ' + R.miss, W / 2, H * 0.38, 34, C.violet);
    txt('NICE ' + R.exact + ' / ' + R.rounds.length, W / 2, H * 0.425, 42, C.cyan);
    if (R.ok && R.score > R.prevBest && R.prevBest > 0) txt('NEW RECORD', W / 2, H * 0.48, 54, C.gold);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, H * 0.48, 42, C.gold);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.rounds.length; i++) if (R.rounds[i].st !== 'exact') left++;
      txt('あと' + Math.max(1, left) + '回', W / 2, H * 0.535, 46, C.pink);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    game.draw.rect(0, 0, W, 226, C.white, 0.9);
    game.draw.rect(0, 220, W, 8, C.pink);
    var bob = Math.sin(e * 2.6) * 6;
    txt(GAME_TITLE, W / 2, 100 + bob, 100, Math.floor(e * 4) % 2 === 0 ? C.pink : C.violet);
    txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.cyan);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.pink);
    else txt('TAP TO START', W / 2, H * 0.975, 42, C.violet);
  }

  function drawWorld() {
    drawStage();
    drawLamps();
    drawRisers();
    drawMembers();
    drawConductor();
    drawButton();
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; demo.cyc = 0; return; }
    var res = bowMe();
    if (res === 'ok') {
      game.audio.tone(CHAIN_NOTES[Math.min(6, (windowRound() ? windowRound().count : 1) - 1)], 0.12, { wave: 'square', volume: 0.06 });
    } else if (res === 'locked') {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(BTN_X, BTN_Y, { color: C.dim, count: 4, speed: 90 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawHud();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.violet);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, exact: R.exact, rounds: R.rounds.length };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    demo.t = 0; demo.cyc = 0;
  });
})(game);
