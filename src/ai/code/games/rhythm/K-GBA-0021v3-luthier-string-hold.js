// K-GBA-0021v3-luthier-string-hold.js
// 弦張り工房 — 光った弦を拍の頭で押さえ、一拍ごとに一段ずつ高まる音が金の目印に満ちる拍ちょうどで離す。伴奏が抜ける2小節も拍を数えて待つ
// 操作: 弦が光った列(下の鍵ブロックか弦そのもの)を、迫る枠が鍵に重なる拍の頭で押さえる。押さえている間は1拍ごとに音の玉が1段上がり音が高まる。玉が金の目印の段に届く拍の頭で離す(押さえ・離しとも拍の頭からのずれで判定)。中盤2小節は伴奏・拍ランプ・玉の光が消えるので自分で拍を数える。後半は離す拍に次の弦を押さえる持ち替えが来る
// 終わり: 7本(約15秒)を張り終えればCLEAR。押さえ遅れ・早離し・押さえすぎのMISSが3回でGAME OVER
// @mechanic: hold_duration
// @theme: luthier_string_tension_hold
// 世界観: 楽器職人の工房で、弦張り職人が作業台に立てた木枠の箱琴の弦を押さえ続け、高まる音が満ちる拍で手を離して一本ずつ音の高さを合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・伴奏の抜けた小節で合わせた本数・最大コンボ
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体・直方体を上面/左面/右面の3明度で等角に積む。影は落とさず明度差だけで立体を出す
  var STYLE = { bg: ['#241a2e', '#46304a'], main: ['#e0a96d', '#b07a45', '#7d5230'], accent: ['#5fe3d0', '#ffd45e'] };
  var C = {
    wall0: STYLE.bg[0], wall1: STYLE.bg[1],
    teal: STYLE.accent[0], gold: STYLE.accent[1], red: '#ff5a5a',
    ink: '#140d18', white: '#fff6e8', string: '#f2e6c8', skin: '#f0c8a0', cap: '#5a3b2a'
  };
  var F = {
    wood: [STYLE.main[0], STYLE.main[1], STYLE.main[2]],
    dark: ['#6a5468', '#4d3c52', '#33283a'],
    metal: ['#d6dce6', '#a2aaba', '#6a7286'],
    teal: [STYLE.accent[0], '#3fb3a3', '#2a7f74'],
    gold: [STYLE.accent[1], '#e0a83a', '#a87a1e'],
    red: ['#ff7a7a', '#c83c3c', '#8e2626'],
    white: ['#ffffff', '#e8e8f0', '#c8c8d8']
  };

  var GAME_TITLE = 'STRING HOLD';
  var BPM = 120;
  var SPB = 60 / BPM;
  var TIME_LIMIT = 15;                 // 7.5小節 = 30拍 = 15秒
  var WIN_P = 0.07, WIN_G = 0.15, WIN_PRESS = 0.18;
  var LIVES = 3;
  var BREAK_A = 16, BREAK_B = 24;      // 伴奏が抜ける拍(5〜6小節目)
  // 等角の原点(枠の左柱の床)。P(u, v, z) → 画面
  var OX = 200, OY = 1180;
  var STR_U = [124, 268, 412, 556];
  var RUNG_Z0 = 180, RUNG_DZ = 108, RUNGS = 6;
  var KEY_V = 300, KEY_Z = 60;
  var BASE_HZ = [261.6, 329.6, 392.0, 440.0];
  var STEP_SEMI = [0, 2, 4, 7, 9, 12];
  // 弦の課題: s=弦, p=押さえる拍, n=押さえ続ける拍数(離す拍 = p + n)
  var TASKS = [
    { s: 0, p: 4, n: 2 }, { s: 2, p: 8, n: 3 }, { s: 1, p: 12, n: 2 }, { s: 3, p: 14, n: 2 },
    { s: 2, p: 17, n: 3 }, { s: 0, p: 21, n: 3 }, { s: 3, p: 25, n: 4 }
  ];
  var DEMO_TASKS = [{ s: 1, p: 4, n: 2 }, { s: 2, p: 8, n: 3 }, { s: 0, p: 12, n: 2 }];
  var DEMO_CYCLE = 17 * SPB + 1.4;
  var BASS = ['A2', 'F2', 'C3', 'G2'];
  var MEL = ['E5', 0, 'C5', 0, 'D5', 0, 'E5', 'G5', 'A5', 0, 'G5', 0, 'E5', 0, 'D5', 0];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, gx: W * 0.5, gy: H * 0.9 };

  // 弦張り職人(3明度の前掛け)。h=帽子 s=肌 e=目 c=上着 a/A=前掛け明/暗 k=靴
  var SMITH_A = ['...hhhh...', '..hhhhhh..', '..ssssss..', '..sesses..', '..ssssss..', '...ssss...', '.cccaaccc.', 'cccaAAaccc', 's.caAAac.s', '..caAAac..', '...aAAa...', '...k..k...'];
  var SMITH_B = ['...hhhh...', '..hhhhhh..', '..ssssss..', '..sesses..', '..ssssss..', '...ssss...', '.cccaaccc.', 'scc.AAaccs', '..caAAac..', '..caAAac..', '...aAAa...', '..k....k..'];
  var SMITH_PRESS = ['...hhhh...', '..hhhhhh..', '..ssssss..', '..sesses..', '..ssssss..', '...ssss...', '.cccaacccc', 'cccaAAa..s', 's.caAAac..', '..caAAac..', '...aAAa...', '...k..k...'];
  var SMITH_CHEER = ['s..hhhh..s', 'c.hhhhhh.c', 'c.ssssss.c', 'ccsesses.c', '.cssssssc.', '...ssss...', '..ccaacc..', '..caAAac..', '..caAAac..', '..caAAac..', '...aAAa...', '...k..k...'];
  var SMITH_OOPS = ['...hhhh...', 's.hhhhhh.s', 'c.ssssss.c', 'c.seeses.c', '.cssssssc.', '...sees...', '..ccaacc..', '..caAAac..', '..caAAac..', '..caAAac..', '...aAAa...', '...k..k...'];
  var PAL_SMITH = { h: C.cap, s: C.skin, e: C.ink, c: '#2a7f74', a: STYLE.main[0], A: STYLE.main[2], k: C.ink };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ── 等角ボクセル ─────────────────────────────────────
  function P(u, v, z) { return [OX + u - v, OY + (u + v) * 0.5 - z]; }
  // u∈[u0,u0+a], v∈[v0,v0+b], z∈[z0,z0+h] の直方体。f=[上面, 左面(v側), 右面(u側)]
  function box(u0, v0, z0, a, b, h, f) {
    var i, p, q, zt = z0 + h;
    if (a / 4 <= h / 3) {
      for (i = 0; i < a; i += 4) { p = P(u0 + i, v0 + b, zt); game.draw.rect(p[0], p[1], Math.min(4, a - i) + 0.6, h + 2, f[1]); }
    } else {
      for (i = 0; i <= h; i += 3) { p = P(u0, v0 + b, z0 + i); q = P(u0 + a, v0 + b, z0 + i); game.draw.line(p[0], p[1], q[0], q[1], f[1], 4); }
    }
    if (b / 4 <= h / 3) {
      for (i = 0; i < b; i += 4) { p = P(u0 + a, v0 + i, zt); game.draw.rect(p[0] - 4.6, p[1], 4.6, h + 2, f[2]); }
    } else {
      for (i = 0; i <= h; i += 3) { p = P(u0 + a, v0, z0 + i); q = P(u0 + a, v0 + b, z0 + i); game.draw.line(p[0], p[1], q[0], q[1], f[2], 4); }
    }
    if (b <= a) {
      for (i = 0; i <= b; i += 3) { p = P(u0, v0 + i, zt); q = P(u0 + a, v0 + i, zt); game.draw.line(p[0], p[1], q[0], q[1], f[0], 4); }
    } else {
      for (i = 0; i <= a; i += 3) { p = P(u0 + i, v0, zt); q = P(u0 + i, v0 + b, zt); game.draw.line(p[0], p[1], q[0], q[1], f[0], 4); }
    }
  }
  function cubeAt(u, v, z, s, f) { box(u - s / 2, v - s / 2, z, s, s, s, f); }

  function isBreak(beat) { return beat >= BREAK_A && beat < BREAK_B; }

  function newRun(isDemo) {
    var list = isDemo ? DEMO_TASKS : TASKS;
    var tasks = [];
    for (var i = 0; i < list.length; i++) {
      tasks.push({ s: list[i].s, p: list[i].p, n: list[i].n, r: list[i].p + list[i].n, st: 'wait', touch: null, rung: 0, flash: 0, pressGrade: '', brk: false });
    }
    var last = list[list.length - 1];
    return {
      demo: isDemo, tasks: tasks, songT: 0, beatIdx: -1, stepIdx: -1, ready: isDemo ? 0 : 0.8,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, brkOk: 0,
      keyDown: [0, 0, 0, 0], keyFlash: [0, 0, 0, 0], pulse: 0, cheer: 0, oops: 0, lampOn: 1,
      stop: 0, stopTask: null, over: false, ok: false, endWait: 0,
      endBeat: last.p + last.n + 1, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
  }

  // ── 音(拍クロック駆動。ブレイク小節は何も鳴らさない) ────────
  function playStep(st, vol) {
    var beat = st / 2;
    if (!R.demo && isBreak(Math.floor(beat))) return;
    var bar = Math.floor(beat / 4), inBar = beat % 4;
    var m = MEL[st % 16];
    if (m) game.audio.tone(m, SPB * 0.35, { wave: 'triangle', volume: 0.03 * vol });
    game.audio.tone(2400, 0.02, { wave: 'square', volume: 0.012 * vol });
    if (st % 2 === 0) {
      game.audio.tone(BASS[bar % 4], SPB * 0.8, { wave: 'triangle', volume: 0.1 * vol });
      if (inBar === 0 || inBar === 2) game.audio.tone(100, 0.09, { wave: 'square', volume: 0.08 * vol, slide: -50 });
      else game.audio.tone(240, 0.06, { wave: 'square', volume: 0.04 * vol, slide: -160 });
    }
    if (!R.demo && st === BREAK_A * 2 - 1) {   // ブレイク予告: 下降の合図
      game.audio.tone('E5', 0.08, { wave: 'square', volume: 0.06 });
      game.audio.tone('A4', 0.2, { wave: 'square', volume: 0.06, slide: -120 });
    }
    if (!R.demo && st === BREAK_B * 2) game.audio.tone(1300, 0.35, { wave: 'square', volume: 0.04, slide: -900 });
  }

  function taskHz(t, rung) { return BASE_HZ[t.s] * Math.pow(2, STEP_SEMI[clamp(rung, 0, RUNGS - 1)] / 12); }

  function onBeat(b) {
    R.pulse = 1;
    var vol = R.demo ? 0.45 : 1;
    var brk = !R.demo && isBreak(b);
    R.lampOn = brk ? 0 : 1;
    for (var i = 0; i < R.tasks.length; i++) {
      var t = R.tasks[i];
      if (t.st === 'wait' && b >= t.p - 4) {
        t.st = 'lit';
        if (!brk) game.audio.tone(taskHz(t, t.n), 0.12, { wave: 'triangle', volume: 0.05 * vol });   // 満ちる音の予告
      }
      if (t.st === 'hold') {
        var rung = b - t.p;
        if (rung > t.rung && rung <= t.n + 1) {
          t.rung = rung;
          if (!brk) game.audio.tone(taskHz(t, rung), SPB * 0.7, { wave: 'sawtooth', volume: (0.035 + rung * 0.008) * vol });
        }
      }
    }
  }

  // ── 判定 ──────────────────────────────────────────────
  function keyAt(x, y) {
    if (y < H * 0.25) return -1;
    var best = -1, bd = 1e9;
    for (var i = 0; i < 4; i++) {
      var d = Math.abs(x - (OX + STR_U[i]));
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 110 ? best : -1;
  }

  // 戻り値: 'press'|'early'|'wrong'|'none'
  function pressKey(k, id) {
    if (!R || R.over || R.ready > 0 || R.stop > 0 || k < 0) return 'none';
    R.keyDown[k] = 1;
    var now = R.songT;
    for (var i = 0; i < R.tasks.length; i++) {
      var t = R.tasks[i];
      if (t.s !== k || t.st !== 'lit') continue;
      var e = now - t.p * SPB;
      if (Math.abs(e) <= WIN_PRESS) {
        t.st = 'hold'; t.touch = id; t.rung = 0;
        t.pressGrade = Math.abs(e) <= WIN_P ? 'PERFECT' : 'GOOD';
        t.brk = !R.demo && (isBreak(t.p) || isBreak(t.r - 1));
        game.audio.tone(taskHz(t, 0), 0.18, { wave: 'triangle', volume: R.demo ? 0.05 : 0.1 });
        return 'press';
      }
      if (e < -WIN_PRESS && e > -SPB * 1.2) { missTask(t, 'early'); return 'early'; }
    }
    return 'wrong';
  }

  // 戻り値: 'PERFECT'|'GOOD'|'early'|'none'
  function releaseKey(id) {
    if (!R || R.over) return 'none';
    for (var i = 0; i < R.tasks.length; i++) {
      var t = R.tasks[i];
      if (t.st !== 'hold' || t.touch !== id) continue;
      R.keyDown[t.s] = 0;
      var e = R.songT - t.r * SPB;
      if (e < -WIN_G) { missTask(t, 'early', -e); return 'early'; }
      clearTask(t, Math.abs(e) <= WIN_P ? 'PERFECT' : 'GOOD');
      return 'ok';
    }
    for (var k = 0; k < 4; k++) R.keyDown[k] = 0;
    return 'none';
  }

  function keyPos(k) { return P(STR_U[k] + KEY_V, KEY_V, KEY_Z + 70); }
  function rungPos(k, r) { return P(STR_U[k], 0, RUNG_Z0 + r * RUNG_DZ); }

  function clearTask(t, grade) {
    t.st = 'done'; t.touch = null;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var add = (grade === 'PERFECT' ? 100 : 60) + (t.pressGrade === 'PERFECT' ? 30 : 15) + R.combo * 10;
    if (t.brk) { add = Math.round(add * 1.5); R.brkOk++; }
    if (grade === 'PERFECT') R.perfect++; else R.good++;
    R.score += add; R.cheer = 0.9;
    var p = rungPos(t.s, t.n);
    game.audio.tone(taskHz(t, t.n), 0.45, { wave: 'sine', volume: R.demo ? 0.06 : 0.12 });   // 音が満ちる
    game.feedback.good(p[0], p[1] - 40, { text: grade, color: grade === 'PERFECT' ? C.gold : C.teal, count: 14 });
    game.fx.popup('+' + add, p[0], p[1] + 50, { color: C.white, size: 44 });
    game.fx.burst(p[0], p[1], { color: C.teal, count: 10, speed: 260 });
    if (!R.demo && (R.combo === 3 || R.combo === 5 || R.combo === 7)) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.17, { color: C.gold, size: 68 });
      game.audio.play('se_milestone', 0.5);
    }
    if (!R.demo && t.brk) game.fx.popup('NICE', W / 2, H * 0.22, { color: C.teal, size: 60 });
  }

  function missTask(t, kind, earlyBy) {
    t.st = 'miss'; t.flash = 0.45; t.kind = kind; t.touch = null;
    R.keyDown[t.s] = 0;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopTask = t; R.oops = 1.4;
    R.keyFlash[t.s] = 0.45;
    t.earlyBy = earlyBy || 0;
    if (kind === 'over') game.audio.tone(taskHz(t, RUNGS - 1) * 1.06, 0.35, { wave: 'sawtooth', volume: R.demo ? 0.05 : 0.1, slide: 90 });
    else game.audio.tone(150, 0.3, { wave: 'sawtooth', volume: R.demo ? 0.05 : 0.1, slide: -70 });
  }

  function releaseStop() {
    var t = R.stopTask;
    R.stopTask = null;
    if (!t) return;
    var p = rungPos(t.s, Math.max(1, Math.min(t.rung, t.n)));
    game.feedback.bad(p[0], p[1], { text: 'MISS' });
    if (t.kind === 'early' && t.earlyBy > 0) {
      var beats = t.earlyBy / SPB;
      var label = beats >= 0.6 ? 'あと' + Math.round(beats) + '拍' : 'あと' + t.earlyBy.toFixed(2) + '秒';
      game.fx.popup(label, p[0], p[1] - 90, { color: C.gold, size: 46 });
    }
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.7;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: [['C3', 3]] });
      for (var i = 0; i < 4; i++) { var kp = rungPos(i, 5); game.fx.burst(kp[0], kp[1], { color: i % 2 ? C.gold : C.teal, count: 16, speed: 380 }); }
    } else {
      game.audio.melody([['A4', 0.5], ['F4', 0.5], ['D4', 2]], { tempo: BPM, wave: 'triangle', volume: 0.06 });
    }
    if (R.score > R.prevBest && R.score > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.cheer = Math.max(0, R.cheer - dt);
    R.oops = Math.max(0, R.oops - dt);
    for (var k = 0; k < 4; k++) R.keyFlash[k] = Math.max(0, R.keyFlash[k] - dt);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) { R.stepIdx++; playStep(R.stepIdx, R.demo ? 0.45 : 1); }
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    for (var i = 0; i < R.tasks.length; i++) {
      var t = R.tasks[i];
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt);
      if (t.st === 'lit' && R.songT > t.p * SPB + WIN_PRESS) { missTask(t, 'late'); return; }
      if (t.st === 'hold' && R.songT > t.r * SPB + WIN_G) { missTask(t, 'over'); return; }
    }
    if (!R.demo && (R.songT >= R.endBeat * SPB || R.songT >= TIME_LIMIT)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2本は拍の頭で押さえて満ちる拍で離す、3本目は押さえすぎの失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; demo.task = null; }
    var tgt = null;
    for (var i = 0; i < R.tasks.length; i++) {
      var t = R.tasks[i];
      if (t.st === 'lit' || t.st === 'hold' || t.st === 'wait') { tgt = t; break; }
    }
    if (tgt && R.stop <= 0) {
      var idx = R.tasks.indexOf(tgt);
      if (tgt.st === 'lit' && R.songT >= tgt.p * SPB) { pressKey(tgt.s, 'ghost'); demo.press = true; }
      if (tgt.st === 'hold' && idx !== 2 && R.songT >= tgt.r * SPB) { releaseKey('ghost'); demo.press = false; }
    }
    demo.press = !!(tgt && tgt.st === 'hold');
    var kp = tgt ? keyPos(tgt.s) : [W * 0.5, H * 0.9];
    var tx = kp[0] + 10, ty = kp[1] + (demo.press ? 6 : -50 + Math.sin(demo.t * 4) * 10);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 12);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 12);
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall0], [0.55, C.wall1], [1, C.wall0]]);
    // 窓の光と舞うほこり
    game.draw.rect(770, 270, 260, 200, '#6a5a8a');
    game.draw.rect(782, 282, 112, 84, '#9a8ab8');
    game.draw.rect(906, 282, 112, 84, '#9a8ab8');
    game.draw.rect(782, 378, 112, 80, '#8a7aa8');
    game.draw.rect(906, 378, 112, 80, '#8a7aa8');
    for (var d = 0; d < 6; d++) {
      var ph = (e * 0.15 + d / 6) % 1;
      game.draw.rect(790 + d * 40, 290 + ph * 360, 6, 6, C.white, 0.35 * (1 - ph));
    }
    // 吊りランプ(拍で灯り、ブレイク中は消える)
    var lamp = R.lampOn ? (R.pulse > 0.3 ? F.gold : F.wood) : F.dark;
    var sw = Math.sin(e * 1.6) * 8;
    game.draw.line(600, 232, 600 + sw, 312, C.ink, 4);
    box(230 + sw, -170, 870, 40, 40, 34, lamp);
  }

  function drawFrame() {
    // 共鳴箱(下段)と左右の柱・上の横木
    box(-20, -40, 0, 720, 70, 130, F.wood);
    box(-30, -30, 0, 50, 50, 820, F.wood);
    box(-20, -20, 790, 720, 40, 40, F.wood);
    for (var i = 0; i < 4; i++) {
      var lit = laneTask(i);
      var b0 = P(STR_U[i], 0, RUNG_Z0 - 40), t0 = P(STR_U[i], 0, 790);
      var col = C.string, w = 5;
      if (lit) { col = lit.st === 'hold' ? C.gold : C.teal; w = 8; }
      for (var f = 0; f < R.tasks.length; f++) if (R.tasks[f].s === i && R.tasks[f].flash > 0) { col = Math.floor(game.time.elapsed * 20) % 2 ? C.white : C.red; w = 12; }
      game.draw.line(b0[0], b0[1], t0[0], t0[1], col, w);
      // 段の目盛り
      for (var r = 0; r < RUNGS; r++) {
        var rp = rungPos(i, r);
        game.draw.rect(rp[0] - 16, rp[1] - 2, 32, 5, '#b8a890');
      }
      cubeAt(STR_U[i], 0, 830, 26, F.metal);   // 糸巻き
    }
    box(680, -30, 0, 50, 50, 820, F.wood);
  }

  function laneTask(k) {
    for (var i = 0; i < R.tasks.length; i++) {
      var t = R.tasks[i];
      if (t.s === k && (t.st === 'lit' || t.st === 'hold')) return t;
    }
    return null;
  }

  function drawMarks() {
    var brkNow = !R.demo && isBreak(Math.max(0, R.beatIdx));
    for (var i = 0; i < 4; i++) {
      var t = laneTask(i);
      if (!t) continue;
      // 金の目印(満ちる段)
      var gp = P(STR_U[t.s] + 40, -40, RUNG_Z0 + t.n * RUNG_DZ - 14);
      cubeAt(STR_U[t.s] + 46, -46, RUNG_Z0 + t.n * RUNG_DZ - 14, 30, F.gold);
      game.draw.circle(gp[0] - 8, gp[1] + 8, 6, C.white, 0.5 + 0.5 * Math.sin(game.time.elapsed * 8));
      // 音の玉
      if (t.st === 'hold') {
        if (!brkNow) {
          var rp = rungPos(t.s, Math.min(t.rung, RUNGS - 1));
          var near = t.rung === t.n;
          var sz = 30 + R.pulse * 10;
          cubeAt(STR_U[t.s], 0, RUNG_Z0 + Math.min(t.rung, RUNGS - 1) * RUNG_DZ - sz / 2, sz, near ? F.gold : F.teal);
          if (near) game.draw.circle(rp[0], rp[1] - 10, 46, C.gold, 0.25);
        } else {
          cubeAt(STR_U[t.s], 0, RUNG_Z0 - 15, 30, F.dark);
        }
      }
    }
  }

  function drawSmith() {
    var e = game.time.elapsed;
    var holding = false;
    for (var i = 0; i < R.tasks.length; i++) if (R.tasks[i].st === 'hold') holding = true;
    var frame = R.oops > 0 ? SMITH_OOPS : (R.cheer > 0 ? SMITH_CHEER : (holding ? SMITH_PRESS : (Math.floor(e * BPM / 60) % 2 === 0 ? SMITH_A : SMITH_B)));
    game.draw.sprite(frame, PAL_SMITH, 104, 1290 - R.pulse * 8, 10, { anchor: 'center' });
  }

  function drawBench() {
    box(160, 220, 0, 1000, 170, 60, F.wood);
    for (var k = 0; k < 4; k++) {
      var t = laneTask(k);
      var down = R.keyDown[k] > 0 || (t && t.st === 'hold');
      var f = F.dark;
      if (t) f = t.st === 'hold' ? F.gold : F.teal;
      if (R.keyFlash[k] > 0) f = Math.floor(game.time.elapsed * 20) % 2 ? F.white : F.red;
      var sz = R.keyFlash[k] > 0 ? 84 : 70;
      cubeAt(STR_U[k] + KEY_V, KEY_V, down ? KEY_Z - 16 : KEY_Z, sz, f);
      // 迫る枠: 押さえる拍の頭で鍵に重なる
      if (t && t.st === 'lit') {
        var left = t.p * SPB - R.songT;
        if (left < SPB * 3 && left > -WIN_PRESS) {
          var kp = keyPos(k);
          var rr = 70 + Math.max(0, left) / (SPB * 3) * 170;
          var a = (!R.demo && isBreak(t.p)) ? 0.35 : 1;
          var col = left < SPB * 0.5 ? C.gold : C.white;
          game.draw.line(kp[0] - rr, kp[1], kp[0], kp[1] - rr * 0.5, col, 5);
          game.draw.line(kp[0], kp[1] - rr * 0.5, kp[0] + rr, kp[1], col, 5);
          game.draw.line(kp[0] + rr, kp[1], kp[0], kp[1] + rr * 0.5, col, 5);
          game.draw.line(kp[0], kp[1] + rr * 0.5, kp[0] - rr, kp[1], col, 5);
          if (a < 1) game.draw.circle(kp[0], kp[1], rr * 0.4, C.wall0, 0.4);
        }
      }
    }
  }

  function drawWorld() {
    drawBg();
    drawFrame();
    drawMarks();
    drawSmith();
    drawBench();
    var brkNow = !R.demo && isBreak(Math.max(0, R.beatIdx)) && R.ready <= 0;
    if (brkNow) {
      game.draw.rect(0, 232, W, H - 232, C.ink, 0.28);
    }
  }

  function drawLamps(y) {
    var brk = !R.demo && isBreak(Math.max(0, R.beatIdx));
    var inBar = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx % 4;
    for (var b = 0; b < 4; b++) {
      var f = F.dark;
      if (!brk && b === inBar && R.pulse > 0.15) f = b === 0 ? F.gold : F.teal;
      var cx = W / 2 - 165 + b * 110;
      var s = b === 0 ? 30 : 24;
      // HUD用の小さい立方体(画面座標で直接)
      var hh = s / 2, i;
      for (i = 0; i < s; i += 4) {
        game.draw.rect(cx - s + i, y + i * 0.5, 4.5, s, f[1]);
        game.draw.rect(cx + i, y + hh - i * 0.5, 4.5, s, f[2]);
      }
      for (i = -hh; i < hh; i += 3) {
        var hw = s * (1 - Math.abs(i + 1.5) / hh);
        if (hw > 0) game.draw.rect(cx - hw, y + i, hw * 2, 3, f[0]);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.6);
    txt('SCORE ' + R.score, 40, 62, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 62, 36, C.gold, 'right');
    var done = 0;
    for (var i = 0; i < R.tasks.length; i++) if (R.tasks[i].st === 'done' || R.tasks[i].st === 'miss') done++;
    txt(done + ' / ' + R.tasks.length, 40, 140, 40, C.white, 'left');
    drawLamps(130);
    for (var l = 0; l < LIVES; l++) {
      var f = l < R.lives ? F.gold : F.dark, cx = W - 70 - l * 66, y = 136, s = 18, hh = 9, j;
      for (j = 0; j < s; j += 4) { game.draw.rect(cx - s + j, y + j * 0.5, 4.5, s, f[1]); game.draw.rect(cx + j, y + hh - j * 0.5, 4.5, s, f[2]); }
      for (j = -hh; j < hh; j += 3) { var hw = s * (1 - Math.abs(j + 1.5) / hh); if (hw > 0) game.draw.rect(cx - hw, y + j, hw * 2, 3, f[0]); }
    }
    var progress = Math.min(1, R.songT / (R.endBeat * SPB));
    game.draw.rect(40, 200, W - 80, 16, '#33283a');
    game.draw.rect(40, 200, (W - 80) * progress, 16, C.teal);
    var bx = 40 + (W - 80) * (BREAK_A / R.endBeat), bw = (W - 80) * ((BREAK_B - BREAK_A) / R.endBeat);
    game.draw.rect(bx, 194, bw, 4, C.gold);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W * 0.76, H * 0.255, 40, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.36, C.ink, 0.86);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 96, R.ok ? C.teal : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 64, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 36, C.string);
    txt('MAX COMBO ' + R.maxCombo, W / 2 - 40, H * 0.435, 36, C.string, 'right');
    // ブレイク中に合わせた本数(消えたランプ + 数)
    var lx = W / 2 + 60, ly = H * 0.43;
    game.draw.rect(lx - 18, ly - 18, 36, 36, F.dark[0]);
    game.draw.rect(lx - 18, ly + 18, 36, 8, F.dark[2]);
    txt('x ' + R.brkOk, lx + 34, H * 0.435, 40, C.gold, 'left');
    if (R.score > R.prevBest && R.score > 0) txt('NEW RECORD', W / 2, H * 0.49, 52, C.gold);
    else txt('BEST ' + Math.max(R.prevBest, R.score), W / 2, H * 0.49, 44, C.gold);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.tasks.length; i++) if (R.tasks[i].st !== 'done' && R.tasks[i].st !== 'miss') left++;
      txt('あと' + Math.max(1, left) + '本', W / 2, H * 0.545, 46, C.red);
    } else if (R.prevBest > R.score) {
      txt('あと' + (R.prevBest - R.score) + '点', W / 2, H * 0.545, 46, C.white);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.rect(0, 0, W, 232, C.ink, 0.6);
    game.draw.text(GAME_TITLE, W / 2 + 7, 88 + 7 + bob, { size: 108, color: F.wood[2], bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 88 + bob, { size: 108, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 190, 40, C.white);
    drawLamps(268);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.gold);
    else txt('TAP TO START', W / 2, H * 0.955, 44, C.white);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || !R) return;
    var k = keyAt(x, y);
    var res = pressKey(k, id);
    if (res === 'wrong') {
      game.audio.tone(130, 0.08, { wave: 'square', volume: 0.07 });
      var kp = keyPos(k);
      game.fx.burst(kp[0], kp[1], { color: F.dark[0], count: 5, speed: 120 });
      R.combo = 0;
    } else if (res === 'press') {
      var p2 = keyPos(k);
      game.fx.burst(p2[0], p2[1], { color: C.teal, count: 6, speed: 160 });
    }
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING || !R) return;
    var res = releaseKey(id);
    if (res === 'none') game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 44, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, breakHolds: R.brkOk, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
