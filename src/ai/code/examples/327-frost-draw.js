// 327-frost-draw.js
// フロストドロー — 凍った窓をスワイプでこすって霜を溶かし、隠れた図形のシルエットを浮かび上がらせる
// 操作: スワイプ/タップで霜を溶かす
// 成功: 3つの図形を見つける  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、凍った窓） ──
  var C = { bg:'#0a1628', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', frost:'#bcd8f0' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FROST DRAW';
  var HOW_TO_PLAY = 'SWIPE TO MELT THE FROST · REVEAL THE SHAPES';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var FC = 16, FR = 24;      // 霜グリッド

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var frost, shapes, found, timeLeft, done, breaths, particles, cellW, cellH;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a28');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    cellW = W / FC; cellH = H / FR;
    frost = []; for (var r = 0; r < FR; r++) { frost[r] = []; for (var c = 0; c < FC; c++) frost[r][c] = 1.0; }
    var types = ['circle', 'square', 'star', 'diamond', 'triangle'];
    shapes = [
      { x: snap(W * 0.28), y: snap(H * 0.34), s: 130, type: types[Math.floor(Math.random() * 5)], found: false, reveal: 0 },
      { x: snap(W * 0.70), y: snap(H * 0.46), s: 140, type: types[Math.floor(Math.random() * 5)], found: false, reveal: 0 },
      { x: snap(W * 0.40), y: snap(H * 0.62), s: 150, type: types[Math.floor(Math.random() * 5)], found: false, reveal: 0 }
    ];
    found = 0; timeLeft = MAX_TIME; done = false; breaths = []; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (found * 700 + Math.ceil(timeLeft) * 100) : found * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function melt(tx, ty, radius) {
    var minC = Math.max(0, Math.floor((tx - radius) / cellW)), maxC = Math.min(FC - 1, Math.ceil((tx + radius) / cellW));
    var minR = Math.max(0, Math.floor((ty - radius) / cellH)), maxR = Math.min(FR - 1, Math.ceil((ty + radius) / cellH));
    for (var r = minR; r <= maxR; r++) for (var c = minC; c <= maxC; c++) { var cx = (c + 0.5) * cellW, cy = (r + 0.5) * cellH, dist = Math.hypot(cx - tx, cy - ty); if (dist < radius) frost[r][c] = Math.max(0, frost[r][c] - 0.5 * (1 - dist / radius)); }
  }

  function clearRatio(sh) {
    var sc = Math.floor(sh.x / cellW), sr = Math.floor(sh.y / cellH), clear = 0, total = 0;
    for (var r = Math.max(0, sr - 2); r <= Math.min(FR - 1, sr + 2); r++) for (var c = Math.max(0, sc - 2); c <= Math.min(FC - 1, sc + 2); c++) { total++; if (frost[r][c] < 0.5) clear++; }
    return total ? clear / total : 0;
  }

  function drawShape(sh, col, alpha) {
    var x = sh.x, y = sh.y, s = sh.s;
    if (sh.type === 'circle') pc(x, y, s / 2, col, alpha);
    else if (sh.type === 'square') game.draw.rect(snap(x - s / 2), snap(y - s / 2), snap(s), snap(s), col, alpha);
    else if (sh.type === 'star') { pc(x, y, s * 0.3, col, alpha); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * Math.PI * 2 / 5; pc(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.4, s * 0.16, col, alpha); } }
    else if (sh.type === 'diamond') { for (var yy = -s / 2; yy <= s / 2; yy += 8) { var half = (1 - Math.abs(yy) / (s / 2)) * s * 0.4; game.draw.rect(snap(x - half), snap(y + yy), snap(half * 2), 8, col, alpha); } }
    else { for (var yy2 = -s / 2; yy2 <= s / 2; yy2 += 8) { var half2 = (yy2 + s / 2) / s * s * 0.5; game.draw.rect(snap(x - half2), snap(y + yy2), snap(half2 * 2), 8, col, alpha); } }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    melt(x, y, 70); breaths.push({ x: x, y: y, r: 20, life: 0.4 });
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2; melt(mx, my, 90); breaths.push({ x: mx, y: my, r: 30, life: 0.6 }); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  function drawFrost() {
    for (var r = 0; r < FR; r++) for (var c = 0; c < FC; c++) { var v = frost[r][c]; if (v > 0.05) { var vr = Math.sin(r * 3.7 + c * 2.1) * 0.1 + 0.9; game.draw.rect(snap(c * cellW), snap(r * cellH), Math.ceil(cellW) + 1, Math.ceil(cellH) + 1, C.frost, v * vr * 0.85); } }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!frost) initGame(); background(); for (var i = 0; i < shapes.length; i++) drawShape(shapes[i], C.e, 0.5); drawFrost();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'REVEALED!' : 'STILL FROZEN', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var r = 0; r < FR; r++) for (var c = 0; c < FC; c++) if (frost[r][c] < 1) frost[r][c] = Math.min(1, frost[r][c] + dt * 0.02);
      for (var bi = breaths.length - 1; bi >= 0; bi--) { breaths[bi].r += 60 * dt; breaths[bi].life -= dt * 2; if (breaths[bi].life <= 0) breaths.splice(bi, 1); }
      for (var si = 0; si < shapes.length; si++) { if (!shapes[si].found) { shapes[si].reveal = clearRatio(shapes[si]); if (shapes[si].reveal > 0.6) { shapes[si].found = true; found++; game.audio.play('se_success', 0.6); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: shapes[si].x, y: shapes[si].y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.b }); } if (found >= NEEDED) { finish(true); return; } } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var si2 = 0; si2 < shapes.length; si2++) { var sh = shapes[si2]; drawShape(sh, sh.found ? C.b : C.e, sh.found ? 0.9 : 0.5 + sh.reveal * 0.4); }
    drawFrost();
    for (var bi2 = 0; bi2 < breaths.length; bi2++) pc(breaths[bi2].x, breaths[bi2].y, breaths[bi2].r, C.g, breaths[bi2].life * 0.25);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(found + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
