// 158-gap-runner.js
// 隙間抜け — 迫り来る壁の隙間を見切って通り抜ける緊張と爽快感
// 操作: タップ上/下でレーン移動（3レーン）
// 成功: 2枚の壁を通過  失敗: 壁に当たる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、洞窟） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GAP RUNNER';
  var HOW_TO_PLAY = 'TAP UP/DOWN TO DODGE THROUGH GAPS';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 2;              // 修正2: 15 → 2
  var TOP    = 220;
  var PLAYER_X = snap(W * 0.22), PLAYER_R = 44, WALL_W = 64;
  var WALL_SPEED = 440, GAP_H = 460, MIN_GAP_H = 380, WALL_INTERVAL = 1.5;
  var LANES = [snap(H * 0.36), snap(H * 0.52), snap(H * 0.68)];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var walls, particles, wallTimer, playerY, playerTargetY, currentLane, score, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawPlayer(y) {
    pc(PLAYER_X - 48, y, PLAYER_R * 0.6, C.f, 0.3);   // 尾
    pc(PLAYER_X, y, PLAYER_R, C.c, 1);
    game.draw.rect(PLAYER_X - 4, y - 12, 14, 14, C.bg);   // 目
    game.draw.rect(PLAYER_X + 12, y - 4, 16, 8, C.f);     // くちばし
  }

  function drawWall(w) {
    if (w.gapY > TOP) { game.draw.rect(w.x, TOP, WALL_W, w.gapY - TOP, C.d, 0.95); game.draw.rect(w.x, w.gapY - 12, WALL_W, 12, C.e); }
    var bot = w.gapY + w.gapH;
    if (bot < H - 120) { game.draw.rect(w.x, bot, WALL_W, H - 120 - bot, C.d, 0.95); game.draw.rect(w.x, bot, WALL_W, 12, C.e); }
  }

  function spawnWall() {
    var gapH = GAP_H - (score / NEEDED) * (GAP_H - MIN_GAP_H);
    var gapY = snap(TOP + 40 + Math.random() * (H - 200 - gapH - TOP));
    walls.push({ x: W + WALL_W, gapY: gapY, gapH: gapH, passed: false });
  }

  function initGame() {
    walls = []; particles = []; wallTimer = 0;
    currentLane = 1; playerY = LANES[1]; playerTargetY = LANES[1];
    score = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
    setTimeout(function() { if (state === S.PLAYING && !done) spawnWall(); }, 600);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function move(delta) { currentLane = Math.max(0, Math.min(LANES.length - 1, currentLane + delta)); playerTargetY = LANES[currentLane]; game.audio.play('se_tap', 0.3); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    move(y < H / 2 ? -1 : 1);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') move(-1); else if (dir === 'down') move(1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawWall({ x: W * 0.6, gapY: LANES[1] - 200, gapH: 400 });
      drawPlayer(LANES[1]);
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'THREADED IT!' : 'CRASHED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var dy = playerTargetY - playerY, mv = 1400 * dt;
      playerY = Math.abs(dy) < mv ? playerTargetY : playerY + (dy > 0 ? mv : -mv);
      wallTimer -= dt;
      if (wallTimer <= 0) { wallTimer = WALL_INTERVAL * (0.85 + Math.random() * 0.3); spawnWall(); }
      var speed = WALL_SPEED + score * 20;
      for (var wi = walls.length - 1; wi >= 0; wi--) {
        var w = walls[wi];
        w.x -= speed * dt;
        if (!w.passed && w.x + WALL_W < PLAYER_X - PLAYER_R) {
          w.passed = true; score++; feedbackOk = true; feedback = 0.25;
          game.audio.play('se_success', 0.5);
          if (score >= NEEDED) { finish(true); return; }
        }
        if (PLAYER_X + PLAYER_R > w.x && PLAYER_X - PLAYER_R < w.x + WALL_W) {
          if (!(playerY > w.gapY && playerY < w.gapY + w.gapH)) {
            feedbackOk = false; feedback = 0.5;
            for (var pi = 0; pi < 16; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang) * 350, vy: Math.sin(ang) * 350, life: 0.7 }); }
            finish(false); return;
          }
        }
        if (w.x < -WALL_W - 10) walls.splice(wi, 1);
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var li = 0; li < LANES.length; li++) game.draw.rect(0, LANES[li] - 1, W, 2, C.d, li === currentLane ? 0.5 : 0.2);
    for (var wi2 = 0; wi2 < walls.length; wi2++) drawWall(walls[wi2]);
    drawPlayer(playerY);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.a, particles[pp].life * 1.5);
    if (feedback > 0 && !feedbackOk) game.draw.rect(0, 0, W, H, C.a, feedback * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
