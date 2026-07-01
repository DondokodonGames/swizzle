// 072-asteroid-split.js
// アステロイドスプリット — 大きな隕石を分裂させながら全部消す爆発連鎖
// 操作: タップで弾を発射、隕石は分裂する
// 成功: 全隕石を破壊  失敗: 隕石が3個画面外へ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'ASTEROID SPLIT';
  var HOW_TO_PLAY = 'TAP TO SHOOT, SPLIT & CLEAR';
  var MAX_TIME = 20;
  var START_COUNT = 1;      // 修正2: 4個 → 1個（分裂で計3ヒット）
  var MAX_ESCAPE = 3, BULLET_SPEED = 1100, GUN_X = W / 2, GUN_Y = H * 0.86;   // 修正1: 砲は下部

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var asteroids, bullets, particles, escaped, timeLeft, done, flash, stars;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function spawnAst(x, y, r, vx, vy) { asteroids.push({ x: x, y: y, r: r, vx: vx, vy: vy }); }
  function initialSpawn() { for (var i = 0; i < START_COUNT; i++) spawnAst(game.random(200, W - 200), -80, 88, (Math.random() - 0.5) * 200, 130 + Math.random() * 80); }
  function initGame() { asteroids = []; bullets = []; particles = []; escaped = 0; timeLeft = MAX_TIME; done = false; flash = 0; stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 * Math.ceil(Math.random() * 2), ph: Math.floor(Math.random() * 4) }); initialSpawn(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - GUN_X, dy = y - GUN_Y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push({ x: GUN_X, y: GUN_Y, vx: dx / dist * BULLET_SPEED, vy: dy / dist * BULLET_SPEED });
    game.audio.play('se_tap', 0.4);
  });

  // 世界観: 宇宙空間の小惑星迎撃。撃つと分裂し、全て消せばクリア。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < stars.length; i++) { var st = stars[i], a = Math.floor(game.time.elapsed * 3 + st.ph) % 2 === 0 ? 0.8 : 0.3; game.draw.rect(st.x, st.y, st.s, st.s, C.c, a); }
  }

  function drawScene() {
    for (var p = 0; p < particles.length; p++) game.draw.rect(snap(particles[p].x) - 8, snap(particles[p].y) - 8, 16, 16, C.f, particles[p].life / 0.4);
    for (var ai = 0; ai < asteroids.length; ai++) { var a = asteroids[ai]; drawPixelCircle(a.x, a.y, a.r, '#555577', 1); drawPixelCircle(a.x + a.r * 0.3, a.y - a.r * 0.2, a.r * 0.2, '#333355', 1); }
    for (var bu = 0; bu < bullets.length; bu++) game.draw.rect(snap(bullets[bu].x) - 10, snap(bullets[bu].y) - 10, 20, 20, C.d);
    // 砲台
    if (flash > 0) drawPixelCircle(GUN_X, GUN_Y, 60, C.c, flash / 0.1);
    game.draw.rect(snap(GUN_X) - 60, snap(GUN_Y), 120, 80, '#333366'); game.draw.rect(snap(GUN_X) - 16, snap(GUN_Y) - 60, 32, 60, '#5555aa');
    drawPixelCircle(GUN_X, GUN_Y, 36, C.a, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!asteroids) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.57, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.64, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      for (var b = bullets.length - 1; b >= 0; b--) {
        var bl = bullets[b]; bl.x += bl.vx * dt; bl.y += bl.vy * dt;
        if (bl.x < -20 || bl.x > W + 20 || bl.y < -20 || bl.y > H + 20) { bullets.splice(b, 1); continue; }
        for (var a = asteroids.length - 1; a >= 0; a--) {
          var ast = asteroids[a], dx = bl.x - ast.x, dy = bl.y - ast.y;
          if (Math.sqrt(dx * dx + dy * dy) < ast.r + 12) {
            for (var p = 0; p < 8; p++) { var ang = p / 8 * Math.PI * 2; particles.push({ x: ast.x, y: ast.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4 }); }
            var spd = Math.sqrt(ast.vx * ast.vx + ast.vy * ast.vy) || 1;
            if (ast.r > 40) { var px = -ast.vy / spd, py = ast.vx / spd; spawnAst(ast.x, ast.y, ast.r * 0.55, ast.vx * 0.7 + px * 90, ast.vy * 0.7 + py * 90); spawnAst(ast.x, ast.y, ast.r * 0.55, ast.vx * 0.7 - px * 90, ast.vy * 0.7 - py * 90); }
            asteroids.splice(a, 1); bullets.splice(b, 1); game.audio.play('se_tap', 0.7); flash = 0.1;
            if (asteroids.length === 0) { finish(true); return; }
            break;
          }
        }
      }
      for (var i = asteroids.length - 1; i >= 0; i--) {
        var ast = asteroids[i]; ast.x += ast.vx * dt; ast.y += ast.vy * dt;
        if (ast.x < -ast.r - 20) ast.x = W + ast.r; if (ast.x > W + ast.r + 20) ast.x = -ast.r;
        if (ast.y > H + ast.r + 20) { asteroids.splice(i, 1); escaped++; game.audio.play('se_failure', 0.4); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      for (var p2 = particles.length - 1; p2 >= 0; p2--) { particles[p2].x += particles[p2].vx * dt; particles[p2].y += particles[p2].vy * dt; particles[p2].life -= dt; if (particles[p2].life <= 0) particles.splice(p2, 1); }
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('LEFT ' + asteroids.length, W / 2, 96, 48, C.c);
    for (var e = 0; e < MAX_ESCAPE; e++) game.draw.rect(W / 2 + (e - 1) * 64 - 20, 150, 40, 40, e < escaped ? C.e : '#330000');
    txt('TAP TO SHOOT!', W / 2, H - 50, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
