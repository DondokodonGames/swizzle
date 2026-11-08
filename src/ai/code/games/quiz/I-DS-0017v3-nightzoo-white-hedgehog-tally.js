// I-DS-0017v3-nightzoo-white-hedgehog-tally.js
// 夜の動物園・白ハリ数え — 巣穴を次々出入りする夜の動物の中から、白いハリネズミが顔を出した回数だけを数えて答える
// 操作: 見ている間は触らない。観察が終わると下に並ぶ6つの枠が光るので、数えた回数ぶんの枠(左からN個目)をタップ。答えると白いハリネズミだけがもう一度出て数を確かめる
// 終わり: 3夜を数えきればCLEAR。数え違い/答えそびれが2回でGAME OVER
// @mechanic: counting
// @theme: night_zoo_burrow_watch
// 世界観: 動物園の夜間観察室で、新米の飼育員が赤外線モニター越しに巣穴を出入りする動物たちを見張り、色違いの仲間や白いウサギにまどわされず白いハリネズミが出てきた回数だけを日誌に付ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく数えた夜の数と答えの速さ
// スタイル: 8bit PC MONITOR
var STYLE = { bg: ['#000000', '#0c1440'], main: ['#20b020', '#20c8c8', '#f0f0f0'], accent: ['#e8d020', '#c82020'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'NIGHT TALLY';
  var TIME_LIMIT = 15;
  var NIGHTS = 3;
  var MISS_MAX = 2;
  var ANSWER_T = 2.4;
  var BOXES = 6;
  var C = {
    black: '#000000', navy: STYLE.bg[1], blue: '#1a1aa6', green: STYLE.main[0], cyan: STYLE.main[1],
    white: STYLE.main[2], yellow: STYLE.accent[0], red: STYLE.accent[1], magenta: '#c820c8',
  };
  var MON = { x: 70, y: H * 0.15, w: W - 140, h: H * 0.42 };
  var HOLES = [{ x: 250, y: H * 0.47 }, { x: 540, y: H * 0.4 }, { x: 830, y: H * 0.47 }];
  var BOX_Y = H * 0.8;
  var NIGHT_CFG = [
    { watch: 2.2, events: 5, tMin: 2, tMax: 3, stay: 0.42, holes: [0, 2], decoys: ['dark'] },
    { watch: 2.5, events: 7, tMin: 3, tMax: 4, stay: 0.36, holes: [0, 1, 2], decoys: ['dark', 'rabbit'] },
    { watch: 2.8, events: 8, tMin: 3, tMax: 5, stay: 0.3, holes: [0, 1, 2], decoys: ['dark', 'rabbit', 'rabbit'] },
  ];

  var HEDGE_A = [
    '.s..s..s..s.',
    'ssssssssssss',
    'sssffffffsss',
    'ssffkffkffss',
    'sffffffffffs',
    '.ffffnnffff.',
    '..ffffffff..',
    '...ff..ff...',
  ];
  var HEDGE_B = [
    's..s..s..s..',
    'ssssssssssss',
    'sssffffffsss',
    'ssffkffkffss',
    'sffffffffffs',
    '.fffffnnfff.',
    '..ffffffff..',
    '..ff....ff..',
  ];
  var RABBIT = [
    '...ww..ww...',
    '...wn..nw...',
    '...ww..ww...',
    '..wwwwwwww..',
    '.wwkwwwwkww.',
    '.wwwwnnwwww.',
    '..wwwwwwww..',
    '...ww..ww...',
  ];
  var KEEPER_A = [
    '...cccccc...',
    '..cccccccc..',
    '.cccccccccc.',
    '...ffffff...',
    '...fkffkf...',
    '...ffffff...',
    '..uuuuuuuu..',
    '.uuuuuuuubb.',
    '.uuuuuuuubb.',
    '.f.uuuuu.bb.',
    '...uuuuuu...',
    '...uu..uu...',
    '...kk..kk...',
  ];
  var KEEPER_B = [
    '...cccccc...',
    '..cccccccc..',
    '.cccccccccc.',
    '...ffffff...',
    '...fkffkf...',
    '...ffffff...',
    '..uuuuuuuu..',
    '.uuuuuuuubb.',
    '.uuuuuuufbb.',
    '...uuuuu.bb.',
    '...uuuuuu...',
    '...uu..uu...',
    '...kk..kk...',
  ];
  var KEEPER_UP = [
    'f..cccccc...',
    'f.cccccccc..',
    'fcccccccccc.',
    '.u.ffffff...',
    '.u.fkffkf...',
    '.uuffffff...',
    '..uuuuuuuu..',
    '..uuuuuubb..',
    '..uuuuuubb..',
    '...uuuuubb..',
    '...uuuuuu...',
    '...uu..uu...',
    '...kk..kk...',
  ];
  var PAL_WHITE = { s: C.white, f: C.white, k: C.black, n: C.magenta };
  var PAL_DARK = { s: C.green, f: '#108010', k: C.black, n: C.black };
  var PAL_RABBIT = { w: C.white, k: C.black, n: C.magenta };
  var PAL_FLASH = { s: C.yellow, f: C.yellow, k: C.black, n: C.red, w: C.yellow };
  var PAL_GHOST = { s: C.navy, f: C.navy, k: C.navy, n: C.navy };
  var PAL_KEEPER = { c: C.blue, f: C.white, k: C.black, u: C.green, b: C.yellow };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var night, correct, wrong, clock, phase, phT, events, target, watchDur, answer, answerTime;
  var replayT, hitStop, hitBox, badPending, ready, done, endT, won, resultT, endSent, newRec;
  var score, finalScore, lastDiff, keeperPose, statics, celebT, fastCount;

  function say(s, x, y, size, color, align) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }
  function frame(x, y, w, h, col) {
    game.draw.line(x, y, x + w, y, col, 3); game.draw.line(x, y + h, x + w, y + h, col, 3);
    game.draw.line(x, y, x, y + h, col, 3); game.draw.line(x + w, y, x + w, y + h, col, 3);
    game.draw.line(x + 8, y + 8, x + w - 8, y + 8, col, 1); game.draw.line(x + 8, y + h - 8, x + w - 8, y + h - 8, col, 1);
    game.draw.line(x + 8, y + 8, x + 8, y + h - 8, col, 1); game.draw.line(x + w - 8, y + 8, x + w - 8, y + h - 8, col, 1);
  }
  function blob(cx, cy, rx, ry, col, a) {
    var n = 7;
    for (var i = 0; i < n; i++) {
      var yy = -ry + (2 * ry) * (i + 0.5) / n;
      var w = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - w, cy + yy - ry / n, w * 2, (2 * ry) / n + 1, col, a);
    }
  }
  function boxX(i) { return 120 + i * 168; }

  function initGame() {
    night = 0; correct = 0; wrong = 0; clock = TIME_LIMIT; phase = 'ready'; phT = 0;
    events = []; target = 0; watchDur = 0; answer = 0; answerTime = 0; replayT = 0;
    hitStop = 0; hitBox = -1; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; score = 0; finalScore = 0; lastDiff = 0;
    keeperPose = 0; statics = []; celebT = 0; fastCount = 0;
  }

  function buildNight(i) {
    var c = NIGHT_CFG[Math.min(i, NIGHT_CFG.length - 1)];
    var n = Math.floor(game.random(c.tMin, c.tMax + 0.999));
    var types = [];
    for (var k = 0; k < c.events; k++) types.push(k < n ? 'white' : c.decoys[Math.floor(Math.random() * c.decoys.length)]);
    for (var s = types.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = types[s]; types[s] = types[j]; types[j] = tmp;
    }
    var span = c.watch - c.stay - 0.35;
    var free = [0, 0, 0];
    var evs = [];
    var last = 0;
    for (var e = 0; e < c.events; e++) {
      var t0 = 0.2 + span * (e / c.events) + game.random(0, (span / c.events) * 0.5);
      var hole = c.holes[Math.floor(Math.random() * c.holes.length)];
      if (free[hole] > t0) {
        var alt = -1;
        for (var h = 0; h < c.holes.length; h++) if (free[c.holes[h]] <= t0) alt = c.holes[h];
        if (alt >= 0) hole = alt; else t0 = free[hole];
      }
      free[hole] = t0 + c.stay + 0.24;
      evs.push({ hole: hole, type: types[e], t0: t0, stay: c.stay, popped: false });
      last = Math.max(last, t0 + c.stay + 0.25);
    }
    events = evs; target = n; watchDur = Math.max(c.watch, last);
    phase = 'watch'; phT = 0; answer = 0; answerTime = 0; replayT = 0;
  }

  // 出入りの高さ(0=穴の中, 1=顔を出しきる)
  function riseOf(u, stay) {
    if (u < 0 || u > stay + 0.2) return 0;
    if (u < 0.1) return u / 0.1;
    if (u < 0.1 + stay) return 1;
    return 1 - (u - 0.1 - stay) / 0.1;
  }

  function stepNight(dt, real) {
    phT += dt;
    if (phase === 'watch') {
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (!ev.popped && phT >= ev.t0) {
          ev.popped = true;
          game.audio.tone(ev.hole === 1 ? 'A4' : 'G4', 0.06, { wave: 'triangle', volume: real ? 0.08 : 0.04 });
        }
      }
      if (phT >= watchDur) {
        phase = 'answer'; phT = 0;
        game.audio.play('se_tap', 0.3);
      }
    } else if (phase === 'answer') {
      if (real) clock -= dt;
      if (phT >= ANSWER_T) { answer = 0; startReplay(real); }
    } else if (phase === 'replay') {
      var step = 0.24;
      var k = Math.floor(phT / step);
      if (k < target && Math.floor((phT - dt) / step) < k) {
        var pitches = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
        game.audio.tone(pitches[Math.min(k, 5)], 0.08, { wave: 'square', volume: 0.07 });
      }
      if (phT >= target * step + 0.3) judge(real);
    } else if (phase === 'gap') {
      if (phT >= 0.45) buildNight(night);
    }
  }

  function startReplay(real) {
    phase = 'replay'; phT = 0;
  }

  function answerTap(i, real) {
    answer = i + 1;
    answerTime = phT;
    keeperPose = 0.4;
    game.audio.play('se_tap', 0.4);
    game.fx.burst(boxX(i), BOX_Y, { color: C.cyan, count: 8, speed: 200 });
    startReplay(real);
  }

  function judge(real) {
    lastDiff = target - answer;
    if (answer === target) {
      var fast = answerTime < 1.0;
      game.feedback.good(boxX(answer - 1), BOX_Y - 60, { text: fast ? 'PERFECT' : 'GOOD', color: C.yellow });
      if (real) {
        correct++;
        score += 300 + Math.round(Math.max(0, ANSWER_T - answerTime) * 100);
        if (fast) fastCount++;
        if (correct === 2) { game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.yellow, size: 80 }); game.audio.play('se_milestone', 0.45); }
      }
      nextNight(real);
    } else {
      hitStop = 0.45; hitBox = target - 1;
      badPending = { real: real };
      game.audio.tone('D3', 0.16, { wave: 'square', volume: 0.12 });
      game.fx.flash('#ffffff', 0.1);
      phase = 'judged';
    }
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    var bx = answer > 0 ? boxX(answer - 1) : W * 0.5;
    game.feedback.bad(bx, BOX_Y - 60, { text: 'MISS' });
    hitBox = -1;
    if (b && b.real) {
      wrong++;
      if (wrong >= MISS_MAX) { finish(false); return; }
    }
    nextNight(b && b.real);
  }

  function nextNight(real) {
    if (real) {
      night++;
      if (night >= NIGHTS) { finish(true); return; }
    }
    phase = 'gap'; phT = 0;
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score;
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { nights: correct, misses: wrong, perfect: fastCount };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 白いハリネズミが出るたびに指さし、最後に枠をタップ ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.7, press: 0, tapped: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; buildNight(0); demo.tapped = false; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else if (phase !== 'gap') stepNight(dt, false);
    var tx = W * 0.5, ty = H * 0.68;
    if (phase === 'watch') {
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        var u = phT - ev.t0;
        if (ev.type === 'white' && u >= 0 && u <= ev.stay + 0.2) { tx = HOLES[ev.hole].x + 40; ty = HOLES[ev.hole].y + 30; }
      }
    } else if (phase === 'answer') {
      tx = boxX(target - 1); ty = BOX_Y + 20;
      if (!demo.tapped && phT > 0.7) { demo.tapped = true; demo.press = 0.2; answerTap(target - 1, false); }
    } else if (phase === 'replay' || phase === 'gap') {
      tx = boxX(Math.max(0, target - 1)); ty = BOX_Y + 20;
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
    demo.press = Math.max(0, demo.press - dt);
    if (keeperPose > 0) keeperPose -= dt;
  }

  // ── 描画 ─────────────────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.black], [0.6, C.navy], [1, C.black]]);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.62 + i * 14, W, H * 0.62 + i * 14, C.blue, 1);
    game.draw.rect(0, H * 0.7, W, 6, C.cyan, 0.6);
    game.draw.rect(0, H * 0.703, W, H * 0.3, C.navy, 0.8);
    for (var k = 0; k < 5; k++) {
      var a = 0.25 + 0.2 * Math.sin(t * 2 + k);
      game.draw.rect(W - 140 + (k % 2) * 30, H * 0.64 + k * 10, 10, 6, C.green, a);
    }
  }

  function drawMonitor(showAnimals) {
    var t = game.time.elapsed;
    game.draw.rect(MON.x - 20, MON.y - 20, MON.w + 40, MON.h + 40, C.navy);
    game.draw.rect(MON.x, MON.y, MON.w, MON.h, C.black);
    for (var y = MON.y; y < MON.y + MON.h; y += 6) game.draw.rect(MON.x, y, MON.w, 2, C.green, 0.18);
    game.draw.rect(MON.x, MON.y + MON.h * 0.52, MON.w, MON.h * 0.48, '#003000', 0.9);
    for (var g = 0; g < 26; g++) {
      var gx = MON.x + 20 + g * 36, gy = MON.y + MON.h * 0.95;
      game.draw.line(gx, gy, gx + 6 + Math.sin(t * 2 + g) * 4, gy - 30 - (g % 3) * 12, C.green, 2);
    }
    for (var h = 0; h < HOLES.length; h++) {
      var ho = HOLES[h];
      blob(ho.x, ho.y + 40, 150, 70, '#106010', 1);
      blob(ho.x, ho.y, 74, 26, C.black, 1);
      if (showAnimals) drawAnimalsAt(h);
      blob(ho.x, ho.y + 62, 140, 52, '#106010', 1);
      game.draw.rect(ho.x - 120, ho.y + 6, 240, 4, C.green, 0.6);
    }
    // ノイズの帯 + 録画ランプ
    var by = MON.y + ((t * 260) % MON.h);
    game.draw.rect(MON.x, by, MON.w, 16, C.white, 0.06);
    if (Math.floor(t * 2) % 2 === 0) game.draw.circle(MON.x + 40, MON.y + 40, 12, C.red);
    for (var s = statics.length - 1; s >= 0; s--) {
      var st = statics[s];
      st.t -= 1 / 60;
      for (var q = 0; q < 6; q++) game.draw.rect(st.x - 40 + q * 14, st.y - 20 + ((q * 7) % 40), 10, 3, C.white, Math.max(0, st.t * 2));
      if (st.t <= 0) statics.splice(s, 1);
    }
    frame(MON.x - 20, MON.y - 20, MON.w + 40, MON.h + 40, C.cyan);
  }

  function drawAnimalsAt(h) {
    var ho = HOLES[h];
    var t = game.time.elapsed;
    if (phase === 'watch') {
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (ev.hole !== h) continue;
        var r = riseOf(phT - ev.t0, ev.stay);
        if (r <= 0) continue;
        drawCritter(ev.type, ho.x, ho.y + 70 - r * 125, false, t);
      }
    } else if (phase === 'replay' || phase === 'judged') {
      var step = 0.24;
      var k = Math.floor(phT / step);
      var whites = [];
      for (var j = 0; j < events.length; j++) if (events[j].type === 'white') whites.push(events[j]);
      for (var w = 0; w < whites.length; w++) {
        if (whites[w].hole !== h) continue;
        if (phase === 'replay' && w === k) {
          var u = (phT - k * step) / step;
          var rr = u < 0.3 ? u / 0.3 : 1;
          drawCritter('white', ho.x, ho.y + 70 - rr * 125, true, t);
          say(String(w + 1), ho.x, ho.y - 130, 64, C.yellow);
        }
      }
    }
  }

  function drawCritter(type, x, y, flash, t) {
    var px = 14;
    if (type === 'rabbit') { game.draw.sprite(RABBIT, flash ? PAL_FLASH : PAL_RABBIT, x, y - 10, px, { anchor: 'center' }); return; }
    var spr = Math.floor(t * 6) % 2 === 0 ? HEDGE_A : HEDGE_B;
    var pal = flash ? PAL_FLASH : (type === 'white' ? PAL_WHITE : PAL_DARK);
    game.draw.sprite(spr, pal, x, y, px, { anchor: 'center' });
  }

  function drawKeeper(mood) {
    var t = game.time.elapsed;
    var spr = keeperPose > 0 || mood === 'win' ? KEEPER_UP : (Math.floor(t * 2) % 2 === 0 ? KEEPER_A : KEEPER_B);
    var bob = mood === 'win' ? -Math.abs(Math.sin(t * 7)) * 40 : Math.sin(t * 3) * 3;
    var slump = mood === 'sad' ? 20 : 0;
    game.draw.sprite(spr, PAL_KEEPER, 150, H * 0.655 + bob + slump, 11, { anchor: 'center' });
    game.draw.rect(250, H * 0.672, 90, 60, C.white);
    for (var l = 0; l < 4; l++) game.draw.line(260, H * 0.676 + l * 12, 330, H * 0.676 + l * 12, C.blue, 2);
    for (var m = 0; m < correct; m++) game.draw.line(270 + m * 14, H * 0.69, 270 + m * 14, H * 0.70, C.red, 4);
  }

  function drawBoxes(active) {
    var t = game.time.elapsed;
    for (var i = 0; i < BOXES; i++) {
      var x = boxX(i);
      var lit = answer > 0 && i < answer;
      var isHit = hitBox === i && hitStop > 0;
      var sc = isHit ? 1.3 : 1;
      var bw = 74 * sc, bh = 92 * sc;
      var col = active ? (Math.floor(t * 4) % 2 === 0 ? C.white : C.cyan) : C.blue;
      if (isHit) col = Math.floor(t * 20) % 2 === 0 ? C.white : C.yellow;
      game.draw.rect(x - bw, BOX_Y - bh, bw * 2, bh * 2, active ? '#101060' : C.black, 0.9);
      frame(x - bw, BOX_Y - bh, bw * 2, bh * 2, col);
      var pal = lit ? PAL_WHITE : (isHit ? PAL_FLASH : PAL_GHOST);
      game.draw.sprite(HEDGE_A, pal, x, BOX_Y - 16 + (active ? Math.sin(t * 6 + i) * 4 : 0), 9, { anchor: 'center' });
      say(String(i + 1), x, BOX_Y + 62, 40, lit ? C.yellow : C.cyan);
      if (answer === i + 1 && (phase === 'judged' || hitStop > 0)) {
        game.draw.line(x - 50, BOX_Y - 60, x + 50, BOX_Y + 40, C.red, 8);
        game.draw.line(x + 50, BOX_Y - 60, x - 50, BOX_Y + 40, C.red, 8);
      }
    }
    if (phase === 'answer' && active) {
      var frac = Math.max(0, 1 - phT / ANSWER_T);
      game.draw.rect(60, H * 0.885, W - 120, 16, C.blue);
      game.draw.rect(60, H * 0.885, (W - 120) * frac, 16, frac < 0.35 ? C.red : C.yellow);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.black, 0.85);
    game.draw.line(0, 226, W, 226, C.cyan, 2);
    for (var i = 0; i < NIGHTS; i++) {
      var x = 90 + i * 92, y = 86;
      var past = i < night;
      var cur = i === night && !done;
      game.draw.circle(x, y, 30, past ? C.yellow : (cur && Math.floor(game.time.elapsed * 3) % 2 === 0 ? C.cyan : C.blue));
      game.draw.circle(x + 12, y - 8, 24, C.black);
    }
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.rect(W - 120 - m * 80, 60, 50, 50, m < MISS_MAX - wrong ? C.green : C.navy);
      frame(W - 120 - m * 80, 60, 50, 50, C.cyan);
    }
    say(correct + ' / ' + NIGHTS, W * 0.5, 80, 60, C.white);
    say('SCORE ' + score, W * 0.5, 140, 32, C.cyan);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(70, 184, W - 140, 14, C.navy);
    game.draw.rect(70, 184, (W - 140) * frac, 14, frac < 0.3 ? C.red : C.green);
  }

  function scanlines() {
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.14);
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0) { game.audio.tone('E3', 0.04, { wave: 'square', volume: 0.04 }); return; }
    if (phase === 'answer') {
      for (var i = 0; i < BOXES; i++) {
        if (Math.abs(x - boxX(i)) <= 84 && Math.abs(y - BOX_Y) <= 120) { answerTap(i, true); return; }
      }
      game.audio.tone('A3', 0.05, { wave: 'triangle', volume: 0.06 });
      return;
    }
    statics.push({ x: x, y: y, t: 0.3 });
    game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.04 });
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (night === undefined) initGame();
      stepDemo(dt);
      drawRoom();
      drawMonitor(true);
      drawKeeper('');
      drawBoxes(phase === 'answer');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.black, 0.85);
      say(TITLE, W * 0.5, H * 0.05, 88, C.yellow);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.cyan);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.955, 46, C.yellow);
      else say('INSERT COIN', W * 0.5, H * 0.955, 40, C.white);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawRoom();
      drawMonitor(false);
      drawKeeper(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 540, C.black, 0.9);
      frame(90, H * 0.2, W - 180, 540, C.cyan);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.yellow : C.red);
      say(correct + ' / ' + NIGHTS, W * 0.5, H * 0.32, 68, C.white);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.white);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.cyan);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.yellow); }
      else if (!won && Math.abs(lastDiff) === 1) say('あと1匹!', W * 0.5, H * 0.47, 52, C.red);
      else if (!won) say('あと' + Math.max(1, NIGHTS - correct) + '夜!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.95, 40, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      if (won && celebT > 0.22) {
        celebT = 0;
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.55), { color: Math.random() < 0.5 ? C.yellow : C.white, count: 14, speed: 400 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap', 0.35); buildNight(0); }
    } else {
      stepNight(dt, true);
      if (phase === 'watch') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }
    if (keeperPose > 0) keeperPose -= dt;

    drawRoom();
    drawMonitor(true);
    drawKeeper(done ? (won ? 'win' : 'sad') : '');
    drawBoxes(phase === 'answer' && !done);
    drawHud();
    if (ready > 0) say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.36, 100, C.yellow);
    scanlines();
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1],
      ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['E4', 2],
    ], { tempo: 88, wave: 'triangle', volume: 0.04, loop: true, bass: [['E2', 2], ['C2', 2], ['D2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
