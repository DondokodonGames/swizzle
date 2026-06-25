// 187-freeze-tag.js
// フリーズタグ — 青い追跡者から逃げながら仲間を解凍する、マルチタスク判断ゲーム
// 操作: タップで移動先を指定
// 成功: 4人の仲間を全員解凍  失敗: タッチされる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    player:  '#22c55e',
    playerHi:'#86efac',
    frozen:  '#3b82f6',
    frozenHi:'#93c5fd',
    chaser:  '#ef4444',
    chaserHi:'#fca5a5',
    free:    '#f59e0b',
    freeHi:  '#fde68a',
    ui:      '#334155'
  };

  var PLAYER_R = 36;
  var CHASER_R = 34;
  var FRIEND_R = 28;
  var THAW_DIST = 80;
  var PLAYER_SPEED = 440;
  var CHASER_SPEED = 280;

  var px = W / 2, py = H * 0.5;
  var pvx = 0, pvy = 0;
  var targetX = W / 2, targetY = H * 0.5;

  var chaser = { x: W * 0.1, y: H * 0.15, vx: 0, vy: 0 };

  var friends = [
    { x: W * 0.2, y: H * 0.35, frozen: true },
    { x: W * 0.8, y: H * 0.35, frozen: true },
    { x: W * 0.2, y: H * 0.72, frozen: true },
    { x: W * 0.8, y: H * 0.72, frozen: true }
  ];

  var thawed = 0;
  var NEEDED = 4;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    targetX = tx; targetY = ty;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Move player toward target
    var dx = targetX - px, dy = targetY - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) {
      pvx = (dx / dist) * PLAYER_SPEED;
      pvy = (dy / dist) * PLAYER_SPEED;
    } else {
      pvx *= 0.85; pvy *= 0.85;
    }
    px += pvx * dt;
    py += pvy * dt;
    px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px));
    py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, py));

    // Chaser moves toward player
    var cdx = px - chaser.x, cdy = py - chaser.y;
    var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
    if (cdist > 0) {
      chaser.x += (cdx / cdist) * CHASER_SPEED * dt;
      chaser.y += (cdy / cdist) * CHASER_SPEED * dt;
    }

    // Check thaw
    for (var fi = 0; fi < friends.length; fi++) {
      var f = friends[fi];
      if (!f.frozen) continue;
      var fdx = px - f.x, fdy = py - f.y;
      if (Math.sqrt(fdx * fdx + fdy * fdy) < PLAYER_R + FRIEND_R + THAW_DIST) {
        f.frozen = false;
        thawed++;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5 });
        }
        if (thawed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(thawed * 150 + Math.ceil(timeLeft) * 40); }, 400);
        }
      }
    }

    // Chaser catches player
    var captureDist = Math.sqrt(Math.pow(px - chaser.x, 2) + Math.pow(py - chaser.y, 2));
    if (captureDist < PLAYER_R + CHASER_R - 8 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 200 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Thaw radius indicator
    for (var fi2 = 0; fi2 < friends.length; fi2++) {
      var f2 = friends[fi2];
      if (!f2.frozen) continue;
      var fdx2 = px - f2.x, fdy2 = py - f2.y;
      var fdist2 = Math.sqrt(fdx2 * fdx2 + fdy2 * fdy2);
      var thawR = PLAYER_R + FRIEND_R + THAW_DIST;
      if (fdist2 < thawR * 1.5) {
        var closeAlpha = (1 - fdist2 / (thawR * 1.5)) * 0.3;
        game.draw.circle(f2.x, f2.y, thawR, C.frozenHi, closeAlpha);
      }
    }

    // Friends
    for (var fi3 = 0; fi3 < friends.length; fi3++) {
      var f3 = friends[fi3];
      if (f3.frozen) {
        game.draw.circle(f3.x, f3.y, FRIEND_R + 12, C.frozenHi, 0.2 + 0.1 * Math.abs(Math.sin(elapsed * 3)));
        game.draw.circle(f3.x, f3.y, FRIEND_R, C.frozen, 0.85);
        game.draw.text('凍', f3.x, f3.y, { size: 36, color: '#fff', bold: true });
      } else {
        game.draw.circle(f3.x, f3.y, FRIEND_R + 8, C.freeHi, 0.3);
        game.draw.circle(f3.x, f3.y, FRIEND_R, C.free, 0.85);
        game.draw.text('★', f3.x, f3.y, { size: 36, color: '#fff' });
      }
    }

    // Chaser
    var chaserWarning = captureDist < 200 ? (1 - captureDist / 200) * 0.3 : 0;
    game.draw.circle(chaser.x, chaser.y, CHASER_R + 16, C.chaserHi, 0.15 + chaserWarning);
    game.draw.circle(chaser.x, chaser.y, CHASER_R, C.chaser, 0.85);
    game.draw.circle(chaser.x - 10, chaser.y - 8, 9, '#fff', 0.7);
    game.draw.circle(chaser.x + 10, chaser.y - 8, 9, '#fff', 0.7);

    // Player
    game.draw.circle(px, py, PLAYER_R + 10, C.playerHi, 0.3);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.9);
    game.draw.circle(px - PLAYER_R * 0.3, py - PLAYER_R * 0.3, PLAYER_R * 0.28, '#fff', 0.5);

    // Danger line
    if (captureDist < 200) {
      game.draw.line(px, py, chaser.x, chaser.y, C.chaser, 2);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.free, part.life);
    }

    game.draw.text('仲間を解凍: ' + thawed + ' / ' + NEEDED, W / 2, H * 0.92, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.chaser);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); });
})(game);
