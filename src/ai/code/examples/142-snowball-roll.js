// 142-snowball-roll.js
// 雪玉転がし — 転がしながら大きくなる雪玉で敵を踏み潰す爽快感
// 操作: 左右スワイプで転がす方向を変える
// 成功: 2体踏み潰す  失敗: 壁に3回ぶつかる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、雪原） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SNOWBALL ROLL';
  var HOW_TO_PLAY = 'SWIPE ◄► TO CHANGE DIRECTION';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 2;              // 修正2: 20 → 2
  var MAX_WALL = 3;
  var TOP    = 220;
  var GROUND_Y = snap(H * 0.72);
  var MAX_R = 160, GROW_RATE = 12, ENEMY_R = 32, SPAWN_INTERVAL = 1.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, enemies, particles, spawnTimer, score, wallHits, timeLeft, done, feedback, bounce;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.a, 0.4);
    game.draw.rect(0, GROUND_Y, W, 8, C.b);
    // 雪の結晶
    for (var i = 0; i < 12; i++) {
      var sx = snap((i * 137 + game.time.elapsed * 20) % W);
      var sy = snap((i * 211) % GROUND_Y);
      game.draw.rect(sx, sy, 8, 8, C.c, 0.4);
    }
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawBall() {
    var cy = ball.y - ball.r;
    game.draw.rect(snap(ball.x) - snap(ball.r * 0.6), GROUND_Y + 4, snap(ball.r * 1.2), 8, '#000000', 0.3); // 影
    pc(ball.x, cy, ball.r, C.c, 1);
    pc(ball.x, cy, ball.r - 12, C.b, 0.4);
    // 転がり模様（回転で位置変化）
    var rot = game.time.elapsed * ball.dir * 4;
    for (var s = 0; s < 4; s++) {
      var a = rot + s * Math.PI / 2;
      game.draw.rect(snap(ball.x + Math.cos(a) * ball.r * 0.5) - 4, snap(cy + Math.sin(a) * ball.r * 0.5) - 4, 8, 8, C.a, 0.6);
    }
    pc(ball.x - ball.r * 0.3, cy - ball.r * 0.3, 10, C.g, 0.8);
  }

  function drawEnemy(e, alpha) {
    var cy = e.y - e.h - ENEMY_R;
    game.draw.rect(e.x - ENEMY_R, e.y - e.h, ENEMY_R * 2, e.h, C.e, alpha * 0.85);   // 脚
    pc(e.x, cy, ENEMY_R, C.e, alpha);
    game.draw.rect(snap(e.x) - 16, snap(cy) - 4, 12, 12, C.g, alpha);  // 目
    game.draw.rect(snap(e.x) + 4, snap(cy) - 4, 12, 12, C.g, alpha);
    game.draw.rect(snap(e.x) - 12, snap(cy) + 12, 24, 6, C.g, alpha);  // 口
  }

  function spawnEnemy() {
    enemies.push({ x: snap(game.random(80, W - 80)), y: GROUND_Y, h: snap(game.random(20, 60)), alive: true, deathTimer: 0 });
  }

  function initGame() {
    ball = { x: snap(W / 2), y: GROUND_Y, r: 40, vx: 200, dir: 1 };
    enemies = []; particles = [];
    spawnTimer = 0.5;
    score = 0; wallHits = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0; bounce = 0;
    spawnEnemy(); spawnEnemy();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 200 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') ball.dir = -1;
    if (dir === 'right') ball.dir = 1;
    ball.vx = Math.abs(ball.vx) * ball.dir;
    game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawEnemy({ x: W * 0.7, y: GROUND_Y, h: 40 }, 1);
      ball = ball || { x: W / 2, y: GROUND_Y, r: 60, dir: 1 };
      drawBall();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 64, C.d);
        txt('TAP TO START', W / 2, H * 0.47, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.54, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRUSHED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      ball.x += ball.vx * dt;
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); ball.dir = 1; wallHits++; bounce = 0.4; game.audio.play('se_failure', 0.4); if (wallHits >= MAX_WALL) { finish(false); return; } }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); ball.dir = -1; wallHits++; bounce = 0.4; game.audio.play('se_failure', 0.4); if (wallHits >= MAX_WALL) { finish(false); return; } }

      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL; spawnEnemy(); }

      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei];
        if (!e.alive) { e.deathTimer -= dt; continue; }
        var dx = ball.x - e.x, dy = (ball.y - ball.r) - (e.y - e.h);
        if (Math.hypot(dx, dy) < ball.r + ENEMY_R) {
          e.alive = false; e.deathTimer = 0.4; score++;
          ball.r = Math.min(MAX_R, ball.r + GROW_RATE);
          ball.vx = ball.dir * (180 + ball.r * 0.5);
          feedback = 0.25;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: e.x, y: e.y - e.h / 2, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150 - 100, life: 0.4 });
          }
          if (score >= NEEDED) { finish(true); return; }
        }
      }
      enemies = enemies.filter(function(e) { return e.deathTimer > -0.1; });
    }

    for (var p = 0; p < particles.length; p++) {
      particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt;
      particles[p].vy += 500 * dt; particles[p].life -= dt;
    }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;
    if (bounce > 0) bounce -= dt;

    // ---- 描画 ----
    background();
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var e2 = enemies[ei2];
      if (!e2.alive && e2.deathTimer <= 0) continue;
      drawEnemy(e2, e2.alive ? 1 : Math.max(0, e2.deathTimer / 0.4));
    }
    drawBall();
    for (var pp = 0; pp < particles.length; pp++) {
      game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.e, particles[pp].life * 2.5);
    }
    if (bounce > 0) game.draw.rect(0, 0, W, H, C.e, bounce * 0.2);
    if (feedback > 0) txt('+1', ball.x, ball.y - ball.r * 2 - 40, 56, C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WALL; wi++) {
      var wx = snap(W / 2 + (wi - (MAX_WALL - 1) / 2) * 56);
      game.draw.rect(wx - 12, 208, 24, 24, wi < wallHits ? C.e : '#001133');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
