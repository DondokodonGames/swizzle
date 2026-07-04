// 611-neon-tetro.js
// ネオンテトロ — 落ちてくるブロック壁の隙間を見抜き、左右移動ですり抜ける
// 操作: 左右スワイプ/画面左右タップでプレイヤーを列移動。壁の隙間を通す
// 成功: 15段 通過  失敗: 3回 衝突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、落下シャフト） ──
  var C = { bg:'#050010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON TETRO';
  var HOW_TO_PLAY = 'SWIPE OR TAP LEFT/RIGHT TO SLIDE THROUGH THE GAP IN EACH FALLING WALL';
  var MAX_TIME = 18;
  var NEEDED   = 15;         // 修正2: 30 → 15
  var MAX_HITS = 3;
  var COLS = 6, COL_W = W / COLS, PLAYER_W = COL_W * 0.7, PLAYER_H = 56, PLAYER_Y = snap(H * 0.78), ROW_H = 130;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerCol, playerX, targetX, rows, descended, hits, timeLeft, done, particles, flash, flashCol, speed, spawnTimer, invincible;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#100030');
  }

  function background() { game.draw.clear(C.bg); for (var ci = 1; ci < COLS; ci++) game.draw.rect(snap(ci * COL_W) - 1, 0, 2, H, '#0a0025', 0.9); }

  function spawnRow() {
    var gapCols = Math.min(3, 2 + Math.floor(descended / 8)), gap = [], available = [0, 1, 2, 3, 4, 5];
    for (var i = 0; i < gapCols; i++) { var idx = Math.floor(Math.random() * available.length); gap.push(available.splice(idx, 1)[0]); }
    rows.push({ y: -ROW_H, gaps: gap });
  }

  function initGame() { playerCol = 2; playerX = playerCol * COL_W + COL_W / 2; targetX = playerX; rows = []; descended = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; speed = 280; spawnTimer = 0; invincible = 0; spawnRow(); spawnRow(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (descended * 400 + Math.ceil(timeLeft) * 100) : descended * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      for (var ci = 0; ci < COLS; ci++) {
        var isGap = false;
        for (var gi = 0; gi < row.gaps.length; gi++) if (row.gaps[gi] === ci) { isGap = true; break; }
        if (!isGap) { game.draw.rect(ci * COL_W + 4, snap(row.y) + 4, COL_W - 8, ROW_H - 8, C.a, 0.85); game.draw.rect(ci * COL_W + 4, snap(row.y) + 4, COL_W - 8, 6, C.c, 0.6); }
      }
    }
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.rect(snap(playerX - PLAYER_W / 2), PLAYER_Y, PLAYER_W, PLAYER_H, C.b, pa);
    game.draw.rect(snap(playerX - PLAYER_W / 2), PLAYER_Y, PLAYER_W, 8, C.g, pa * 0.8);
    pc(playerX, PLAYER_Y + PLAYER_H / 2, PLAYER_W * 0.22, C.g, pa * 0.4);
  }

  function moveTo(col) { playerCol = col; targetX = playerCol * COL_W + COL_W / 2; game.audio.play('se_tap', 0.15); }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && playerCol > 0) moveTo(playerCol - 1);
    else if (dir === 'right' && playerCol < COLS - 1) moveTo(playerCol + 1);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2 && playerCol > 0) moveTo(playerCol - 1);
    else if (tx >= W / 2 && playerCol < COLS - 1) moveTo(playerCol + 1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rows) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEAR RUN!' : 'CRUSHED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; if (invincible > 0) invincible -= dt;
      playerX += (targetX - playerX) * Math.min(1, dt * 12);
      speed = 280 + (MAX_TIME - timeLeft) * 10 + descended * 3;
      spawnTimer += dt; if (spawnTimer > ROW_H / speed) { spawnTimer = 0; spawnRow(); }
      for (var ri = rows.length - 1; ri >= 0; ri--) {
        rows[ri].y += speed * dt;
        if (invincible <= 0 && rows[ri].y + ROW_H >= PLAYER_Y && rows[ri].y <= PLAYER_Y + PLAYER_H) {
          var inGap = false;
          for (var gi = 0; gi < rows[ri].gaps.length; gi++) { var gc = rows[ri].gaps[gi], gL = gc * COL_W, gR = gL + COL_W; if (playerX - PLAYER_W / 2 >= gL && playerX + PLAYER_W / 2 <= gR) { inGap = true; break; } }
          if (!inGap) {
            hits++; invincible = 1.0; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5);
            for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: PLAYER_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.b }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
        if (rows[ri].y > H + ROW_H) { rows.splice(ri, 1); descended++; if (descended >= NEEDED) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(descended + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#100030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
