// 330-wave-surf.js
// ウェーブサーフ — 押し寄せる波のリズムに合わせてサーフボードでジャンプ
// 操作: タップで波を飛び越える（タイミングが命）
// 成功: 25波クリア  失敗: 5回失敗 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020d1a',
    sky1:   '#0c2340',
    sky2:   '#163a60',
    sun:    '#f59e0b',
    sunHi:  '#fde68a',
    sea:    '#0369a1',
    seaHi:  '#0ea5e9',
    seafoam:'#bae6fd',
    wave:   '#0284c7',
    waveHi: '#38bdf8',
    surfer: '#fde68a',
    board:  '#ef4444',
    correct:'#22c55e',
    correctHi:'#86efac',
    fail:   '#ef4444',
    ui:     '#475569',
    text:   '#f0f9ff'
  };

  var HORIZON_Y = H * 0.55;
  var surferX = W * 0.28;
  var surferY = HORIZON_Y - 20;
  var surferVY = 0;
  var onBoard = true;
  var JUMP_FORCE = -700;
  var GRAVITY = 1400;

  var waves = [];
  var waveSpeed = 300;
  var spawnTimer = 0;
  var cleared = 0;
  var NEEDED = 25;
  var wipeouts = 0;
  var MAX_WIPEOUTS = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var successAnim = 0;
  var wipeoutAnim = 0;
  var cloudX = W;

  function spawnWave() {
    var h = 80 + Math.random() * 80;
    waves.push({ x: W + 100, w: 60 + Math.random() * 40, h: h, scored: false });
  }

  game.onTap(function() {
    if (done) return;
    if (onBoard) {
      surferVY = JUMP_FORCE;
      onBoard = false;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successAnim > 0) successAnim -= dt * 2;
    if (wipeoutAnim > 0) wipeoutAnim -= dt * 2;

    waveSpeed = 300 + cleared * 4;

    // Surfer physics
    if (!onBoard) {
      surferVY += GRAVITY * dt;
      surferY += surferVY * dt;
      if (surferY >= HORIZON_Y - 20) {
        surferY = HORIZON_Y - 20;
        surferVY = 0;
        onBoard = true;
      }
    }

    // Spawn waves
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnWave();
      spawnTimer = 1.0 + Math.random() * 0.5 - Math.min(0.4, cleared * 0.015);
    }

    // Move waves
    for (var wi = waves.length - 1; wi >= 0; wi--) {
      var wave = waves[wi];
      wave.x -= waveSpeed * dt;

      // Score if passed
      if (!wave.scored && wave.x + wave.w < surferX) {
        wave.scored = true;
        cleared++;
        successAnim = 0.5;
        game.audio.play('se_success', 0.4);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: surferX, y: surferY, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150 - 80, life: 0.5, col: C.correctHi });
        }
        if (cleared >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(cleared * 120 + Math.ceil(timeLeft) * 80); }, 400);
        }
      }

      // Collision check
      if (!wave.scored && onBoard) {
        var waveTop = HORIZON_Y - wave.h;
        if (surferX + 20 >= wave.x && surferX - 20 <= wave.x + wave.w && surferY >= waveTop - 20) {
          wipeouts++;
          wipeoutAnim = 0.7;
          game.audio.play('se_failure', 0.5);
          for (var pi2 = 0; pi2 < 8; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: surferX, y: surferY, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200 - 100, life: 0.6, col: C.seafoam });
          }
          wave.scored = true; // prevent re-trigger
          if (wipeouts >= MAX_WIPEOUTS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
      }

      if (wave.x + wave.w < -100) waves.splice(wi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    cloudX -= 40 * dt;
    if (cloudX < -200) cloudX = W + 200;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient
    game.draw.rect(0, 0, W, HORIZON_Y, C.sky1, 0.9);
    game.draw.rect(0, 0, W, HORIZON_Y * 0.5, C.sky2, 0.4);

    // Sun
    game.draw.circle(W * 0.8, H * 0.18, 60, C.sun, 0.9);
    game.draw.circle(W * 0.8, H * 0.18, 50, C.sunHi, 0.8);

    // Clouds
    game.draw.circle(cloudX, H * 0.15, 50, '#fff', 0.5);
    game.draw.circle(cloudX + 60, H * 0.13, 60, '#fff', 0.5);
    game.draw.circle(cloudX + 120, H * 0.15, 45, '#fff', 0.5);
    game.draw.circle(cloudX + 300, H * 0.22, 40, '#e0f2fe', 0.4);
    game.draw.circle(cloudX + 360, H * 0.2, 50, '#e0f2fe', 0.4);

    // Ocean
    game.draw.rect(0, HORIZON_Y, W, H - HORIZON_Y, C.sea, 0.9);
    // Wave pattern on ocean
    for (var ww = 0; ww < W; ww += 80) {
      var wy = HORIZON_Y + 20 + 6 * Math.sin(elapsed * 2 + ww * 0.02);
      game.draw.line(ww, wy, ww + 50, wy, C.seaHi, 3);
    }

    // Waves
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var w2 = waves[wi2];
      var wTop = HORIZON_Y - w2.h;
      // Wave body
      game.draw.rect(w2.x, wTop, w2.w, w2.h + 4, C.wave, 0.9);
      // Crest
      game.draw.circle(w2.x + w2.w / 2, wTop, w2.w * 0.6, C.waveHi, 0.8);
      // Foam
      game.draw.circle(w2.x + w2.w * 0.3, wTop - 10, 20, C.seafoam, 0.7);
      game.draw.circle(w2.x + w2.w * 0.7, wTop - 5, 16, C.seafoam, 0.6);
    }

    // Surfer
    var boardY = surferY + 12;
    game.draw.rect(surferX - 50, boardY, 100, 16, C.board, 0.9);
    // Body
    game.draw.circle(surferX, surferY - 20, 22, C.surfer, 0.9);
    game.draw.line(surferX, surferY - 2, surferX - 16, surferY + 10, C.surfer, 14);
    game.draw.line(surferX, surferY - 2, surferX + 20, surferY + 8, C.surfer, 14);

    // Wipeout overlay
    if (wipeoutAnim > 0) {
      game.draw.rect(0, 0, W, H, C.seafoam, wipeoutAnim * 0.3);
      game.draw.text('WIPEOUT!', W / 2, H * 0.45, { size: 72, color: C.fail, bold: true });
    }

    // Success anim
    if (successAnim > 0) {
      game.draw.text('NICE!', surferX, surferY - 80, { size: 52, color: C.correctHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Wipeout dots
    for (var wo = 0; wo < MAX_WIPEOUTS; wo++) {
      game.draw.circle(W / 2 - (MAX_WIPEOUTS - 1) * 28 + wo * 56, H * 0.92, 16, wo < wipeouts ? C.fail : '#020d1a');
    }

    game.draw.text(cleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.seaHi : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
