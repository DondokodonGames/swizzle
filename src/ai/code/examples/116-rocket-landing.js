// 116-rocket-landing.js
// ロケット着陸 — 燃料を節約しながらゆっくり降下してパッドに着地する精密制御の快感
// 操作: タップ長押しでスラスター点火（燃料消費）
// 成功: 着地速度 < 120でパッドに着地  失敗: 燃料切れ or 速度オーバー or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000208',
    stars:  '#1a2440',
    pad:    '#22c55e',
    padHi:  '#86efac',
    rocket: '#94a3b8',
    rocketHi:'#e2e8f0',
    flame:  '#f97316',
    flameHi:'#fbbf24',
    correct:'#22c55e',
    wrong:  '#ef4444',
    ui:     '#334155',
    fuel:   '#3b82f6'
  };

  var ROCKET_W = 52;
  var ROCKET_H = 100;
  var rocketX = W / 2;
  var rocketY = H * 0.12;
  var rocketVX = 20; // slight drift
  var rocketVY = 0;
  var GRAVITY = 180;
  var THRUST = 480;
  var thrusting = false;

  var fuel = 100; // percent
  var FUEL_RATE = 28; // %/s

  var PAD_W = 200;
  var PAD_X = W / 2 + (Math.random() > 0.5 ? 1 : -1) * (80 + Math.random() * 160);
  var PAD_X_CLAMPED = Math.max(PAD_W / 2 + 40, Math.min(W - PAD_W / 2 - 40, PAD_X));
  var PAD_Y = H * 0.82;
  var SAFE_SPEED = 120;

  var done = false;
  var timeLeft = 30;
  var feedback = '';
  var feedbackTimer = 0;
  var stars = [];
  var flameFlicker = 0;

  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.85, r: 1 + Math.random() * 3 });
  }

  game.onTap(function() {
    if (done) return;
    if (fuel > 0) {
      thrusting = true;
      flameFlicker = 0;
    }
  });

  // Holding: we simulate hold by checking if tap is still active
  var tapDown = false;
  game.onTap(function() {
    tapDown = !tapDown; // toggle (approximate hold)
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

    flameFlicker += dt;

    // Simple toggle thrust (tap once to start, tap again to stop)
    if (thrusting && fuel > 0) {
      rocketVY -= THRUST * dt;
      fuel -= FUEL_RATE * dt;
      if (fuel <= 0) { fuel = 0; thrusting = false; }
    }

    // Gravity
    rocketVY += GRAVITY * dt;
    rocketY += rocketVY * dt;
    rocketX += rocketVX * dt;

    // Drift dampen
    rocketVX *= Math.pow(0.98, dt * 60);

    // Wall bounce
    if (rocketX < ROCKET_W / 2) { rocketX = ROCKET_W / 2; rocketVX = Math.abs(rocketVX) * 0.5; }
    if (rocketX > W - ROCKET_W / 2) { rocketX = W - ROCKET_W / 2; rocketVX = -Math.abs(rocketVX) * 0.5; }

    // Landing check
    var rocketBottom = rocketY + ROCKET_H / 2;
    if (rocketBottom >= PAD_Y) {
      var onPad = rocketX > PAD_X_CLAMPED - PAD_W / 2 && rocketX < PAD_X_CLAMPED + PAD_W / 2;
      if (!done) {
        done = true;
        if (onPad && Math.abs(rocketVY) < SAFE_SPEED) {
          feedback = '安全着陸！';
          game.audio.play('se_success');
          var bonus = Math.round((SAFE_SPEED - Math.abs(rocketVY)) * 2 + fuel * 3);
          setTimeout(function() { game.end.success(300 + bonus + Math.ceil(timeLeft) * 10); }, 700);
        } else if (!onPad) {
          feedback = '着陸失敗';
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          feedback = '速度超過！';
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
        }
        feedbackTimer = 0.8;
      }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      var blink = 0.3 + 0.7 * Math.abs(Math.sin(timeLeft * 1.3 + si2 * 0.7));
      game.draw.circle(s.x, s.y, s.r, '#ffffff', blink * 0.5);
    }

    // Landing pad
    game.draw.rect(PAD_X_CLAMPED - PAD_W / 2, PAD_Y, PAD_W, 16, C.pad);
    game.draw.rect(PAD_X_CLAMPED - PAD_W / 2, PAD_Y, PAD_W, 4, C.padHi);
    // Pad beacon lights
    for (var pi = 0; pi < 5; pi++) {
      var bx = PAD_X_CLAMPED - PAD_W / 2 + (pi / 4) * PAD_W;
      var blink2 = Math.abs(Math.sin(timeLeft * 4 + pi * 1.2));
      game.draw.circle(bx, PAD_Y, 10, C.padHi, blink2 * 0.8);
    }
    // Ground
    game.draw.rect(0, PAD_Y + 16, W, H - PAD_Y - 16, '#030a14');

    // Rocket flame
    if (thrusting && fuel > 0) {
      var fSize = 40 + 30 * Math.abs(Math.sin(flameFlicker * 20));
      game.draw.circle(rocketX, rocketY + ROCKET_H / 2 + fSize * 0.5, fSize * 0.6, C.flame, 0.9);
      game.draw.circle(rocketX, rocketY + ROCKET_H / 2 + fSize * 0.3, fSize * 0.35, C.flameHi, 0.8);
    }

    // Rocket body
    game.draw.rect(rocketX - ROCKET_W / 2, rocketY - ROCKET_H / 2, ROCKET_W, ROCKET_H, C.rocket);
    game.draw.rect(rocketX - ROCKET_W / 2, rocketY - ROCKET_H / 2, ROCKET_W, 8, C.rocketHi);
    // Nose
    game.draw.circle(rocketX, rocketY - ROCKET_H / 2 - 20, 30, C.rocketHi);
    // Window
    game.draw.circle(rocketX, rocketY - 16, 22, '#1a3a5c');
    game.draw.circle(rocketX, rocketY - 16, 14, '#3b82f6', 0.6);
    // Legs
    game.draw.line(rocketX - ROCKET_W / 2, rocketY + ROCKET_H / 2, rocketX - ROCKET_W * 0.8, rocketY + ROCKET_H / 2 + 30, C.rocket, 8);
    game.draw.line(rocketX + ROCKET_W / 2, rocketY + ROCKET_H / 2, rocketX + ROCKET_W * 0.8, rocketY + ROCKET_H / 2 + 30, C.rocket, 8);

    // Speed indicator
    var speed = Math.round(Math.abs(rocketVY));
    var speedColor = speed < SAFE_SPEED ? C.correct : '#ef4444';
    game.draw.text('速度: ' + speed, W * 0.25, 148, { size: 44, color: speedColor, bold: true });

    // Fuel bar
    var fuelW = 300;
    game.draw.rect(W * 0.5 - fuelW / 2, 120, fuelW, 28, '#0a1428');
    game.draw.rect(W * 0.5 - fuelW / 2, 120, fuelW * (fuel / 100), 28, C.fuel);
    game.draw.text('燃料', W * 0.5 - fuelW / 2 - 60, 134, { size: 36, color: C.ui });

    // Thrust indicator
    if (thrusting && fuel > 0) {
      game.draw.text('● 噴射中', W / 2, H * 0.88, { size: 44, color: C.flame, bold: true });
    } else {
      game.draw.text('タップで噴射切替', W / 2, H * 0.88, { size: 44, color: C.ui });
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.5, { size: 88, color: feedback === '安全着陸！' ? C.correct : C.wrong, bold: true });
    }

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.fuel : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
