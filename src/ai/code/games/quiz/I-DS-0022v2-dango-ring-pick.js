// I-DS-0022v2-dango-ring-pick.js
// 団子の輪くらべ — 回る皿にのった2つの団子のうち、上に掛かった規格の輪の大きさに近い方を瞬時に選んで串に刺す
// 操作: 回り台の上で向かい合って回る2つの団子のうち、上の輪に大きさが近い方をタップ。選ぶと輪が両方に重なって答え合わせ。輪の大きさは串ごとに変わり、皿は串ごとに速く回る
// 終わり: 串3本(団子9個)を仕上げればCLEAR。遠い方を選ぶ/皿のまわりの輪が尽きるのが2回、または時間切れでGAME OVER
// @mechanic: size_judge
// @theme: monzen_dango_ring_pick
// 世界観: 門前町の団子屋の夜店で、団子職人が回り台で丸めた2つの団子を見比べ、店の規格の輪に近い方だけを三色の串に刺して並べていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 刺した団子の数・最速の見極め(秒)・最大コンボ
// スタイル: 80s NEON
var STYLE = { bg: ['#06061a', '#1a0a30'], main: ['#ff5ac8', '#5af0ff', '#f8f8ff'], accent: ['#ffe04a', '#7aff7a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'DANGO RING';
  var TIME_LIMIT = 15;
  var PER_SKEWER = 3;
  var SKEWERS = 3;
  var NEEDED = PER_SKEWER * SKEWERS;
  var MISS_MAX = 2;
  var CX = W * 0.5, CY = H * 0.5, ORBIT = 190, TRAY = 330;
  var RING_X = W * 0.5, RING_Y = H * 0.215;
  var LEVELS = [
    { ring: 82, spin: 0.7, margin: 24, limit: 1.9 },
    { ring: 104, spin: 1.1, margin: 17, limit: 1.6 },
    { ring: 66, spin: 1.6, margin: 12, limit: 1.35 },
  ];
  var C = {
    dark: STYLE.bg[0], violet: STYLE.bg[1], pink: STYLE.main[0], cyan: STYLE.main[1], white: STYLE.main[2],
    yellow: STYLE.accent[0], green: STYLE.accent[1], red: '#ff4a5a',
  };
  var SLOT_COL = [['#ff9ad8', '#ff5ac8'], ['#fffaf0', '#c8c0d8'], ['#9aff9a', '#4ac84a']];

  var CHEF_A = [
    '...rrrrrr...',
    '..ffffffff..',
    '.ffffffffff.',
    '.ffkffffkff.',
    '.ffffffffff.',
    '..ffmmmmff..',
    '...ffffff...',
    '..aaaaaaaa..',
    '.aaawwwwaaa.',
    'ffaawwwwaaff',
    '...wwwwww...',
    '...aa..aa...',
    '..kk....kk..',
  ];
  var CHEF_B = [
    '...rrrrrr...',
    '..ffffffff..',
    '.ffffffffff.',
    '.ffkffffkff.',
    '.ffffffffff.',
    '..ffffffff..',
    '...fmmmmf...',
    '..aaaaaaaa..',
    '.aaawwwwaaa.',
    'ffaawwwwaaff',
    '...wwwwww...',
    '..aa....aa..',
    '..kk....kk..',
  ];
  var CHEF_SAD = [
    '............',
    '...rrrrrr...',
    '..ffffffff..',
    '.ffffffffff.',
    '.fkkffffkkf.',
    '.ffffffffff.',
    '...fmmmmf...',
    '..aaaaaaaa..',
    '.aaawwwwaaa.',
    'f.aawwwwaa.f',
    '...wwwwww...',
    '..aa....aa..',
    '.kk......kk.',
  ];
  var CHEF_PAL = { r: C.pink, f: '#f0c8a0', k: '#101018', m: '#c04060', a: '#3a4aa8', w: C.white };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, picked, misses, score, combo, maxCombo, fastest, spinA, pair, phase, phT, chosen, flyT;
  var hitStop, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, celebT, chefPose;

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: C.violet, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  function neonRing(cx, cy, r, col, w) {
    var n = 40;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < n; i++) {
        var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        game.draw.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, pass === 0 ? col + '40' : col, pass === 0 ? w * 3 : w);
      }
    }
  }
  function level() { return LEVELS[Math.min(SKEWERS - 1, Math.floor(picked / PER_SKEWER))]; }
  function slot() { return picked % PER_SKEWER; }

  function initGame() {
    clock = TIME_LIMIT; picked = 0; misses = 0; score = 0; combo = 0; maxCombo = 0; fastest = 9; spinA = 0;
    hitStop = 0; badPending = null; ready = 0.8; done = false; endT = 0; won = false; chefPose = 0;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; celebT = 0; chosen = -1; flyT = 0;
    newPair();
  }

  function newPair() {
    var L = level();
    var near = game.random(0, 8);
    var far = near + L.margin + game.random(0, 14);
    var mode = Math.floor(Math.random() * 3);
    var sNear = Math.random() < 0.5 ? 1 : -1;
    var sFar = mode === 0 ? sNear : (mode === 1 ? -sNear : (Math.random() < 0.5 ? 1 : -1));
    var rNear = Math.max(38, Math.min(150, L.ring + sNear * near));
    var rFar = Math.max(38, Math.min(150, L.ring + sFar * far));
    if (Math.abs(rFar - L.ring) - Math.abs(rNear - L.ring) < L.margin * 0.8) rFar = L.ring + (rFar >= L.ring ? 1 : -1) * (Math.abs(rNear - L.ring) + L.margin);
    var correct = Math.random() < 0.5 ? 0 : 1;
    pair = { r: correct === 0 ? [rNear, rFar] : [rFar, rNear], correct: correct, ring: L.ring };
    phase = 'pick'; phT = 0; chosen = -1;
  }

  function dangoPos(i) {
    var a = spinA + i * Math.PI;
    return { x: CX + Math.cos(a) * ORBIT, y: CY + Math.sin(a) * ORBIT };
  }

  function choose(i, real) {
    if (phase !== 'pick') return;
    chosen = i;
    var p = dangoPos(i);
    game.audio.play('se_tap', real ? 0.3 : 0.15);
    if (i === pair.correct) {
      combo++;
      var fast = phT < 0.7;
      game.feedback.good(p.x, p.y - pair.r[i] - 30, { text: fast ? 'PERFECT' : 'GOOD', color: C.green });
      if (real) {
        picked++;
        if (combo > maxCombo) maxCombo = combo;
        if (phT < fastest) fastest = phT;
        score += (fast ? 150 : 100) * Math.min(3, 1 + Math.floor(combo / 3));
        if (combo === 3 || combo === 6) { game.fx.popup('COMBO x' + combo, W * 0.5, H * 0.3, { color: C.yellow, size: 64 }); game.audio.play('se_milestone', 0.4); }
      }
      chefPose = 0.3;
      phase = 'reveal'; phT = 0; flyT = 0;
    } else {
      combo = 0;
      hitStop = 0.45; badPending = { real: real, x: p.x, y: p.y };
      game.audio.tone('D3', 0.16, { wave: 'square', volume: 0.12 });
      game.fx.flash('#ffffff', 0.1);
      phase = 'wrong'; phT = 0;
    }
  }

  function timeoutPair(real) {
    combo = 0;
    chosen = -1;
    hitStop = 0.45; badPending = { real: real, x: CX, y: CY };
    game.audio.tone('C3', 0.16, { wave: 'square', volume: 0.1 });
    phase = 'wrong'; phT = 0;
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    game.feedback.bad(b ? b.x : CX, b ? b.y - 60 : CY, { text: 'MISS' });
    if (b && b.real) {
      misses++;
      if (misses >= MISS_MAX) { finish(false); return; }
    }
    newPair();
  }

  function simulate(dt, real) {
    var L = level();
    spinA += L.spin * dt;
    phT += dt;
    if (chefPose > 0) chefPose -= dt;
    if (phase === 'pick') {
      if (phT >= L.limit) timeoutPair(real);
    } else if (phase === 'reveal') {
      flyT = phT;
      if (phT > 0.38) {
        game.audio.play('se_coin', real ? 0.35 : 0.18);
        if (real && slot() === 0 && picked > 0) { game.fx.burst(CX, H * 0.86, { color: C.yellow, count: 20, speed: 380 }); }
        if (real && picked >= NEEDED) { finish(true); return; }
        newPair();
      }
    }
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 20) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { dango: picked, skewers: Math.floor(picked / PER_SKEWER), misses: misses, maxCombo: maxCombo, fastestSec: fastest < 9 ? Math.round(fastest * 100) / 100 : 0 };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 近い方を3回選び、4回目は遠い方を選んでMISS ──
  var demo = { t: 0, gx: CX, gy: H * 0.8, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n = 0; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) { badPending = null; game.feedback.bad(CX, CY - 60, { text: 'MISS' }); newPair(); } }
    else {
      var L = level();
      spinA += L.spin * dt; phT += dt;
      if (phase === 'reveal' && phT > 0.38) newPair();
    }
    var target = phase === 'pick' ? (demo.n === 3 ? 1 - pair.correct : pair.correct) : -1;
    if (target >= 0) {
      var p = dangoPos(target);
      demo.gx += (p.x - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (p.y - demo.gy) * Math.min(1, dt * 8);
      if (phT > 0.75 && Math.hypot(demo.gx - p.x, demo.gy - p.y) < 40) { demo.press = 0.2; demo.n++; choose(target, false); }
    }
    demo.press = Math.max(0, demo.press - dt);
  }

  // ── 描画(80年代ネオン: 濃紺グラデ + 疑似グロー) ──────────────────────────
  function drawStall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.dark], [0.5, C.violet], [1, C.dark]]);
    for (var i = 0; i < 7; i++) {
      var lx = 80 + i * 155, ly = 290 + Math.sin(t * 1.5 + i) * 6;
      game.draw.line(lx, 240, lx, ly - 30, '#4a3a6a', 3);
      game.draw.circle(lx, ly, 40, i % 2 ? C.pink : C.yellow, 0.18);
      game.draw.circle(lx, ly, 24, i % 2 ? C.pink : C.yellow, 0.75);
    }
    for (var g = 0; g < 5; g++) game.draw.line(0, H * 0.74 + g * 16, W, H * 0.74 + g * 16, '#3a2a5a', 2);
  }

  function drawRingGauge() {
    var rg = pair ? pair.ring : level().ring;
    var t = game.time.elapsed;
    game.draw.line(RING_X, RING_Y - rg - 40, RING_X, RING_Y - rg, C.white, 4);
    neonRing(RING_X, RING_Y, rg + Math.sin(t * 4) * 2, C.yellow, 6);
  }

  function drawTray() {
    var t = game.time.elapsed;
    var L = level();
    game.draw.circle(CX, CY, TRAY + 30, C.cyan, 0.08);
    game.draw.circle(CX, CY, TRAY, '#140c2a');
    neonRing(CX, CY, TRAY, C.cyan, 5);
    for (var k = 0; k < 8; k++) {
      var a = spinA + k * Math.PI / 4;
      game.draw.line(CX + Math.cos(a) * 60, CY + Math.sin(a) * 60, CX + Math.cos(a) * (TRAY - 20), CY + Math.sin(a) * (TRAY - 20), '#2a1e4a', 3);
    }
    // 残り時間: 皿のまわりで縮む輪
    if (phase === 'pick') {
      var frac = Math.max(0, 1 - phT / L.limit);
      var n = 48, lit = Math.floor(n * frac);
      for (var i = 0; i < lit; i++) {
        var a0 = -Math.PI / 2 + (i / n) * Math.PI * 2, a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2;
        game.draw.line(CX + Math.cos(a0) * (TRAY + 24), CY + Math.sin(a0) * (TRAY + 24), CX + Math.cos(a1) * (TRAY + 24), CY + Math.sin(a1) * (TRAY + 24), frac < 0.35 ? C.red : C.pink, 8);
      }
    }
  }

  function drawDango(i) {
    if (!pair) return;
    var t = game.time.elapsed;
    var p = dangoPos(i);
    var r = pair.r[i];
    var col = SLOT_COL[phase === 'reveal' && state === S.PLAYING ? (picked + 2) % 3 : slot()];
    var isHit = phase === 'wrong' && chosen === i && hitStop > 0;
    if (phase === 'reveal' && i === chosen) {
      var k = Math.min(1, flyT / 0.38);
      p = { x: p.x + (CX - p.x) * k, y: p.y + (H * 0.84 - p.y) * k };
      r = r + (40 - r) * k;
    }
    var big = isHit ? 1.3 : 1;
    var bob = phase === 'pick' ? Math.sin(t * 6 + i * 3) * 4 : 0;
    game.draw.circle(p.x, p.y + bob, r * big + 16, col[1], 0.2);
    game.draw.circle(p.x, p.y + bob, r * big, isHit && Math.floor(t * 18) % 2 === 0 ? '#ffffff' : col[1]);
    game.draw.circle(p.x - 4, p.y - 4 + bob, r * big * 0.88, isHit && Math.floor(t * 18) % 2 === 0 ? '#ffffff' : col[0]);
    var e = Math.max(4, r * 0.08);
    game.draw.rect(p.x - r * 0.3 - e, p.y - r * 0.15 + bob, e * 2, e * 2, '#301830');
    game.draw.rect(p.x + r * 0.3 - e, p.y - r * 0.15 + bob, e * 2, e * 2, '#301830');
    game.draw.rect(p.x - e * 1.5, p.y + r * 0.2 + bob, e * 3, e, '#c04060');
    if (phase === 'pick' && Math.floor(t * 4) % 2 === 0) neonRing(p.x, p.y + bob, r + 10, C.white, 2);
    // 答え合わせ: 規格の輪を両方に重ねる
    if ((phase === 'reveal' && flyT < 0.3) || (phase === 'wrong' && hitStop > 0)) {
      var q = dangoPos(i);
      neonRing(q.x, q.y, pair.ring, i === pair.correct ? C.green : C.red, 5);
    }
  }

  function drawSkewer(mood) {
    var t = game.time.elapsed;
    var spr = mood === 'sad' ? CHEF_SAD : (chefPose > 0 || mood === 'win' || Math.floor(t * 2) % 2 === 0 ? CHEF_A : CHEF_B);
    var hop = mood === 'win' ? -Math.abs(Math.sin(t * 7)) * 36 : 0;
    game.draw.sprite(spr, CHEF_PAL, W * 0.22, H * 0.87 + hop, 14, { anchor: 'center' });
    // 串と刺さった団子
    var sx = CX, sy = H * 0.84;
    game.draw.line(sx, sy - 130, sx, sy + 150, '#e8c890', 8);
    var on = state === S.ATTRACT ? 1 : slot();
    if (state !== S.ATTRACT && done && won) on = PER_SKEWER;
    for (var k = 0; k < on; k++) {
      var col = SLOT_COL[k];
      game.draw.circle(sx, sy + 90 - k * 82, 40, col[1]);
      game.draw.circle(sx - 3, sy + 87 - k * 82, 35, col[0]);
    }
    // 仕上がった串の列
    var done3 = Math.floor(picked / PER_SKEWER);
    for (var s = 0; s < SKEWERS; s++) {
      var x = W * 0.72 + s * 74, y = H * 0.86;
      game.draw.line(x, y - 90, x, y + 90, s < done3 ? '#e8c890' : '#3a2a5a', 5);
      for (var d = 0; d < 3; d++) game.draw.circle(x, y + 50 - d * 46, 22, s < done3 ? SLOT_COL[d][0] : '#2a1e4a');
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.dark, 0.88);
    game.draw.line(0, 226, W, 226, C.pink, 3);
    for (var i = 0; i < NEEDED; i++) {
      var x = 70 + i * 44;
      game.draw.circle(x, 84, 16, i < picked ? SLOT_COL[i % 3][0] : '#2a1e4a');
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 90 - m * 64, 84, 22, m < MISS_MAX - misses ? C.pink : '#2a1e4a');
    say(picked + ' / ' + NEEDED, W * 0.62, 84, 52, C.white);
    say('SCORE ' + score, W * 0.5, 146, 32, C.cyan);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(70, 188, W - 140, 16, '#2a1e4a');
    game.draw.rect(70, 188, (W - 140) * frac, 16, frac < 0.25 ? C.red : C.cyan);
  }

  function scanlines() {
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.18);
  }

  function drawScene(mood) {
    drawStall();
    drawRingGauge();
    drawTray();
    drawDango(0);
    drawDango(1);
    drawSkewer(mood);
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0 || phase !== 'pick') { game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    var p0 = dangoPos(0), p1 = dangoPos(1);
    var d0 = Math.hypot(x - p0.x, y - p0.y), d1 = Math.hypot(x - p1.x, y - p1.y);
    var best = d0 <= d1 ? 0 : 1;
    if (Math.min(d0, d1) > pair.r[best] + 90) { game.fx.burst(x, y, { color: C.cyan, count: 4, speed: 100 }); return; }
    choose(best, true);
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawScene('');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.dark, 0.88);
      say(TITLE, W * 0.5, H * 0.05, 90, C.pink);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.yellow);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.97, 44, C.yellow);
      else say('INSERT COIN', W * 0.5, H * 0.97, 40, C.cyan);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawScene(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 540, C.dark, 0.9);
      neonRing(W * 0.5, H * 0.33, 260, C.violet, 3);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.yellow : C.red);
      say(picked + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.white);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.white);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.cyan);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.yellow); }
      else if (!won) say('あと' + Math.max(1, NEEDED - picked) + '個!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.955, 40, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt; spinA += dt * 0.5;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.22, H * 0.65), { color: Math.random() < 0.5 ? C.pink : C.yellow, count: 14, speed: 420 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.35);
    } else {
      simulate(dt, true);
      if (phase === 'pick') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }

    drawScene(done ? (won ? 'win' : 'sad') : '');
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, CY, 100, C.yellow);
      var hp = dangoPos(pair.correct);
      game.draw.hand(hp.x, hp.y, { press: ready < 0.4, scale: 14 });
    }
    scanlines();
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 2],
    ], { tempo: 128, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['E2', 2], ['F2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
