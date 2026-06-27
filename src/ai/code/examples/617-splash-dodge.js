// 617-splash-dodge.js
// スプラッシュドッジ — 水しぶきが飛び散る方向を予測して避けろ
// 操作: スワイプで4方向に緊急回避
// 成功: 20秒生存  失敗: 3回被弾 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000814',
    water:   '#0ea5e9',
    waterHi: '#7dd3fc',
    player:  '#f59e0b',
    playerHi:'#fde68a',
    danger:  '#ef4444',
    safe:    '#22c55e',
    ripple:  '#0369a1',
    text:    '#f1f5f9',
    ui:      '#0a1020',
    hit:     '#ef4444'
  };

  var PLAYER_R = 36;
  var playerX = W / 2;
  var playerY = H * 0.6;
  var targetX = W / 2;
  var targetY = H * 0.6;

  var splashes = [];
  var warnings = [];
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 20;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var invincible = 0;
  var spawnTimer = 0;
  var ripples = [];

  function spawnWarning() {
    var x = 80 + Math.random() * (W - 160);
    var y = 80 + Math.random() * (H * 0.8);
    var delay = 1.2 + Math.random() * 0.5;
    warnings.push({ x: x, y: y, delay: delay, timer: delay, radius: 0 });
  }

  function triggerSplash(x, y) {
    // 8-direction splash droplets
    var count = 12 + Math.floor(Math.random() * 8);
    for (var i = 0; i < count; i++) {
      var ang = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.3;
      var speed = 200 + Math.random() * 300;
      splashes.push({
        x: x, y: y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r: 8 + Math.random() * 12,
        life: 0.5 + Math.random() * 0.3
      });
    }
    ripples.push({ x: x, y: y, r: 20, maxR: 120, life: 0.6, maxLife: 0.6 });
    game.audio.play('se_success', 0.3);
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var step = 220;
    if (dir === 'left') targetX -= step;
    else if (dir === 'right') targetX += step;
    else if (dir === 'up') targetY -= step;
    else if (dir === 'down') targetY += step;
    targetX = Math.max(PLAYER_R, Math.min(W - PLAYER_R, targetX));
    targetY = Math.max(PLAYER_R, Math.min(H * 0.9, targetY));
    game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    targetX = Math.max(PLAYER_R, Math.min(W - PLAYER_R, tx));
    targetY = Math.max(PLAYER_R, Math.min(H * 0.9, ty));
    game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(20 * 200 + (MAX_HITS - hits) * 500); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (invincible > 0) invincible -= dt;

    playerX += (targetX - playerX) * Math.min(1, dt * 8);
    playerY += (targetY - playerY) * Math.min(1, dt * 8);

    // Spawn warnings
    spawnTimer += dt;
    var rate = Math.max(0.8, 2.5 - elapsed * 0.08);
    if (spawnTimer > rate) {
      spawnTimer = 0;
      spawnWarning();
      if (elapsed > 8) spawnWarning();
    }

    // Update warnings
    for (var wi = warnings.length - 1; wi >= 0; wi--) {
      var w = warnings[wi];
      w.timer -= dt;
      w.radius = (1 - w.timer / w.delay) * 80;
      if (w.timer <= 0) {
        triggerSplash(w.x, w.y);
        warnings.splice(wi, 1);
      }
    }

    // Update ripples
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var rip = ripples[ri];
      rip.r += (rip.maxR - rip.r) * dt * 4;
      rip.life -= dt;
      if (rip.life <= 0) ripples.splice(ri, 1);
    }

    // Update splashes and check hits
    for (var si = splashes.length - 1; si >= 0; si--) {
      var s = splashes[si];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 600 * dt; // gravity
      s.life -= dt * 1.5;

      // Hit check
      if (invincible <= 0) {
        var dx = s.x - playerX, dy = s.y - playerY;
        if (dx * dx + dy * dy < (PLAYER_R + s.r) * (PLAYER_R + s.r)) {
          hits++;
          invincible = 0.8;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.playerHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          splashes.splice(si, 1);
          continue;
        }
      }

      if (s.life <= 0 || s.y > H + 50) splashes.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Water floor suggestion
    game.draw.rect(0, H * 0.9, W, H * 0.1, C.ripple, 0.15);

    // Ripples
    for (var ri2 = 0; ri2 < ripples.length; ri2++) {
      var rip2 = ripples[ri2];
      var a = rip2.life / rip2.maxLife;
      game.draw.circle(rip2.x, rip2.y, rip2.r, C.water, a * 0.25);
      game.draw.circle(rip2.x, rip2.y, rip2.r * 0.6, C.waterHi, a * 0.15);
    }

    // Warnings (growing circle indicators)
    for (var wi2 = 0; wi2 < warnings.length; wi2++) {
      var w2 = warnings[wi2];
      var urgency = 1 - w2.timer / w2.delay;
      var wCol = urgency > 0.7 ? C.danger : C.water;
      game.draw.circle(w2.x, w2.y, w2.radius, wCol, 0.3 * urgency);
      game.draw.circle(w2.x, w2.y, w2.radius, wCol, 0.5 * urgency);
      game.draw.circle(w2.x, w2.y, 8, wCol, 0.8);
    }

    // Splashes
    for (var si2 = 0; si2 < splashes.length; si2++) {
      var s2 = splashes[si2];
      game.draw.circle(s2.x, s2.y, s2.r, C.water, s2.life * 0.8);
      game.draw.circle(s2.x, s2.y, s2.r * 0.4, C.waterHi, s2.life * 0.6);
    }

    // Player
    var pAlpha = (invincible > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.circle(playerX + 4, playerY + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(playerX, playerY, PLAYER_R, C.player, pAlpha);
    game.draw.circle(playerX - 10, playerY - 10, PLAYER_R * 0.3, C.playerHi, pAlpha * 0.7);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // Hit dots
    for (var hi2 = 0; hi2 < MAX_HITS; hi2++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 80 + hi2 * 160, H * 0.955, 28, hi2 < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.water : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('水しぶきを避けろ!', W / 2, 80, { size: 36, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnWarning();
  });
})(game);
