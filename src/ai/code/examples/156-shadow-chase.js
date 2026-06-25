// 156-shadow-chase.js
// 影踏み鬼 — 動くスポットライトの外に出たら即アウト、追い詰められる息苦しさ
// 操作: タップ/スワイプで逃げる方向を指定
// 成功: 20秒生き延びる  失敗: スポットライト外に出る

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#000',
    dark:     '#050508',
    light:    '#fffde0',
    player:   '#f59e0b',
    playerHi: '#fef08a',
    danger:   '#ef4444',
    survive:  '#22c55e',
    ui:       '#334155'
  };

  var PLAYER_R = 36;
  var SPOT_R = 220;
  var MIN_SPOT_R = 100;

  var px = W / 2;
  var py = H / 2;
  var pvx = 0, pvy = 0;
  var PLAYER_SPEED = 520;
  var FRICTION = 0.82;

  // Spotlight moves in complex pattern
  var sx = W / 2;
  var sy = H / 2;
  var SPOT_SPEED = 200;
  var spotAngle = 0;
  var spotR = SPOT_R;

  var survived = 0;
  var NEEDED = 20;
  var timeLeft = NEEDED;
  var done = false;
  var particles = [];
  var outsideTimer = 0;
  var GRACE = 0.12; // tiny grace period

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - px, dy = ty - py;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 10) return;
    pvx = (dx / len) * PLAYER_SPEED;
    pvy = (dy / len) * PLAYER_SPEED;
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up')    pvy = -PLAYER_SPEED;
    else if (dir === 'down')  pvy =  PLAYER_SPEED;
    else if (dir === 'left')  pvx = -PLAYER_SPEED;
    else if (dir === 'right') pvx =  PLAYER_SPEED;
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 80 + 1000); }, 400);
        return;
      }
    }

    // Spotlight movement: figure-8 Lissajous pattern
    spotAngle += dt;
    var progress = survived / NEEDED;
    var curSpeed = SPOT_SPEED * (1 + progress * 1.2);
    sx = W / 2 + Math.sin(spotAngle * 0.9) * (W * 0.3);
    sy = H / 2 + Math.sin(spotAngle * 1.4) * (H * 0.28);
    // Spot shrinks over time
    spotR = SPOT_R - progress * (SPOT_R - MIN_SPOT_R);

    // Player friction + movement
    pvx *= Math.pow(FRICTION, dt * 60);
    pvy *= Math.pow(FRICTION, dt * 60);
    px += pvx * dt;
    py += pvy * dt;

    // Keep player in canvas
    px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px));
    py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, py));

    // Distance from spotlight
    var dsx = px - sx, dsy = py - sy;
    var distSpot = Math.sqrt(dsx * dsx + dsy * dsy);
    var inLight = distSpot < spotR - PLAYER_R;

    if (!inLight && !done) {
      outsideTimer += dt;
      if (outsideTimer >= GRACE) {
        done = true;
        game.audio.play('se_failure');
        for (var pi = 0; pi < 16; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: px, y: py, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.6 });
        }
        setTimeout(function() { game.end.failure(); }, 600);
      }
    } else {
      outsideTimer = 0;
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.dark);

    // Spotlight cone
    game.draw.circle(sx, sy, spotR + 40, C.light, 0.04);
    game.draw.circle(sx, sy, spotR + 16, C.light, 0.1);
    game.draw.circle(sx, sy, spotR, C.light, 0.18);
    game.draw.circle(sx, sy, spotR * 0.6, C.light, 0.08);

    // Danger overlay when near edge of spotlight
    var edgeDist = spotR - distSpot - PLAYER_R;
    if (edgeDist < 80 && !done) {
      var edgeAlpha = (1 - edgeDist / 80) * 0.4;
      game.draw.circle(sx, sy, spotR, C.danger, edgeAlpha * 0.3);
    }

    // Player shadow (on ground)
    game.draw.circle(px + 16, py + 16, PLAYER_R, '#000', 0.5);
    // Player
    var playerCol = inLight ? C.player : C.danger;
    game.draw.circle(px, py, PLAYER_R + 8, playerCol, 0.25);
    game.draw.circle(px, py, PLAYER_R, playerCol, 0.95);
    game.draw.circle(px - PLAYER_R * 0.3, py - PLAYER_R * 0.35, PLAYER_R * 0.3, '#fff', 0.5);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 12 * part.life, C.danger, part.life);
    }

    if (outsideTimer > 0 && !done) {
      game.draw.rect(0, 0, W, H, C.danger, (outsideTimer / GRACE) * 0.3);
    }

    // Timer ring around player
    var ratio = Math.max(0, timeLeft / NEEDED);
    var rSteps = Math.floor(ratio * 36);
    for (var rs = 0; rs < rSteps; rs++) {
      var ra = -Math.PI / 2 + (rs / 36) * Math.PI * 2;
      game.draw.circle(px + Math.cos(ra) * 56, py + Math.sin(ra) * 56, 6, C.survive, 0.7);
    }

    game.draw.text('光の外はアウト！', W / 2, H * 0.91, { size: 42, color: C.ui });
    game.draw.text(timeLeft.toFixed(1) + '秒', W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.dark);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.4 ? C.survive : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
