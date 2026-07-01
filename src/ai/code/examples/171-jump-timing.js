// 171-jump-timing.js
// ジャンプ台 — 走るキャラが台の先端でジャンプしてギャップを越えるスカッと感
// 操作: タップでジャンプ
// 成功: 1回ギャップを越える  失敗: 3回落下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜のスタジアム） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'JUMP TIMING';
  var HOW_TO_PLAY = 'TAP AT THE RAMP EDGE TO LEAP';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_MISS = 3;
  var GROUND_Y = snap(H * 0.66), PLAYER_R = 40, RUN_SPEED = 560;
  var GRAVITY = 2200, JUMP_POWER = -1150, PLATFORM_W = W * 0.4, CAM_OFF = W * 0.22;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, onGround, section, rampX, landingX, gapW;
  var score, misses, timeLeft, done, feedback, feedbackOk, cameraX, particles, jumpFlash, jumpReady;

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

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, GROUND_Y, C.d, 0.15);
  }

  function drawPlayer(sx) {
    pc(sx, py, PLAYER_R, C.c, 1);
    game.draw.rect(sx - 4, py - 12, 14, 14, C.bg);
    game.draw.rect(sx + 12, py - 4, 14, 8, C.f);
    var leg = Math.sin(px / 30) * 18;
    game.draw.rect(snap(sx - 14), snap(py + PLAYER_R), 10, snap(30 + leg), C.f);
    game.draw.rect(snap(sx + 6), snap(py + PLAYER_R), 10, snap(30 - leg), C.f);
    if (jumpFlash > 0) pc(sx, py, PLAYER_R + 20, C.g, jumpFlash);
  }

  function setupGap() {
    gapW = 220 + Math.random() * 60;   // 修正2: 短めのギャップ
    rampX = cameraX + W * 0.55;
    landingX = rampX + PLATFORM_W + gapW;
    section = 'run'; jumpReady = true;
  }

  function initGame() {
    cameraX = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false;
    feedback = 0; particles = []; jumpFlash = 0;
    py = GROUND_Y; pvy = 0; pvx = RUN_SPEED; onGround = true;
    setupGap();
    px = rampX + PLATFORM_W * 0.15;
    cameraX = px - CAM_OFF;
    setupGap();
    px = rampX + PLATFORM_W * 0.15;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 30) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround && jumpReady && section === 'run') {
      var edge = rampX + PLATFORM_W, dist = edge - px;
      if (dist < 260 && dist > -80) {
        pvy = JUMP_POWER; onGround = false; pvx = RUN_SPEED * 1.1; section = 'air'; jumpReady = false; jumpFlash = 0.3;
        game.audio.play('se_tap', 0.7);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var lp = W * 0.15;
      game.draw.rect(lp, GROUND_Y, PLATFORM_W, H - GROUND_Y, C.d, 0.8);
      game.draw.rect(lp + PLATFORM_W + 220, GROUND_Y, PLATFORM_W, H - GROUND_Y, C.d, 0.8);
      py = GROUND_Y; px = 0; jumpFlash = 0;
      drawPlayer(lp + PLATFORM_W * 0.5);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'FELL DOWN', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (!onGround) { pvy += GRAVITY * dt; py += pvy * dt; }
      px += pvx * dt;
      cameraX += (px - (cameraX + CAM_OFF)) * Math.min(dt * 8, 1);
      var lr = rampX + PLATFORM_W, rl = landingX, rr = landingX + PLATFORM_W + 200;
      if (section === 'run' && px > rampX && px < lr && py >= GROUND_Y) { py = GROUND_Y; pvy = 0; onGround = true; }
      else if (section === 'air') {
        if (px > rl - 20 && px < rr && py >= GROUND_Y) {
          py = GROUND_Y; pvy = 0; onGround = true; section = 'land'; score++;
          feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success');
          for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: px, y: py, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 150, life: 0.5 }); }
          if (score >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (state === S.PLAYING && !done) setupGap(); }, 500);
        } else if (py > GROUND_Y + 80) {
          misses++; feedbackOk = false; feedback = 0.5;
          game.audio.play('se_failure');
          py = GROUND_Y; pvy = 0; onGround = true; px = rampX + PLATFORM_W * 0.3; pvx = RUN_SPEED; section = 'run';
          if (misses >= MAX_MISS) { finish(false); return; }
          setTimeout(function() { if (state === S.PLAYING && !done) setupGap(); }, 100);
        }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 600 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;
    if (jumpFlash > 0) jumpFlash -= dt;

    // ---- 描画 ----
    var cam = cameraX - CAM_OFF;
    background();
    var lpX = rampX - cam;
    game.draw.rect(lpX, GROUND_Y, PLATFORM_W, H - GROUND_Y, C.d, 0.8); game.draw.rect(lpX, GROUND_Y, PLATFORM_W, 12, C.e);
    // ランプ
    for (var ri = 0; ri < 10; ri++) game.draw.rect(snap(lpX + PLATFORM_W - 80 + ri * 8), snap(GROUND_Y - ri * 4), 8, 8, C.b);
    var gsx = lpX + PLATFORM_W;
    game.draw.rect(gsx, GROUND_Y, gapW, H - GROUND_Y, section === 'air' ? C.a : C.e, 0.1);
    var rpX = landingX - cam;
    game.draw.rect(rpX, GROUND_Y, PLATFORM_W + 200, H - GROUND_Y, C.d, 0.8); game.draw.rect(rpX, GROUND_Y, PLATFORM_W + 200, 12, C.b);
    drawPlayer(px - cam);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x - cam) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);
    if (section === 'run' && onGround) { var ed = (rampX + PLATFORM_W) - px; if (ed < 300 && ed > 0 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('JUMP!', px - cam, py - 90, 52, C.c); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
