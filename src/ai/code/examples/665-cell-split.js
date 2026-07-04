// 665-cell-split.js
// セルスプリット — 膨らむ細胞が限界サイズに達する前にタップで2つに分裂させる
// 操作: 細胞をタップで分裂。放っておくと膨らみ続け、赤くなり限界を超えると失敗
// 成功: 12回 分裂  失敗: 3個 過膨張 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、顕微鏡） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CELL SPLIT';
  var HOW_TO_PLAY = 'TAP A CELL TO SPLIT IT BEFORE IT GROWS TOO BIG · RED MEANS DANGER';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_OVER = 3;
  var MAX_R = 130, DANGER_R = 110;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cells, nextId, splits, overloads, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#050e07');
  }

  function background() { game.draw.clear(C.bg); for (var gx = 0; gx < W; gx += 80) game.draw.rect(snap(gx), 0, 2, H, '#0d2010', 0.6); for (var gy = 0; gy < H; gy += 80) game.draw.rect(0, snap(gy), W, 2, '#0d2010', 0.6); }

  function addCell(x, y, r) { cells.push({ id: nextId++, x: x, y: y, r: r || 28, growRate: 18 + Math.random() * 14, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, overloaded: false }); }

  function initGame() { cells = []; nextId = 0; splits = 0; overloads = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; addCell(W * 0.35, H * 0.45, 36); addCell(W * 0.65, H * 0.55, 28); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (splits * 400 + Math.ceil(timeLeft) * 100) : splits * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ci = 0; ci < cells.length; ci++) {
      var cell = cells[ci], danger = cell.r >= DANGER_R, col = danger ? C.a : C.d, pu = 1 + Math.sin(game.time.elapsed * 3 + ci) * 0.04, r = cell.r * pu;
      pc(cell.x, cell.y, r, col, 0.75); pc(cell.x - r * 0.3, cell.y - r * 0.3, r * 0.18, C.g, 0.5); pc(cell.x, cell.y, r * 0.28, danger ? C.f : C.b, 0.4);
      if (danger) ring(cell.x, cell.y, r + 10, C.a, ((Math.sin(game.time.elapsed * 8) + 1) * 0.5) * 0.3);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitIdx = -1, hitDist = Infinity;
    for (var i = 0; i < cells.length; i++) { var c = cells[i], dx = tx - c.x, dy = ty - c.y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < c.r + 20 && dist < hitDist) { hitDist = dist; hitIdx = i; } }
    if (hitIdx < 0) return;
    var c2 = cells[hitIdx], r2 = c2.r * 0.65, angle = Math.random() * Math.PI * 2;
    addCell(c2.x + Math.cos(angle) * r2, c2.y + Math.sin(angle) * r2, r2); addCell(c2.x - Math.cos(angle) * r2, c2.y - Math.sin(angle) * r2, r2); cells.splice(hitIdx, 1);
    splits++; flash = 0.25; flashCol = C.b; resultText = 'SPLIT!'; resultTimer = 0.4; game.audio.play('se_success', 0.5);
    for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: c2.x, y: c2.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.35, col: C.b }); }
    if (splits >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cells) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MITOSIS MASTER!' : 'RUPTURED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var i = cells.length - 1; i >= 0; i--) {
        var c = cells[i]; c.r += c.growRate * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x - c.r < 0) { c.x = c.r; c.vx = Math.abs(c.vx); } if (c.x + c.r > W) { c.x = W - c.r; c.vx = -Math.abs(c.vx); }
        if (c.y - c.r < 90) { c.y = 90 + c.r; c.vy = Math.abs(c.vy); } if (c.y + c.r > H * 0.92) { c.y = H * 0.92 - c.r; c.vy = -Math.abs(c.vy); }
        if (c.r >= MAX_R && !c.overloaded) { c.overloaded = true; overloads++; flash = 0.4; flashCol = C.a; resultText = 'BURST!'; resultTimer = 0.55; game.audio.play('se_failure', 0.4); cells.splice(i, 1); if (overloads >= MAX_OVER) { finish(false); return; } }
      }
      if (cells.length === 0) addCell(W / 2, H / 2, 30);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.77), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(splits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OVER; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OVER - 1) / 2) * 56) - 10, 224, 20, 20, oi < overloads ? C.a : '#050e07');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
