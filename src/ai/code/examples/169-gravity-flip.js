// 169-gravity-flip.js
// 重力反転 — タップするたびに重力が上下逆転、壁をかわしながら飛び続ける爽快感
// 操作: タップで重力反転
// 成功: 20秒生き延びる  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a14',
    wall:    '#1e40af',
    wallHi:  '#3b82f6',
    player:  '#f59e0b',
    playerHi:'#fef08a',
    trail:   '#f97316',
    danger:  '#ef4444',
    survive: '#22c55e',
    ui:      '#334155'
  };

  var PLAYER_X = W * 0.2;
  var PLAYER_R = 32;
  var GRAVITY = 1800;
  var gravDir = 1; // 1=down, -1=up
  var py = H / 2;
  var pvy = 0;

  // Walls / obstacles scroll in
  var WALL_SPEED_BASE = 460;
  var walls = [];
  var wallTimer = 0;
  var WALL_INTERVAL = 1.2;
  var GAP_H = 380;
  var MIN_GAP_H = 220;

  var survived = 0;
  var NEEDED = 20;
  var timeLeft = NEEDED;
  var done = false;
  var trail = [];
  var feedback = 0;

  function spawnWall() {
    var progress = survived / NEEDED;
    var gapH = GAP_H - progress * (GAP_H - MIN_GAP_H);
    var gapY = PLAYER_R * 2 + Math.random() * (H - gapH - PLAYER_R * 4);
    walls.push({ x: W + 80, gapY: gapY, gapH: gapH, passed: false });
  }

  game.onTap(function() {
    if (done) return;
    gravDir *= -1;
    pvy *= 0.3; // dampen velocity on flip
    game.audio.play('se_tap', 0.35);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 800); }, 400);
        return;
      }
    }

    var wallSpeed = WALL_SPEED_BASE + survived * 12;

    pvy += GRAVITY * gravDir * dt;
    pvy = Math.max(-1200, Math.min(1200, pvy));
    py += pvy * dt;

    // Ceiling / floor
    if (py - PLAYER_R < 0) {
      py = PLAYER_R; pvy = Math.abs(pvy) * 0.3;
      if (!done) { done = true; game.audio.play('se_failure'); setTimeout(function() { game.end.failure(); }, 300); return; }
    }
    if (py + PLAYER_R > H) {
      py = H - PLAYER_R; pvy = -Math.abs(pvy) * 0.3;
      if (!done) { done = true; game.audio.play('se_failure'); setTimeout(function() { game.end.failure(); }, 300); return; }
    }

    trail.push({ x: PLAYER_X, y: py, life: 0.25 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    wallTimer -= dt;
    if (wallTimer <= 0) {
      wallTimer = WALL_INTERVAL * (0.85 + Math.random() * 0.3);
      spawnWall();
    }

    for (var wi = walls.length - 1; wi >= 0; wi--) {
      var w = walls[wi];
      w.x -= wallSpeed * dt;

      // Collision
      var wallRight = w.x + 60;
      var wallLeft = w.x;
      if (PLAYER_X + PLAYER_R > wallLeft && PLAYER_X - PLAYER_R < wallRight) {
        var inGap = py > w.gapY && py < w.gapY + w.gapH;
        if (!inGap && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }

      if (w.x < -80) walls.splice(wi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Gravity direction indicator
    var gArrowY = gravDir > 0 ? H - 80 : 80;
    var gArrowText = gravDir > 0 ? '↓' : '↑';
    game.draw.text(gArrowText, 80, gArrowY, { size: 64, color: C.wallHi, bold: true });

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w2 = walls[wi2];
      // Top wall
      game.draw.rect(w2.x, 0, 60, w2.gapY, C.wall, 0.9);
      game.draw.rect(w2.x, 0, 60, 12, C.wallHi, 0.6);
      game.draw.rect(w2.x, w2.gapY - 12, 60, 12, C.wallHi, 0.8);
      // Bottom wall
      var botY = w2.gapY + w2.gapH;
      game.draw.rect(w2.x, botY, 60, H - botY, C.wall, 0.9);
      game.draw.rect(w2.x, botY, 60, 12, C.wallHi, 0.8);
      game.draw.rect(w2.x, H - 12, 60, 12, C.wallHi, 0.6);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, PLAYER_R * t.life * 4, C.trail, t.life * 0.5);
    }

    // Player
    game.draw.circle(PLAYER_X, py, PLAYER_R + 8, C.playerHi, 0.25);
    game.draw.circle(PLAYER_X, py, PLAYER_R, C.player, 0.95);
    game.draw.circle(PLAYER_X - PLAYER_R * 0.3, py - PLAYER_R * 0.3, PLAYER_R * 0.25, '#fff', 0.5);
    // Thrust flame
    var flameY = py + gravDir * PLAYER_R;
    game.draw.circle(PLAYER_X, flameY + gravDir * 10, 18, C.trail, 0.7);
    game.draw.circle(PLAYER_X, flameY + gravDir * 22, 10, C.playerHi, 0.5);

    game.draw.text('タップで重力反転！', W / 2, H * 0.91, { size: 40, color: C.ui });

    // Time bar
    var ratio = Math.max(0, timeLeft / NEEDED);
    var rSteps = Math.floor(ratio * 40);
    for (var rs = 0; rs < rSteps; rs++) {
      var ra = (rs / 40) * W;
      game.draw.circle(ra + W / 80, 40, 10, ratio > 0.4 ? C.survive : C.danger, 0.7);
    }
    game.draw.text(timeLeft.toFixed(1) + '', W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
