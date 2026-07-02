// 400-century-mark.js
// センチュリーマーク — 記念の盤面。バウンドする光弾を放って、すべての星を点灯させる
// 操作: タップで弾を発射（向きは自動で回転）、スワイプでその方向へ発射
// 成功: 全30個の星を点灯  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、祝祭） ──
  var C = { bg:'#02010c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CENTURY MARK';
  var HOW_TO_PLAY = 'FIRE BOUNCING SHOTS · LIGHT UP EVERY STAR';
  var MAX_TIME = 20;
  var COLS = 6, ROWS = 5, TOTAL = COLS * ROWS;
  var GRID_Y = snap(H * 0.30), CELL_W = snap(W / COLS), CELL_H = snap((H * 0.44) / ROWS);
  var CENTER_X = snap(W / 2), CENTER_Y = snap(H * 0.84);
  var DIRS = [{ dx: 0, dy: -1 }, { dx: 0.7, dy: -0.7 }, { dx: 1, dy: 0 }, { dx: 0.7, dy: 0.7 }, { dx: -0.7, dy: -0.7 }, { dx: -1, dy: 0 }, { dx: -0.7, dy: 0.7 }];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, balls, lit, timeLeft, done, particles, tapCount, celeb;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function litBar() {
    var t = Math.ceil(Math.min(1, lit / TOTAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    stars = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) stars.push({ col: c, row: r, lit: false, anim: 0 });
    balls = []; lit = 0; timeLeft = MAX_TIME; done = false; particles = []; tapCount = 0; celeb = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (lit * 100 + Math.ceil(timeLeft) * 200) : lit * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function fire(d) { balls.push({ x: CENTER_X, y: CENTER_Y, vx: d.dx * 650, vy: d.dy * 650, life: 2.4, trail: [] }); game.audio.play('se_tap', 0.3); }

  function drawStars() {
    for (var si = 0; si < stars.length; si++) { var s = stars[si], sx = s.col * CELL_W + CELL_W / 2, sy = GRID_Y + s.row * CELL_H + CELL_H / 2; if (s.lit) { pc(sx, sy, 14 + s.anim * 8, C.c, 0.9); pc(sx, sy, 8, C.g, 0.9); } else pc(sx, sy, 8, C.d, 0.7); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; fire(DIRS[tapCount % DIRS.length]); tapCount++;
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var d = dir === 'up' ? { dx: 0, dy: -1 } : dir === 'down' ? { dx: 0, dy: 1 } : dir === 'left' ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 }; fire(d);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawStars(); pc(CENTER_X, CENTER_Y, 30, C.e, 0.85); pc(CENTER_X, CENTER_Y, 16, C.g, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawStars();
      if (celeb > 0) game.draw.rect(0, 0, W, H, C.c, celeb * 0.12);
      txt(resultSuccess ? 'ALL LIT!' : 'TIME OUT', W / 2, H * 0.16, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.22, 56, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var si = 0; si < stars.length; si++) if (stars[si].lit && stars[si].anim < 1) stars[si].anim = Math.min(1, stars[si].anim + dt * 4);
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.trail.push({ x: b.x, y: b.y, life: 0.4 }); if (b.trail.length > 10) b.trail.shift();
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); } if (b.x > W) { b.x = W; b.vx = -Math.abs(b.vx); }
        if (b.y < GRID_Y - 20) { b.y = GRID_Y - 20; b.vy = Math.abs(b.vy); } if (b.y > GRID_Y + ROWS * CELL_H + 20) { b.y = GRID_Y + ROWS * CELL_H + 20; b.vy = -Math.abs(b.vy); }
        var hc = Math.max(0, Math.min(COLS - 1, Math.floor(b.x / CELL_W))), hr = Math.max(0, Math.min(ROWS - 1, Math.floor((b.y - GRID_Y) / CELL_H))), idx = hr * COLS + hc;
        if (b.y >= GRID_Y && idx >= 0 && idx < stars.length && !stars[idx].lit) { stars[idx].lit = true; lit++; for (var k = 0; k < 4; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); } if (lit >= TOTAL) { celeb = 2.0; finish(true); return; } }
        for (var ti = b.trail.length - 1; ti >= 0; ti--) b.trail[ti].life -= dt * 2;
        if (b.life <= 0) balls.splice(bi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawStars();
    for (var bi2 = 0; bi2 < balls.length; bi2++) { var b2 = balls[bi2]; for (var ti2 = 0; ti2 < b2.trail.length; ti2++) { var t = b2.trail[ti2]; if (t.life > 0) pc(t.x, t.y, 12 * t.life, C.d, t.life * 0.5); } pc(b2.x, b2.y, 18, C.f, 0.9); pc(b2.x - 5, b2.y - 5, 8, C.g, 0.7); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    pc(CENTER_X, CENTER_Y, 30, C.e, 0.85); pc(CENTER_X, CENTER_Y, 16, C.g, 0.9);

    litBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(lit + ' / ' + TOTAL, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
