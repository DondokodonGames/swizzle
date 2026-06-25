// 035-thermal-rise.js
// サーマルライズ — 上昇気流に乗りながら高さを調整する気球操縦
// 操作: タップで熱気を吹かす（高度が上がる）、離すと下がる
// 成功: 目標高度ゾーンを10秒キープ  失敗: 天井衝突・地面激突・20秒超過

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#05091a',
    sky:     '#0c1840',
    cloud:   '#1e3a5f',
    zone:    '#166534',
    zoneHi:  '#22c55e',
    balloon: '#ef4444',
    balloonHi:'#fca5a5',
    basket:  '#92400e',
    flame:   '#f59e0b',
    danger:  '#ef4444',
    ceiling: '#7c3aed',
    ground:  '#1c1a0a',
    ui:      '#475569'
  };

  // Physics
  var altitude = 0.5;    // 0 = ground, 1 = ceiling
  var velocity = 0;      // positive = rising
  var GRAVITY = -0.18;   // per second
  var THRUST = 0.45;     // while tapping
  var DAMPING = 0.96;
  var isThrusting = false;

  // Target zone
  var ZONE_MIN = 0.35;
  var ZONE_MAX = 0.65;
  var zoneTimer = 0;     // time spent in zone
  var NEEDED_TIME = 10;

  // Canvas regions
  var CEILING_H = 80;    // pixels
  var GROUND_H = 80;
  var PLAYFIELD_H = H - CEILING_H - GROUND_H;

  // Balloon position in pixels
  var BALLOON_R = 72;
  var BASKET_H = 48;
  var BALLOON_Y = H / 2;

  var timeLeft = 20;
  var done = false;
  var shakeX = 0;

  // Clouds for parallax
  var clouds = [];
  for (var i = 0; i < 6; i++) {
    clouds.push({ x: Math.random() * W, y: CEILING_H + Math.random() * PLAYFIELD_H * 0.7, w: 180 + Math.random() * 200, vy: 0.02 + Math.random() * 0.04 });
  }

  // Birds (obstacles? no, just visual)
  var thermals = []; // upward gust columns
  for (var j = 0; j < 3; j++) {
    thermals.push({ x: game.random(100, W - 100), strength: 0.03 + Math.random() * 0.04 });
  }

  game.onHold(function(x, y, duration) {
    isThrusting = true;
  });

  game.onTap(function(x, y) {
    isThrusting = !isThrusting; // toggle
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Thrust toggles by tap (onHold fires continuously while held)
    // Using onTap to toggle is the main mechanic here since onHold fires once

    // Physics
    var accel = GRAVITY;
    if (isThrusting) {
      accel += THRUST;
    }

    // Thermal columns affect balloon
    // (simplified: slight upward nudge near thermal columns)
    for (var t = 0; t < thermals.length; t++) {
      var th = thermals[t];
      var bx = W / 2;
      var dist = Math.abs(bx - th.x);
      if (dist < 120) {
        accel += th.strength * (1 - dist / 120);
      }
    }

    velocity = (velocity + accel * dt) * DAMPING;
    altitude += velocity * dt;

    // Clamp and collision
    if (altitude <= 0) {
      altitude = 0;
      velocity = 0;
      done = true;
      shakeX = 30;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
      return;
    }
    if (altitude >= 1) {
      altitude = 1;
      velocity = 0;
      done = true;
      shakeX = 30;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
      return;
    }

    // Zone timer
    if (altitude >= ZONE_MIN && altitude <= ZONE_MAX) {
      zoneTimer += dt;
      if (zoneTimer >= NEEDED_TIME) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(200 + Math.ceil(timeLeft) * 8);
        }, 400);
        return;
      }
    }

    // Balloon Y in pixels
    BALLOON_Y = CEILING_H + PLAYFIELD_H * (1 - altitude);

    if (shakeX > 0) shakeX *= 0.85;

    // Move clouds slowly upward (wind effect)
    for (var c2 = 0; c2 < clouds.length; c2++) {
      clouds[c2].y -= velocity * 60;
      if (clouds[c2].y < CEILING_H) clouds[c2].y = CEILING_H + PLAYFIELD_H;
      if (clouds[c2].y > CEILING_H + PLAYFIELD_H) clouds[c2].y = CEILING_H;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient
    for (var sg = 0; sg < 8; sg++) {
      var sy2 = CEILING_H + sg * (PLAYFIELD_H / 8);
      game.draw.rect(0, sy2, W, PLAYFIELD_H / 8, C.sky, 0.1 + sg * 0.05);
    }

    // Zone (safe altitude band)
    var zoneY1 = CEILING_H + PLAYFIELD_H * (1 - ZONE_MAX);
    var zoneH2 = PLAYFIELD_H * (ZONE_MAX - ZONE_MIN);
    game.draw.rect(0, zoneY1, W, zoneH2, C.zone, 0.2);
    game.draw.rect(0, zoneY1, W, 4, C.zoneHi, 0.8);
    game.draw.rect(0, zoneY1 + zoneH2 - 4, W, 4, C.zoneHi, 0.8);

    // Zone progress bar (right side)
    var pct = zoneTimer / NEEDED_TIME;
    game.draw.rect(W - 48, CEILING_H, 32, PLAYFIELD_H, '#0f1a0f', 0.5);
    game.draw.rect(W - 48, CEILING_H + PLAYFIELD_H * (1 - pct), 32, PLAYFIELD_H * pct, C.zoneHi);
    game.draw.text(Math.ceil(NEEDED_TIME - zoneTimer) + 's', W - 32, CEILING_H + 70, { size: 36, color: C.zoneHi, bold: true });

    // Clouds
    for (var cl = 0; cl < clouds.length; cl++) {
      var cloud = clouds[cl];
      game.draw.rect(cloud.x - cloud.w / 2, cloud.y - 24, cloud.w, 48, C.cloud, 0.35);
      game.draw.rect(cloud.x - cloud.w * 0.3, cloud.y - 42, cloud.w * 0.6, 42, C.cloud, 0.25);
    }

    // Ceiling
    game.draw.rect(0, 0, W, CEILING_H, C.ceiling, 0.7);
    game.draw.rect(0, CEILING_H - 4, W, 8, C.ceiling);
    game.draw.text('天井', W / 2, 36, { size: 40, color: '#c4b5fd', bold: true });

    // Ground
    game.draw.rect(0, H - GROUND_H, W, GROUND_H, C.ground);
    game.draw.rect(0, H - GROUND_H, W, 6, '#2d2a14');
    game.draw.text('地面', W / 2, H - 40, { size: 40, color: '#78716c', bold: true });

    // Balloon (with shake)
    var ox = shakeX * (Math.random() - 0.5) * 2;
    var bx2 = W / 2 + ox;

    // Flame (if thrusting)
    if (isThrusting) {
      var flameH = 60 + 20 * Math.sin(game.time.elapsed * 20);
      game.draw.rect(bx2 - 12, BALLOON_Y + BALLOON_R + BASKET_H, 24, flameH, '#f97316', 0.9);
      game.draw.rect(bx2 - 6, BALLOON_Y + BALLOON_R + BASKET_H, 12, flameH * 0.7, C.flame, 0.9);
    }

    // Basket
    game.draw.rect(bx2 - 44, BALLOON_Y + BALLOON_R - 8, 88, BASKET_H + 16, C.basket);
    game.draw.rect(bx2 - 36, BALLOON_Y + BALLOON_R, 72, BASKET_H, '#b45309');
    // Ropes
    game.draw.line(bx2 - 32, BALLOON_Y + BALLOON_R, bx2 - BALLOON_R * 0.6, BALLOON_Y, C.basket, 3);
    game.draw.line(bx2 + 32, BALLOON_Y + BALLOON_R, bx2 + BALLOON_R * 0.6, BALLOON_Y, C.basket, 3);

    // Balloon body
    game.draw.circle(bx2, BALLOON_Y, BALLOON_R + 12, C.balloonHi, 0.2);
    game.draw.circle(bx2, BALLOON_Y, BALLOON_R, C.balloon);
    // Balloon stripes
    for (var s3 = 0; s3 < 4; s3++) {
      var stripe = (s3 % 2 === 0);
      game.draw.rect(bx2 - BALLOON_R + s3 * BALLOON_R * 0.5, BALLOON_Y - BALLOON_R,
        BALLOON_R * 0.5, BALLOON_R * 2, stripe ? '#dc2626' : '#b91c1c', 0.4);
    }
    game.draw.circle(bx2 - 24, BALLOON_Y - 28, BALLOON_R * 0.25, '#fff', 0.15);

    // Altitude meter
    game.draw.rect(20, CEILING_H, 28, PLAYFIELD_H, '#0f1a2a', 0.5);
    var meterY = CEILING_H + PLAYFIELD_H * (1 - altitude);
    game.draw.circle(34, meterY, 20, C.balloonHi);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#050918');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6d28d9' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    var guideColor = isThrusting ? C.flame : C.ui;
    game.draw.text(isThrusting ? '🔥 上昇中' : 'タップで点火！', W / 2, H - 200, { size: 52, color: guideColor, bold: isThrusting });
    game.draw.text('緑ゾーンを10秒キープ', W / 2, H - 135, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
