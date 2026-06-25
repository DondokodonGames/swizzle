// 005-balance-tilt.js
// 天秤バランス — 傾く天秤を左右タップで水平に保つ緊張感
// 操作: 傾いた側と逆をタップして重さを足す
// 成功: 15秒間倒れずに生き延びる  失敗: 傾きが限界を超える

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c1220',
    beam:    '#c8a96e',
    pivot:   '#8b7355',
    platL:   '#3b82f6',
    platR:   '#f97316',
    safe:    '#22c55e',
    danger:  '#ef4444',
    ui:      '#64748b',
    glow:    '#fbbf24'
  };

  // angle: negative = tilts left (left side heavy), positive = right
  var angle = (Math.random() - 0.5) * 0.1;
  var angularVel = 0;
  var timeLeft = 15;
  var done = false;
  var hitFeedback = 0;
  var hitSide = 0; // -1 left, +1 right

  // difficulty ramps up: angular acceleration base increases over time
  function getGravity(elapsed) {
    return 0.8 + elapsed * 0.06; // slow ramp
  }

  var LIMIT = Math.PI / 4; // 45 degrees = fail

  game.onTap(function(x, y) {
    if (done) return;
    if (x < W / 2) {
      // tap left → add weight to left → pushes angle more negative... wait
      // tap left side means "press down on left" → left gets heavier
      // But we want to FIX the tilt: if left is low, tap RIGHT to press down right
      // Intuitive: tap the RAISED side to push it down
      angularVel -= 0.6; // push tilt toward left (negative)
      hitSide = -1;
    } else {
      angularVel += 0.6;
      hitSide = 1;
    }
    hitFeedback = 0.25;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (done) {
      drawScene();
      return;
    }

    timeLeft -= dt;
    if (timeLeft <= 0) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(200); }, 400);
      return;
    }

    // physics: gravity pulls toward whichever side is heavier
    // Small random perturbations
    var noise = (Math.random() - 0.5) * getGravity(15 - timeLeft) * dt;
    angularVel += angle * getGravity(15 - timeLeft) * dt + noise;
    angularVel *= 0.96; // damping
    angle += angularVel * dt;

    if (hitFeedback > 0) hitFeedback -= dt;

    if (Math.abs(angle) >= LIMIT) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 300);
    }

    drawScene();
  });

  function drawScene() {
    game.draw.rect(0, 0, W, H, C.bg);

    // timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#111827');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // danger indicator (red ring if near limit)
    var danger = Math.abs(angle) / LIMIT;
    if (danger > 0.6) {
      var da = (danger - 0.6) / 0.4;
      game.draw.rect(0, 0, W, H, '#ef4444', da * 0.12);
    }

    var cx = W / 2;
    var cy = H / 2;
    var beamLen = 380;

    // pivot stand
    game.draw.rect(cx - 16, cy + 20, 32, 280, C.pivot);
    game.draw.rect(cx - 60, cy + 300, 120, 32, C.pivot);

    // pivot circle
    game.draw.circle(cx, cy, 30, C.pivot);
    game.draw.circle(cx, cy, 18, C.glow);

    // rotating beam
    var cosA = Math.cos(angle);
    var sinA = Math.sin(angle);

    var lx = cx - beamLen * cosA;
    var ly = cy - beamLen * sinA;
    var rx = cx + beamLen * cosA;
    var ry = cy + beamLen * sinA;

    // beam shadow
    game.draw.line(cx, cy + 6, lx, ly + 6, '#00000040', 24);
    game.draw.line(cx, cy + 6, rx, ry + 6, '#00000040', 24);
    // beam
    game.draw.line(cx, cy, lx, ly, C.beam, 20);
    game.draw.line(cx, cy, rx, ry, C.beam, 20);

    // platforms
    var pW = 200;
    var pBorder = 8;
    var lIsHit = hitFeedback > 0 && hitSide === -1;
    var rIsHit = hitFeedback > 0 && hitSide === 1;

    // left platform
    game.draw.rect(lx - pW / 2 - pBorder, ly - pBorder, pW + pBorder * 2, 24 + pBorder * 2, lIsHit ? '#fff' : '#1e3a5f');
    game.draw.rect(lx - pW / 2, ly, pW, 24, lIsHit ? '#60a5fa' : C.platL);

    // right platform
    game.draw.rect(rx - pW / 2 - pBorder, ry - pBorder, pW + pBorder * 2, 24 + pBorder * 2, rIsHit ? '#fff' : '#7c2d12');
    game.draw.rect(rx - pW / 2, ry, pW, 24, rIsHit ? '#fb923c' : C.platR);

    // angle indicator bar
    var indicatorY = H - 260;
    var indW = 500;
    var indH = 48;
    game.draw.rect(cx - indW / 2, indicatorY, indW, indH, '#1e293b');
    game.draw.rect(cx - indW / 2, indicatorY, indW, indH, '#374151', 0, 2);
    // green safe zone
    game.draw.rect(cx - indW * 0.15, indicatorY, indW * 0.3, indH, '#15803d', 0.5);
    // needle
    var needleX = cx + (angle / LIMIT) * (indW / 2);
    game.draw.rect(needleX - 6, indicatorY - 8, 12, indH + 16, danger > 0.7 ? C.danger : '#ffffff');

    // instructions
    game.draw.text('← タップ  タップ →', W / 2, H - 160, { size: 48, color: C.ui });
    game.draw.text('傾いた方向にタップして均衡を保て！', W / 2, H - 100, { size: 36, color: '#334155' });
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);
