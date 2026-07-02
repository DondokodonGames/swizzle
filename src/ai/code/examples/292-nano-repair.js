// 292-nano-repair.js
// ナノリペア — 回路基板の配線に走る断線点を、消える前に素早くタップして修理する
// 操作: 赤く点滅する断線点をタップして修理
// 成功: 3箇所修理  失敗: 3箇所を放置 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、回路基板） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#66ff88', f:'#ff6600', g:'#eaffea', board:'#0a2016' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NANO REPAIR';
  var HOW_TO_PLAY = 'TAP THE BLINKING BREAKS BEFORE THEY FADE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var MAX_LOST = 3;          // 修正2: 8 → 3
  var BOARD_Y = snap(H * 0.20), BOARD_H = snap(H * 0.62);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var paths, breaks, repaired, lost, timeLeft, done, spawnTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, BOARD_Y, W, BOARD_H, C.board, 0.9); }

  function buildPaths() {
    paths = [];
    var hy = [], vx = [];
    for (var i = 0; i < 5; i++) hy.push(snap(BOARD_Y + 80 + i * (BOARD_H - 160) / 4));
    for (var j = 0; j < 5; j++) vx.push(snap(120 + j * (W - 240) / 4));
    for (var h = 0; h < hy.length; h++) paths.push({ type: 'h', y: hy[h], a: 60, b: W - 60 });
    for (var v = 0; v < vx.length; v++) paths.push({ type: 'v', x: vx[v], a: hy[0], b: hy[hy.length - 1] });
    paths.nodes = []; for (var a = 0; a < hy.length; a++) for (var b = 0; b < vx.length; b++) paths.nodes.push({ x: vx[b], y: hy[a] });
  }

  function drawBoard() {
    for (var i = 0; i < paths.length; i++) { var p = paths[i]; if (p.type === 'h') game.draw.rect(p.a, p.y - 3, p.b - p.a, 6, C.d, 0.7); else game.draw.rect(p.x - 3, p.a, 6, p.b - p.a, C.d, 0.7); }
    for (var n = 0; n < paths.nodes.length; n++) game.draw.rect(paths.nodes[n].x - 6, paths.nodes[n].y - 6, 12, 12, C.e, 0.8);
  }

  function spawnBreak() {
    if (breaks.length >= 5) return;
    var p = paths[Math.floor(Math.random() * paths.length)], bx, by;
    if (p.type === 'h') { bx = snap(p.a + Math.random() * (p.b - p.a)); by = p.y; } else { bx = p.x; by = snap(p.a + Math.random() * (p.b - p.a)); }
    for (var i = 0; i < breaks.length; i++) { var dx = breaks[i].x - bx, dy = breaks[i].y - by; if (dx * dx + dy * dy < 100 * 100) return; }
    breaks.push({ x: bx, y: by, life: 2.4, max: 2.4 });
  }

  function initGame() { breaks = []; repaired = 0; lost = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.5; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (repaired * 500 + Math.ceil(timeLeft) * 80) : repaired * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBreak(b) {
    var lr = b.life / b.max, blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
    if (blink) { pc(b.x, b.y, 26, C.a, 0.9 * lr); pc(b.x, b.y, 14, C.g, 0.9); txt('X', b.x, b.y + 12, 30, C.a); }
    var segs = 10, on = Math.ceil(segs * lr);
    for (var s = 0; s < on; s++) { var a = -Math.PI / 2 + s / segs * Math.PI * 2; game.draw.rect(snap(b.x + Math.cos(a) * 38) - 4, snap(b.y + Math.sin(a) * 38) - 4, 8, 8, C.a, 0.8); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = breaks.length - 1; i >= 0; i--) {
      var b = breaks[i], dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy < 70 * 70) {
        repaired++; game.audio.play('se_success', 0.45);
        for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.e }); }
        breaks.splice(i, 1);
        if (repaired >= NEEDED) { finish(true); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!paths) buildPaths(); background(); drawBoard(); drawBreak({ x: W / 2, y: H * 0.5, life: 2, max: 2.4 });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 24, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawBoard();
      txt(resultSuccess ? 'CIRCUIT FIXED!' : 'SYSTEM DOWN', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnBreak(); spawnTimer = 0.9 + Math.random() * 0.6; }
      for (var i = breaks.length - 1; i >= 0; i--) { breaks[i].life -= dt; if (breaks[i].life <= 0) { breaks.splice(i, 1); lost++; game.audio.play('se_failure', 0.4); if (lost >= MAX_LOST) { finish(false); return; } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var bi = 0; bi < breaks.length; bi++) drawBreak(breaks[bi]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(repaired + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LOST; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LOST - 1) / 2) * 56) - 10, 224, 20, 20, li < lost ? C.a : '#0a2010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    buildPaths();
    initGame();
  });
})(game);
