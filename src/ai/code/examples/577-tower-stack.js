// 577-tower-stack.js
// タワースタック — 左右に揺れるブロックを、下の塔の真上に来た瞬間タップで落として積む
// 操作: タップでブロックを落とす（重なった幅だけ残る。全く重ならないとミス）
// 成功: 6段 積む  失敗: 3回 はみ出し or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、積み木） ──
  var C = { bg:'#0a0c14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER STACK';
  var HOW_TO_PLAY = 'TAP TO DROP THE SWINGING BLOCK ONTO THE TOWER · STAY ALIGNED';
  var MAX_TIME = 20;
  var TARGET = 6;            // 修正2: 15 → 6
  var MAX_FAIL = 3;
  var TOWER_X = W / 2, BASE_Y = snap(H * 0.82), BASE_W = 300, BLOCK_H = 60, SWING_SPEED = 2.4, SWING_RANGE = W * 0.36;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tower, falling, level, fails, timeLeft, done, particles, flash, flashCol, dropped, viewOffset;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#12141c');
  }

  function background() { game.draw.clear(C.bg); }

  function topBlockY() { return BASE_Y - (tower.length - 1) * BLOCK_H - viewOffset; }

  function spawnFalling() { var top = tower[tower.length - 1]; falling = { x: TOWER_X, w: top.w * (0.75 + Math.random() * 0.2) }; dropped = false; }

  function initGame() { tower = [{ x: TOWER_X, w: BASE_W }]; level = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; dropped = false; viewOffset = 0; spawnFalling(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (level * 600 + Math.ceil(timeLeft) * 100) : level * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function dropBlock() {
    if (dropped || done) return; dropped = true;
    var top = tower[tower.length - 1], left = Math.max(top.x - top.w / 2, falling.x - falling.w / 2), right = Math.min(top.x + top.w / 2, falling.x + falling.w / 2), overlap = right - left;
    if (overlap <= 0) {
      fails++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: falling.x, y: topBlockY() - BLOCK_H, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); }
      if (fails >= MAX_FAIL) { finish(false); return; }
      setTimeout(function() { if (!done) spawnFalling(); }, 700); return;
    }
    var nx = (left + right) / 2, nw = Math.min(overlap, falling.w); tower.push({ x: nx, w: nw }); level++; game.audio.play('se_success', 0.6); flash = 0.25; flashCol = C.b;
    for (var pi2 = 0; pi2 < 6; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: nx, y: topBlockY() - BLOCK_H, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150, life: 0.3, col: C.b }); }
    if (level >= TARGET) { finish(true); return; }
    if (tower.length > 6) viewOffset += BLOCK_H;
    setTimeout(function() { if (!done) spawnFalling(); }, 500);
  }

  function drawScene() {
    for (var ti = 0; ti < tower.length; ti++) {
      var block = tower[ti], by = BASE_Y - ti * BLOCK_H - viewOffset; if (by > H + 20 || by < -BLOCK_H) continue;
      var col = ti === 0 ? C.d : C.e;
      game.draw.rect(block.x - block.w / 2, by - BLOCK_H, block.w, BLOCK_H, col, 0.9); game.draw.rect(block.x - block.w / 2, by - BLOCK_H, block.w, 10, C.g, 0.4);
    }
    if (!dropped && falling) {
      var sy = snap(H * 0.10) - viewOffset;
      game.draw.rect(falling.x - falling.w / 2, sy, falling.w, BLOCK_H, C.f, 0.9); game.draw.rect(falling.x - falling.w / 2, sy, falling.w, 10, C.c, 0.5);
      var top = tower[tower.length - 1], topY = topBlockY() - BLOCK_H, sLeft = Math.max(top.x - top.w / 2, falling.x - falling.w / 2), sRight = Math.min(top.x + top.w / 2, falling.x + falling.w / 2);
      if (sRight > sLeft) game.draw.rect(sLeft, topY, sRight - sLeft, BLOCK_H, C.c, 0.15);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    dropBlock();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tower) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.54, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER BUILT!' : 'TOPPLED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (!dropped && falling) { var sp = SWING_SPEED + level * 0.08; falling.x = TOWER_X + Math.sin(game.time.elapsed * sp) * SWING_RANGE; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(level + ' / ' + TARGET + ' FLOORS', W / 2, 168, 46, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#12141c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
