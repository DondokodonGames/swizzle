// 175-spiral-dodge.js
// スパイラル回避 — 渦を描いて迫ってくる弾を中心でくるりとかわす集中力ゲーム
// 操作: タップで自機を反時計回り/時計回りに切り替え
// 成功: 30秒生き延びる  失敗: 弾に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    center:  '#1e1b4b',
    player:  '#a78bfa',
    playerHi:'#ddd6fe',
    bullet:  '#ef4444',
    bulletHi:'#fca5a5',
    orbit:   '#312e81',
    survive: '#22c55e',
    danger:  '#ef4444',
    ui:      '#334155'
  };

  var CX = W / 2;
  var CY = H * 0.48;
  var ORBIT_R = 180; // player orbit radius
  var PLAYER_R = 28;
  var PLAYER_ANGLE = 0;
  var PLAYER_SPEED = 2.5; // rad/sec
  var playerDir = 1; // 1=CW, -1=CCW

  var bullets = [];
  var BULLET_R = 18;
  var spawnTimer = 0;
  var spawnInterval = 1.8;
  var bulletSpeed = 220;

  var survived = 0;
  var NEEDED = 30;
  var timeLeft = NEEDED;
  var done = false;
  var trail = [];

  function spawnBullet() {
    var ang = Math.random() * Math.PI * 2;
    var dist = Math.sqrt(W * W + H * H) / 2 + 50;
    var bx = CX + Math.cos(ang) * dist;
    var by = CY + Math.sin(ang) * dist;
    // Aim at player position
    var px = CX + Math.cos(PLAYER_ANGLE) * ORBIT_R;
    var py = CY + Math.sin(PLAYER_ANGLE) * ORBIT_R;
    var dx = px - bx, dy = py - by;
    var len = Math.sqrt(dx * dx + dy * dy);
    var jitter = (Math.random() - 0.5) * 200;
    bullets.push({
      x: bx, y: by,
      vx: (dx / len + (Math.random() - 0.5) * 0.3) * bulletSpeed,
      vy: (dy / len + (Math.random() - 0.5) * 0.3) * bulletSpeed
    });
  }

  game.onTap(function() {
    if (done) return;
    playerDir *= -1;
    game.audio.play('se_tap', 0.2);
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

    // Player moves along orbit
    PLAYER_ANGLE += PLAYER_SPEED * playerDir * dt;
    var px = CX + Math.cos(PLAYER_ANGLE) * ORBIT_R;
    var py = CY + Math.sin(PLAYER_ANGLE) * ORBIT_R;

    trail.push({ x: px, y: py, life: 0.5 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Spawn bullets
    spawnTimer -= dt;
    var progress = survived / NEEDED;
    if (spawnTimer <= 0) {
      spawnTimer = spawnInterval * Math.max(0.5, 1 - progress * 0.5);
      spawnBullet();
      if (progress > 0.5) spawnBullet(); // double bullets later
    }
    bulletSpeed = 220 + progress * 160;

    // Move bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Check player collision
      var dx = b.x - px, dy = b.y - py;
      if (Math.sqrt(dx * dx + dy * dy) < BULLET_R + PLAYER_R && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }

      // Remove off screen
      if (b.x < -100 || b.x > W + 100 || b.y < -100 || b.y > H + 100) {
        bullets.splice(bi, 1);
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbit ring
    for (var oa = 0; oa < 64; oa++) {
      var oang = (oa / 64) * Math.PI * 2;
      var ox = CX + Math.cos(oang) * ORBIT_R;
      var oy = CY + Math.sin(oang) * ORBIT_R;
      game.draw.circle(ox, oy, 4, C.orbit, 0.5);
    }

    // Center
    game.draw.circle(CX, CY, 60, C.center, 0.9);
    game.draw.circle(CX, CY, 40, '#2d2a6e', 0.8);
    game.draw.circle(CX, CY, 16, C.playerHi, 0.3);

    // Direction arrow
    var arrowAng = PLAYER_ANGLE + playerDir * Math.PI / 2;
    game.draw.line(CX, CY,
      CX + Math.cos(arrowAng) * 50,
      CY + Math.sin(arrowAng) * 50,
      C.playerHi, 4);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, PLAYER_R * t.life * 1.5, C.player, t.life * 0.4);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, BULLET_R + 6, C.bulletHi, 0.2);
      game.draw.circle(b2.x, b2.y, BULLET_R, C.bullet, 0.9);
    }

    // Player
    game.draw.circle(px, py, PLAYER_R + 8, C.playerHi, 0.25);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.95);
    game.draw.circle(px - PLAYER_R * 0.3, py - PLAYER_R * 0.35, PLAYER_R * 0.3, '#fff', 0.5);

    // Direction label
    game.draw.text(playerDir > 0 ? '→ 時計回り' : '← 反時計回り', W / 2, H * 0.9, { size: 38, color: C.ui });
    game.draw.text('タップで方向転換', W / 2, H * 0.86, { size: 38, color: C.ui });

    // Survival timer (ring)
    var ratio = Math.max(0, timeLeft / NEEDED);
    var ringSteps = Math.floor(ratio * 48);
    for (var rs = 0; rs < ringSteps; rs++) {
      var ra = -Math.PI / 2 + (rs / 48) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(ra) * (ORBIT_R + 56), CY + Math.sin(ra) * (ORBIT_R + 56), 7, C.survive, 0.7);
    }

    game.draw.text(timeLeft.toFixed(1) + '', W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.35 ? C.player : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
