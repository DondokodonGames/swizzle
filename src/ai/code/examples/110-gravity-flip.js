// 110-gravity-flip.js
// 重力反転 — タップで重力を反転し、天井と床の隙間をくぐり抜けるサバイバル
// 操作: タップで重力反転
// 成功: 5秒間生き残る  失敗: 壁か天井・床に接触

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY';
  var MAX_TIME = 5;         // 修正2: 生存系 20s → 5s
  var PLAYER_X = W * 0.24, PLAYER_R = 30, GRAVITY = 1800, WALL_W = 80, GAP_H = 420, SCROLL_SPEED = 360;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerY, playerVY, gravDir, walls, spawnX, timeLeft, done, survived, trail, deathFlash, particles;

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

  function spawnWall() { var topH = 220 + Math.random() * (H - GAP_H - 440); walls.push({ x: spawnX, topH: topH, botH: H - topH - GAP_H }); }
  function initGame() {
    playerY = H * 0.5; playerVY = 0; gravDir = 1; walls = []; spawnX = W + WALL_W; timeLeft = MAX_TIME; done = false; survived = 0; trail = []; deathFlash = 0; particles = [];
    spawnWall(); spawnX = W + WALL_W + 500; spawnWall();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(survived) * 40) : Math.floor(survived * 60);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    gravDir *= -1; playerVY *= 0.3; game.audio.play('se_tap', 0.5);
  });

  // 世界観: 反重力トンネル。天井と床を行き来し障害物の隙間を抜ける。
  function background() {
    game.draw.clear('#0a0018');
    for (var lx = ((-survived * SCROLL_SPEED) % 180 + 180) % 180; lx < W; lx += 180) game.draw.rect(snap(lx), 300, 60, H - 300, '#12002a', 0.5);
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.a, deathFlash * 0.35);
    txt('ANTI-GRAV TUNNEL', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var wi = 0; wi < walls.length; wi++) {
      var w = walls[wi];
      game.draw.rect(snap(w.x), 0, WALL_W, snap(w.topH), C.d);
      game.draw.rect(snap(w.x), snap(w.topH) - 8, WALL_W, 8, C.e);
      game.draw.rect(snap(w.x), snap(H - w.botH), WALL_W, snap(w.botH), C.d);
      game.draw.rect(snap(w.x), snap(H - w.botH), WALL_W, 8, C.e);
    }
    for (var tri = 0; tri < trail.length; tri++) { var t = trail[tri], tf = 1 - t.age / 0.35; drawPixelCircle(t.x, t.y, PLAYER_R * tf * 0.7, C.d, tf * 0.25); }
    drawPixelCircle(PLAYER_X, playerY, PLAYER_R, C.b, 1);
    game.draw.rect(snap(PLAYER_X) - 10, snap(playerY) - 10, 8, 8, C.g);
    game.draw.rect(snap(PLAYER_X) + 4, snap(playerY) - 10, 8, 8, C.g);
    for (var pp = 0; pp < particles.length; pp++) { var p = particles[pp]; game.draw.rect(snap(p.x) - 6, snap(p.y) - 6, 12, 12, C.b, p.life); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!walls) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      playerVY += GRAVITY * gravDir * dt; playerY += playerVY * dt;
      if (playerY - PLAYER_R < 0 || playerY + PLAYER_R > H) { deathFlash = 0.5; for (var pi = 0; pi < 14; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.6 }); } finish(false); return; }
      trail.push({ x: PLAYER_X, y: playerY, age: 0 });
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
      trail = trail.filter(function(t) { return t.age < 0.35; });
      for (var i = 0; i < walls.length; i++) walls[i].x -= SCROLL_SPEED * dt;
      walls = walls.filter(function(w) { return w.x + WALL_W > -10; });
      var lastX = walls.length ? walls[walls.length - 1].x : 0;
      if (lastX < W * 1.0) { spawnX = lastX + 480 + Math.random() * 120; spawnWall(); }
      for (var j = 0; j < walls.length; j++) {
        var w = walls[j];
        if (PLAYER_X + PLAYER_R > w.x && PLAYER_X - PLAYER_R < w.x + WALL_W && (playerY - PLAYER_R < w.topH || playerY + PLAYER_R > H - w.botH)) { deathFlash = 0.5; finish(false); return; }
      }
      for (var k = 0; k < particles.length; k++) { var p = particles[k]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; }
      particles = particles.filter(function(p) { return p.life > 0; });
      if (deathFlash > 0) deathFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.b);
    txt('TAP TO FLIP!', W / 2, H - 90, 44, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
