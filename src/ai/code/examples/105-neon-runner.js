// 105-neon-runner.js
// ネオンランナー — ネオンシティを走り障害物をジャンプ/スライドで避けるサバイバル
// 操作: タップ/スワイプ上でジャンプ、スワイプ下でスライド
// 成功: 5秒生き残る  失敗: 障害物に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'NEON RUNNER';
  var HOW_TO_PLAY = 'TAP=JUMP, SWIPE DOWN=SLIDE';
  var MAX_TIME = 5;         // 修正2: 生存系 20s → 5s
  var GROUND_Y = H * 0.72, RUNNER_X = W * 0.22, RUNNER_H = 100, RUNNER_W = 56;
  var GRAVITY = 2400, JUMP_VY = -1000, SLIDE_DUR = 0.5, SPAWN_INTERVAL = 1.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var runnerY, runnerVY, onGround, sliding, slideTimer, obstacles, spawnTimer, gameSpeed, buildings, buildTimer, timeLeft, done, survived, deathFlash, particles;

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

  function spawnObstacle() {
    if (Math.random() > 0.4) obstacles.push({ x: W + 40, y: GROUND_Y - 90, w: 56, h: 90, type: 'low' });
    else obstacles.push({ x: W + 40, y: GROUND_Y - RUNNER_H - 24, w: 130, h: 52, type: 'high' });
  }
  function spawnBuilding() { buildings.push({ x: W + 20, w: 80 + Math.random() * 120, h: 120 + Math.random() * 240 }); }
  function initGame() { runnerY = GROUND_Y - RUNNER_H; runnerVY = 0; onGround = true; sliding = false; slideTimer = 0; obstacles = []; spawnTimer = 0.8; gameSpeed = 560; buildings = []; buildTimer = 0; timeLeft = MAX_TIME; done = false; survived = 0; deathFlash = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(survived) * 40) : Math.floor(survived * 60);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround && !sliding) { runnerVY = JUMP_VY; onGround = false; game.audio.play('se_tap', 0.6); }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'down' && onGround) { sliding = true; slideTimer = SLIDE_DUR; game.audio.play('se_tap', 0.4); }
    else if (dir === 'up' && onGround && !sliding) { runnerVY = JUMP_VY; onGround = false; game.audio.play('se_tap', 0.6); }
  });

  // 世界観: ネオンシティを疾走するランナー。障害物を跳んで/滑って回避する。
  function background() {
    game.draw.clear('#0a0018');
    for (var b = 0; b < buildings.length; b++) {
      var bd = buildings[b];
      game.draw.rect(snap(bd.x), snap(GROUND_Y - bd.h), snap(bd.w), bd.h, '#221040');
      for (var wy = GROUND_Y - bd.h + 16; wy < GROUND_Y - 20; wy += 40) for (var wx = bd.x + 12; wx < bd.x + bd.w - 12; wx += 32) game.draw.rect(snap(wx), snap(wy), 12, 16, (wx + wy) % 64 < 32 ? C.d : C.f, 0.5);
    }
    game.draw.rect(0, snap(GROUND_Y), W, H - GROUND_Y, '#12002a');
    game.draw.rect(0, snap(GROUND_Y), W, 6, C.d);
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.a, deathFlash * 0.4);
    txt('NEON CITY', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var lx = (-game.time.elapsed * gameSpeed) % 80; lx < W; lx += 80) game.draw.rect(snap(lx), snap(GROUND_Y) + 20, 40, 4, C.d, 0.3);
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi]; game.draw.rect(snap(o.x), snap(o.y), snap(o.w), o.h, C.a); game.draw.rect(snap(o.x), snap(o.y), snap(o.w), 6, C.g, 0.6); txt(o.type === 'high' ? 'v' : '^', o.x + o.w / 2, o.y + o.h / 2, 32, C.g); }
    var rH = sliding ? RUNNER_H * 0.5 : RUNNER_H, rY = sliding ? GROUND_Y - rH : runnerY;
    game.draw.rect(snap(RUNNER_X) - RUNNER_W / 2, snap(rY), RUNNER_W, rH, C.e);
    game.draw.rect(snap(RUNNER_X) - RUNNER_W / 2, snap(rY), RUNNER_W, 10, C.b);
    game.draw.rect(snap(RUNNER_X) - 8, snap(rY) + 16, 10, 10, C.g);
    for (var pp = 0; pp < particles.length; pp++) { var p = particles[pp]; game.draw.rect(snap(p.x) - 6, snap(p.y) - 6, 12, 12, C.e, p.life * 2); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.4, 64, C.f);
        txt('TAP TO START', W / 2, H * 0.45, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.5, 40, '#888888');
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
      timeLeft -= dt; survived += dt; gameSpeed = Math.min(1000, 560 + survived * 40);
      if (timeLeft <= 0) { finish(true); return; }
      if (sliding) { slideTimer -= dt; if (slideTimer <= 0) sliding = false; }
      if (!onGround) { runnerVY += GRAVITY * dt; runnerY += runnerVY * dt; if (runnerY >= GROUND_Y - RUNNER_H) { runnerY = GROUND_Y - RUNNER_H; runnerVY = 0; onGround = true; } }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTimer = Math.max(0.7, SPAWN_INTERVAL - survived * 0.05); spawnObstacle(); }
      buildTimer -= dt; if (buildTimer <= 0) { buildTimer = 0.4 + Math.random() * 0.3; spawnBuilding(); }
      for (var i = 0; i < obstacles.length; i++) obstacles[i].x -= gameSpeed * dt;
      obstacles = obstacles.filter(function(o) { return o.x + o.w > -20; });
      for (var bi = 0; bi < buildings.length; bi++) buildings[bi].x -= gameSpeed * 0.3 * dt;
      buildings = buildings.filter(function(b) { return b.x + b.w > -20; });
      var rH = sliding ? RUNNER_H * 0.5 : RUNNER_H, rTop = sliding ? GROUND_Y - rH : runnerY, rBot = rTop + rH, rL = RUNNER_X - RUNNER_W / 2, rR = RUNNER_X + RUNNER_W / 2;
      for (var j = 0; j < obstacles.length; j++) {
        var o = obstacles[j];
        if (rR - 8 > o.x && rL + 8 < o.x + o.w && rBot - 8 > o.y && rTop + 8 < o.y + o.h) {
          deathFlash = 0.5; for (var pi = 0; pi < 16; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: RUNNER_X, y: rTop + rH / 2, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.5 }); }
          finish(false); return;
        }
      }
      for (var ki = 0; ki < particles.length; ki++) { var p = particles[ki]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
      particles = particles.filter(function(p) { return p.life > 0; });
      if (deathFlash > 0) deathFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.b);
    txt('TAP=JUMP  DOWN=SLIDE', W / 2, H - 90, 42, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
