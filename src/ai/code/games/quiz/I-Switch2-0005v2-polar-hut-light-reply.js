// I-Switch2-0005v2-polar-hut-light-reply.js
// 極地の灯り返信 — 基地を囲む東西南北の小屋が瞬いた順を覚え、同じ順に小屋の方角へ指をはらって基地の灯りを送り返す
// 操作: 見本の間は見て聴くだけ(この間は時間が減らない)。終わったら、光った小屋の方角へ画面をはらう(上=北、右=東、下=南、左=西の小屋)。基地から光の線が飛び、合っていれば小屋が灯りで応える。1手ごとに基地を囲む輪が縮み、尽きる前にはらう。後半は地吹雪が横切って小屋の瞬きがかすみ、同じ小屋が続けて瞬く手も混ざる
// 終わり: 4組(3・3・4・5手)を返せばCLEAR。違う方角/輪切れで組を落とすのが2回、または時間切れでGAME OVER
// @mechanic: memory_sequence
// @theme: antarctic_station_light_signal
// 世界観: 南極の観測基地で、通信係が雪原に散らばる観測小屋のライトが点滅した順を覚え、同じ順に基地の信号灯を小屋の方角へ送って返信する
// 残るもの: 正誤(CLEAR/GAME OVER) + 返せた組数・正しく送った手数・PERFECT組数・スコア
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光線だけ。線を太さ違いで重ねて発光させる
  var STYLE = { bg: ['#000006', '#001a10'], main: ['#4dff9a', '#66e0ff', '#ffffff'], accent: ['#ff4d6a', '#ffd24a'] };
  var GREEN = STYLE.main[0], CYAN = STYLE.main[1], WHITE = STYLE.main[2], RED = STYLE.accent[0], AMBER = STYLE.accent[1];
  var RGB = { g: '77,255,154', c: '102,224,255', w: '255,255,255', r: '255,77,106', a: '255,210,74' };

  var GAME_TITLE = 'POLAR REPLY';
  var TIME_LIMIT = 16;
  var NEEDED = 4;
  var MAX_MISS = 2;
  var LENS = [3, 3, 4, 5, 5, 6];
  var ANS_LIMIT = 2.5;
  var BASE = [540, 830];
  var HUTS = [[540, 470], [890, 830], [540, 1190], [190, 830]];
  var DIRS = ['up', 'right', 'down', 'left'];
  var NOTES = ['C5', 'E5', 'G5', 'A4'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var phase, seq, showT, flashLen, ansI, ansT, slow, gapT, hutFx, beams, gusts, gustT, sputT;
  var stopT, stopKind, hlHut, wrongHut, rounds, perfects, sent, misses, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var joyT, sadT, warnT, endWhy, tickT, demoSeq;

  // 通信係(ヘッドセット)とペンギン — 管面のドット
  var OP_A = ['....gggg....', '...gggggg...', '..cg.gg.gc..', '..cggggggc..', '..c.gggg.c..', '...gggggg.c.', '..gggggggggc', '.gggggggggg.', '.gg.gggg.gg.', '.gg.gggg.gg.'];
  var OP_B = ['....gggg....', '...gggggg...', '..cg.gg.gc..', '..cggggggc..', '..c.g..g.c..', '...gggggg.c.', '..gggggggggc', 'ggggggggggg.', 'g..gggggg..g', '...gggggg...'];
  var OP_SAD = ['............', '....gggg....', '...gggggg...', '..cgg..ggc..', '..cggggggc..', '..c.gggg.c..', '...gggggg...', '..gggggggg..', '.gg.gggg.gg.', '.gg.gggg.gg.'];
  var PEN_A = ['..ccc...', '.cwccc..', '.cccca..', 'ccwwwcc.', 'ccwwwcc.', '.cwwwc..', '.cwwwc..', '..a.a...'];
  var PEN_B = ['..ccc...', '.cwccc..', '.cccca..', '.cwwwcc.', 'ccwwwcc.', 'ccwwwc..', '.cwwwc..', '.a...a..'];
  var OP_PAL = { g: GREEN, c: CYAN };
  var PEN_PAL = { c: CYAN, w: WHITE, a: AMBER };

  function rgba(k, a) { return 'rgba(' + RGB[k] + ',' + a + ')'; }
  function glow(x1, y1, x2, y2, k, w, s) {
    var st = s === undefined ? 1 : s;
    game.draw.line(x1, y1, x2, y2, rgba(k, 0.12 * st), w * 5);
    game.draw.line(x1, y1, x2, y2, rgba(k, 0.35 * st), w * 2.4);
    game.draw.line(x1, y1, x2, y2, rgba(k, st), w);
  }
  function ring(cx, cy, r, k, w, s, frac) {
    var n = 28, f = frac === undefined ? 1 : frac;
    for (var i = 0; i < n * f; i++) {
      var a0 = -Math.PI / 2 + i / n * Math.PI * 2, a1 = -Math.PI / 2 + Math.min(i + 1, n * f) / n * Math.PI * 2;
      glow(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, k, w, s);
    }
  }
  function out(str, x, y, sz, col) {
    game.draw.text(str, x, y, { size: sz + 4, color: 'rgba(0,0,0,0.6)', bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }

  function makeSeq(len, rep) {
    var s = [];
    for (var i = 0; i < len; i++) {
      var d = Math.floor(Math.random() * 4);
      if (i > 0 && d === s[i - 1] && !rep) d = (d + 1 + Math.floor(Math.random() * 3)) % 4;
      s.push(d);
    }
    if (rep && len >= 3) { var j = 1 + Math.floor(Math.random() * (len - 1)); s[j] = s[j - 1]; }
    return s;
  }

  function startRound() {
    seq = demoSeq ? demoSeq.slice() : makeSeq(LENS[Math.min(rounds, LENS.length - 1)], rounds >= 2);
    flashLen = Math.max(0.34, 0.5 - rounds * 0.04);
    phase = 'show'; showT = -0.45; ansI = 0; ansT = ANS_LIMIT; slow = false; gustT = 0.2;
  }

  function initGame() {
    rounds = 0; perfects = 0; sent = 0; misses = 0; score = 0; finalScore = 0;
    hutFx = [0, 0, 0, 0]; beams = []; gusts = []; sputT = 0; tickT = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; hlHut = -1; wrongHut = -1; gapT = 0;
    fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; endWhy = '';
    startRound();
  }

  function stepLen() { return flashLen + 0.16; }

  // はらう(本番もデモも同じ処理)
  function sendDir(d) {
    if (phase !== 'answer' || stopT > 0 || fin) {
      sputT = 0.25;
      game.audio.tone('D3', 0.05, { wave: 'square', volume: 0.05 });
      return;
    }
    beams.push({ d: d, t: 0.35, ok: d === seq[ansI] });
    if (d === seq[ansI]) {
      if (ANS_LIMIT - ansT > 1.2) slow = true;
      ansI++; sent++;
      hutFx[d] = 0.4;
      var pts = 50 + Math.round(ansT * 20);
      if (mode === S.PLAYING) score += pts;
      game.audio.tone(NOTES[d], 0.14, { wave: 'square', volume: 0.1 });
      game.fx.burst(HUTS[d][0], HUTS[d][1], { color: GREEN, count: 8, speed: 220 });
      ansT = ANS_LIMIT;
      if (ansI >= seq.length) {
        rounds++; joyT = 0.8;
        var perfect = !slow;
        if (perfect) perfects++;
        var bonus = 150 + seq.length * 50 + (perfect ? 100 : 0);
        if (mode === S.PLAYING) score += bonus;
        game.feedback.good(BASE[0], BASE[1] - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? AMBER : GREEN, size: 64 });
        game.fx.popup('+' + bonus, BASE[0], BASE[1] - 200, { color: CYAN, size: 44 });
        if (rounds === 2 && mode === S.PLAYING) {
          game.audio.play('se_milestone', 0.5);
          game.fx.popup('NICE', W / 2, H * 0.2, { color: AMBER, size: 90 });
        }
        if (mode === S.PLAYING && rounds >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return; }
        phase = 'gap'; gapT = 0.8;
      }
    } else {
      // 違う方角: 止めて、正しい小屋を白く大きく
      stopT = 0.5; stopKind = 'wrong'; hlHut = seq[ansI]; wrongHut = d;
      game.fx.flash(WHITE, 0.12);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.08, slide: -60 });
    }
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; sadT = 0.9;
    var hh = HUTS[hlHut];
    game.feedback.bad(hh[0], hh[1] - 110, { text: 'MISS', color: RED, size: 62 });
    game.fx.popup('あと' + (seq.length - ansI) + '手', BASE[0], BASE[1] + 150, { color: RED, size: 48 });
    hlHut = -1; wrongHut = -1;
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); return; }
    phase = 'gap'; gapT = 0.8;
  }

  function stepStation(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (sputT > 0) sputT -= dt;
    for (var h = 0; h < 4; h++) if (hutFx[h] > 0) hutFx[h] -= dt;
    for (var b = beams.length - 1; b >= 0; b--) { beams[b].t -= dt; if (beams[b].t <= 0) beams.splice(b, 1); }
    for (var g = gusts.length - 1; g >= 0; g--) { gusts[g].x += 1100 * dt; if (gusts[g].x > W + 500) gusts.splice(g, 1); }
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (phase === 'show') {
      var prev = showT;
      showT += dt;
      var sl = stepLen();
      for (var i = 0; i < seq.length; i++) {
        var st = i * sl;
        if (prev < st && showT >= st) { hutFx[seq[i]] = flashLen; game.audio.tone(NOTES[seq[i]], flashLen * 0.8, { wave: 'triangle', volume: 0.1 }); }
      }
      // 地吹雪(3組目から)
      if (rounds >= 2) { gustT -= dt; if (gustT <= 0) { gustT = 1.0; gusts.push({ x: -500, y: 420 + Math.random() * 820 }); } }
      if (showT >= seq.length * sl + 0.1) {
        phase = 'answer'; ansT = ANS_LIMIT;
        game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.07 });
        game.audio.tone('E6', 0.08, { wave: 'square', volume: 0.06 });
      }
    } else if (phase === 'answer') {
      ansT -= dt;
      if (ansT < 0.6) { tickT -= dt; if (tickT <= 0) { tickT = 0.15; game.audio.tone('E5', 0.03, { wave: 'square', volume: 0.06 }); } }
      if (ansT <= 0) {
        stopT = 0.5; stopKind = 'late'; hlHut = seq[ansI]; wrongHut = -1;
        game.fx.flash(WHITE, 0.1);
        game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.08 });
      }
    } else if (phase === 'gap') {
      gapT -= dt;
      if (gapT <= 0) startRound();
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 40) + (MAX_MISS - misses) * 150 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 4; i++) { hutFx[i] = 1.2; game.fx.burst(HUTS[i][0], HUTS[i][1], { color: i % 2 ? AMBER : GREEN, count: 18, speed: 420 }); }
      game.fx.flash(GREEN, 0.18);
      joyT = 3;
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onSwipe(function(dir) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    var d = DIRS.indexOf(dir);
    if (d < 0) return;
    game.audio.play('se_tap', 0.12);
    sendDir(d);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; demoSeq = null; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; demoSeq = [0, 1, 2]; initGame(); demo.t = 0; startBgm(); return; }
    if (fin || readyT > 0) return;
    // はらわずに触れただけ: 信号灯がくすぶる
    sputT = 0.25;
    game.audio.tone('D3', 0.05, { wave: 'square', volume: 0.05 });
    game.fx.burst(BASE[0], BASE[1], { color: CYAN, count: 4, speed: 100 });
  });

  // ---- 描画 ----
  function hutStrength(i) {
    var s = 1;
    for (var g = 0; g < gusts.length; g++) if (Math.abs(gusts[g].x + 250 - HUTS[i][0]) < 260 && Math.abs(gusts[g].y - HUTS[i][1]) < 220) s = 0.45;
    return s;
  }

  function drawMap(t) {
    game.draw.clear(STYLE.bg[0]);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // オーロラ
    for (var a = 0; a < 3; a++) {
      var py = 270 + a * 26;
      for (var x = 0; x < W; x += 60) {
        glow(x, py + Math.sin(t * 1.2 + x * 0.008 + a) * 30, x + 60, py + Math.sin(t * 1.2 + (x + 60) * 0.008 + a) * 30, a === 1 ? 'g' : 'c', 2, 0.35);
      }
    }
    // 雪原の格子
    for (var gx = 0; gx <= W; gx += 120) game.draw.line(gx, 380, gx, 1400, rgba('c', 0.08), 2);
    for (var gy = 380; gy <= 1400; gy += 120) game.draw.line(0, gy, W, gy, rgba('c', 0.08), 2);
    // 小屋への道(点線)
    for (var i = 0; i < 4; i++) {
      var hh = HUTS[i];
      for (var k = 1; k < 8; k++) {
        var x0 = BASE[0] + (hh[0] - BASE[0]) * k / 9, y0 = BASE[1] + (hh[1] - BASE[1]) * k / 9;
        game.draw.line(x0 - 4, y0, x0 + 4, y0, rgba('g', 0.35), 4);
      }
    }
    // 地吹雪
    for (var g = 0; g < gusts.length; g++) {
      for (var l = 0; l < 7; l++) {
        var lx0 = gusts[g].x + l * 60, ly = gusts[g].y - 150 + l * 50;
        glow(lx0, ly, lx0 + 340, ly + 12, 'w', 3, 0.5);
      }
    }
  }

  function drawHut(i, t) {
    var hh = HUTS[i], x = hh[0], y = hh[1];
    var big = (stopT > 0 && hlHut === i) ? 1.35 : 1;
    var fl = big > 1 && Math.floor(t * 16) % 2 === 0;
    var on = hutFx[i] > 0 || fl;
    var k = fl ? 'w' : on ? 'a' : 'g';
    var s = hutStrength(i), w = 60 * big;
    glow(x - w, y - 20 * big, x + w, y - 20 * big, k, 4, s);
    glow(x - w, y + 50 * big, x + w, y + 50 * big, k, 4, s);
    glow(x - w, y - 20 * big, x - w, y + 50 * big, k, 4, s);
    glow(x + w, y - 20 * big, x + w, y + 50 * big, k, 4, s);
    glow(x - w - 12, y - 20 * big, x, y - 70 * big, k, 4, s);
    glow(x, y - 70 * big, x + w + 12, y - 20 * big, k, 4, s);
    glow(x - 16, y + 4, x + 16, y + 4, k, 3, s);
    glow(x - 16, y + 28, x + 16, y + 28, k, 3, s);
    ring(x, y - 92 * big, 14, k, 3, s);
    if (on) {
      var r = 40 + (1 - Math.max(0, hutFx[i]) / 0.5) * 60;
      ring(x, y - 92 * big, r, k, 3, s * 0.8);
      for (var a = 0; a < 8; a++) {
        var an = a / 8 * Math.PI * 2;
        glow(x + Math.cos(an) * 26, y - 92 * big + Math.sin(an) * 26, x + Math.cos(an) * (26 + r * 0.6), y - 92 * big + Math.sin(an) * (26 + r * 0.6), k, 3, s);
      }
    }
    if (stopT > 0 && wrongHut === i) {
      glow(x - 70, y - 90, x + 70, y + 70, 'r', 6);
      glow(x + 70, y - 90, x - 70, y + 70, 'r', 6);
    }
  }

  function drawBase(t) {
    var x = BASE[0], y = BASE[1];
    // 基地(六角)と信号灯
    for (var i = 0; i < 6; i++) {
      var a0 = i / 6 * Math.PI * 2, a1 = (i + 1) / 6 * Math.PI * 2;
      glow(x + Math.cos(a0) * 80, y + Math.sin(a0) * 80, x + Math.cos(a1) * 80, y + Math.sin(a1) * 80, 'c', 4);
    }
    ring(x, y, 22 + (sputT > 0 ? Math.sin(t * 60) * 6 : 0), phase === 'answer' ? 'g' : 'c', 4);
    // 1手ごとの持ち時間の輪
    if (phase === 'answer' && !fin) {
      var fr = Math.max(0, ansT / ANS_LIMIT), warn = ansT < 0.6 && Math.floor(t * 10) % 2 === 0;
      ring(x, y, 120, warn ? 'r' : 'g', 4, 1, fr);
    }
    if (stopT > 0 && stopKind === 'late') ring(x, y, 120, Math.floor(t * 16) % 2 ? 'w' : 'r', 5);
    // 送った光の線
    for (var b = 0; b < beams.length; b++) {
      var bm = beams[b], hh = HUTS[bm.d], k2 = 1 - bm.t / 0.35, ex = x + (hh[0] - x) * Math.min(1, k2 * 2), ey = y + (hh[1] - y) * Math.min(1, k2 * 2);
      glow(x, y, ex, ey, bm.ok ? 'a' : 'r', 5);
    }
  }

  function drawConsole(t) {
    var cy = 1560;
    glow(80, cy - 40, W - 80, cy - 40, 'c', 3);
    glow(80, cy + 260, W - 80, cy + 260, 'c', 3);
    glow(80, cy - 40, 80, cy + 260, 'c', 3);
    glow(W - 80, cy - 40, W - 80, cy + 260, 'c', 3);
    var fr = (fin && !cleared) || sadT > 0 ? OP_SAD : (phase === 'answer' && Math.floor(t * 4) % 2) || joyT > 0 ? OP_B : OP_A;
    game.draw.sprite(fr, OP_PAL, 250, cy + 110 + (joyT > 0 ? -Math.abs(Math.sin(t * 12)) * 14 : 0), 15, { anchor: 'center' });
    // 方角ランプ(十字)
    var cx = 760, cc = cy + 110;
    for (var d = 0; d < 4; d++) {
      var dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d];
      var lit = hutFx[d] > 0;
      glow(cx, cc, cx + dx * 90, cc + dy * 90, lit ? 'a' : 'g', 4, lit ? 1 : 0.5);
      ring(cx + dx * 110, cc + dy * 110, 16, lit ? 'a' : 'g', 3, lit ? 1 : 0.5);
    }
    // 返した手数の点
    if (phase === 'answer' || phase === 'gap') {
      for (var i = 0; i < seq.length; i++) ring(470 + i * 40 - (seq.length - 1) * 20 + 0, cy + 220, 10, i < ansI ? 'a' : 'g', 3, i < ansI ? 1 : 0.4);
    }
    // ペンギン
    var px = 120 + ((t * 40) % (W - 240)), pf = Math.floor(t * 4) % 2 ? PEN_A : PEN_B;
    game.draw.sprite(pf, PEN_PAL, px, 1420, 9, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    glow(60, 40, 60 + (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 40, low ? 'r' : 'c', 8);
    for (var i = 0; i < NEEDED; i++) ring(W / 2 - 150 + i * 100, 120, 26, i < rounds ? 'a' : 'g', 3, i < rounds ? 1 : 0.35);
    out(rounds + ' / ' + NEEDED, W / 2, 200, 40, GREEN);
    for (var m = 0; m < MAX_MISS; m++) {
      var mx = 70 + m * 60;
      glow(mx, 100, mx + 36, 136, m < misses ? 'r' : 'g', 3, m < misses ? 1 : 0.3);
      glow(mx + 36, 100, mx, 136, m < misses ? 'r' : 'g', 3, m < misses ? 1 : 0.3);
    }
    out('' + score, W - 140, 130, 46, CYAN);
  }

  function drawScene(t) {
    drawMap(t);
    for (var i = 0; i < 4; i++) drawHut(i, t);
    drawBase(t);
    drawConsole(t);
  }

  // ---- ATTRACT: 本物の sendDir() で実演。北→東→南が瞬く → 北・東と正しくはらい、3手目を西へはらってMISS ----
  var demo = { t: 0, x: 760, y: 1670, press: false, k: 0, el: 0, dx: 0, dy: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { demoSeq = [0, 1, 2]; initGame(); readyT = 0; demo.k = 0; demo.el = 0; }
    stepStation(dt);
    var plan = [0, 1, 3];
    var hx = 760, hy = 1670;
    demo.press = false;
    if (phase === 'answer' && stopT <= 0 && demo.k < plan.length) {
      demo.el += dt;
      var d = plan[demo.k], dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d];
      var ph = demo.el - 0.35;
      if (ph > 0) { demo.press = true; hx += dx * Math.min(1, ph / 0.2) * 170; hy += dy * Math.min(1, ph / 0.2) * 170; }
      if (ph >= 0.2) { sendDir(d); demo.k++; demo.el = 0; }
    }
    demo.x += (hx - demo.x) * Math.min(1, dt * 16);
    demo.y += (hy - demo.y) * Math.min(1, dt * 16);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 92, GREEN);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, CYAN);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, AMBER);
      else out('TAP TO START', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, '#000000', 0.88);
      glow(90, H * 0.3, W - 90, H * 0.3, cleared ? 'g' : 'r', 5);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? GREEN : RED);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, WHITE);
      out(rounds + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, WHITE);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, AMBER);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, AMBER);
      if (!cleared) out('あと' + (NEEDED - rounds) + '組!', W / 2, H * 0.27, 64, RED);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepStation(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { rounds: rounds, perfect: perfects, sent: sent, misses: misses };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      // 見本の間は時間が減らない
      if (stopT <= 0 && phase !== 'show') timeLeft -= dt;
      stepStation(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: RED, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, AMBER);
  });

  function startBgm() {
    game.audio.melody([
      ['E4', 1], ['R', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 1],
      ['E4', 1], ['R', 0.5], ['D4', 0.5], ['E4', 2],
      ['G4', 1], ['R', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 1],
      ['B4', 1], ['A4', 1], ['E4', 2],
    ], { tempo: 76, wave: 'sine', volume: 0.05, loop: true, bass: [['E2', 4], ['C2', 4], ['G2', 4], ['B1', 4]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    demoSeq = [0, 1, 2];
    initGame();
  });
})(game);
