// 263-power-surge.js
// パワーサージ — 電力メーターを危険ゾーンに入らないよう連打でコントロールする
// 操作: タップで電力を上げる（自然に下がる）
// 成功: 緑ゾーン内30秒生存  失敗: 赤ゾーン3回踏む or 黄ゾーン外へ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030208',
    track:  '#0f0c1e',
    green:  '#22c55e',
    grnHi:  '#86efac',
    yellow: '#f59e0b',
    yelHi:  '#fde68a',
    red:    '#ef4444',
    redHi:  '#fca5a5',
    power:  '#3b82f6',
    powHi:  '#93c5fd',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var METER_W = W - 80;
  var METER_H = 100;
  var METER_X = 40;
  var METER_Y = H * 0.35;

  var power = 0.5; // 0 to 1
  var DRAIN_RATE = 0.18; // power lost per second
  var TAP_BOOST = 0.06; // power gained per tap

  // Target zone moves
  var zoneCenter = 0.5;
  var zoneLow = 0.35;
  var zoneHigh = 0.65;
  var zoneSpeed = 0.08;
  var zoneMoveTimer = 0;
  var ZONE_MOVE_INTERVAL = 3;

  var survivalTime = 0;
  var NEEDED_TIME = 30;
  var redHits = 0;
  var MAX_RED = 3;
  var done = false;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var inRed = false;
  var redTimer = 0;

  function updateZone() {
    var newCenter = 0.2 + Math.random() * 0.6;
    zoneCenter = newCenter;
    zoneLow = Math.max(0.1, newCenter - 0.15);
    zoneHigh = Math.min(0.9, newCenter + 0.15);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    power = Math.min(1, power + TAP_BOOST);
    game.audio.play('se_tap', 0.2);
    for (var pi = 0; pi < 2; pi++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1;
      particles.push({ x: METER_X + power * METER_W, y: METER_Y + METER_H / 2, vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80, life: 0.3 });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;

    // Drain
    power = Math.max(0, power - DRAIN_RATE * dt);

    // Move target zone
    zoneMoveTimer += dt;
    if (zoneMoveTimer >= ZONE_MOVE_INTERVAL) {
      zoneMoveTimer = 0;
      updateZone();
      ZONE_MOVE_INTERVAL = 2.5 + Math.random() * 2;
    }

    // Check zone
    var inGreen = power >= zoneLow && power <= zoneHigh;
    var inRange = power >= 0.05 && power <= 0.95;

    if (inGreen && !done) {
      survivalTime += dt;
      if (survivalTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.round(survivalTime * 100) + Math.round((1 - redHits / MAX_RED) * 500)); }, 400);
        return;
      }
    } else if (!inRange && !done) {
      // Out of bounds
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    // Red zone (outside green but in range)
    if (!inGreen && inRange && !done) {
      if (!inRed) {
        inRed = true;
        redTimer = 0;
      }
      redTimer += dt;
      if (redTimer > 1.0) {
        redHits++;
        feedback = '危険ゾーン！ (' + redHits + '/' + MAX_RED + ')';
        feedbackCol = C.red;
        feedbackTimer = 0.6;
        game.audio.play('se_failure', 0.4);
        redTimer = 0;
        if (redHits >= MAX_RED && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    } else {
      inRed = false;
      redTimer = 0;
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background glow based on zone
    var glowCol = inGreen ? C.green : C.red;
    var glowAmt = inGreen ? 0.05 : (0.05 + 0.08 * Math.abs(Math.sin(elapsed * 4)));
    game.draw.rect(0, 0, W, H, glowCol, glowAmt);

    // Meter track
    game.draw.rect(METER_X, METER_Y, METER_W, METER_H, C.track, 0.8);

    // Danger zones (red)
    game.draw.rect(METER_X, METER_Y, METER_W * zoneLow, METER_H, C.red, 0.25);
    game.draw.rect(METER_X + METER_W * zoneHigh, METER_Y, METER_W * (1 - zoneHigh), METER_H, C.red, 0.25);

    // Safe zone (green)
    game.draw.rect(METER_X + METER_W * zoneLow, METER_Y, METER_W * (zoneHigh - zoneLow), METER_H, C.green, 0.3);

    // Meter fill
    var inGreenNow = power >= zoneLow && power <= zoneHigh;
    var meterCol = inGreenNow ? C.power : (power < 0.1 || power > 0.9 ? C.red : C.yellow);
    game.draw.rect(METER_X, METER_Y + 4, METER_W * power, METER_H - 8, meterCol, 0.85);

    // Meter border
    game.draw.rect(METER_X, METER_Y, METER_W, 4, C.ui, 0.5);
    game.draw.rect(METER_X, METER_Y + METER_H - 4, METER_W, 4, C.ui, 0.5);

    // Zone labels
    game.draw.text('LOW', METER_X + METER_W * zoneLow * 0.5, METER_Y + METER_H / 2 + 14, { size: 32, color: C.redHi });
    game.draw.text('OK', METER_X + METER_W * (zoneLow + (zoneHigh - zoneLow) / 2), METER_Y + METER_H / 2 + 14, { size: 36, color: C.grnHi, bold: true });
    game.draw.text('HIGH', METER_X + METER_W * zoneHigh + METER_W * (1 - zoneHigh) * 0.5, METER_Y + METER_H / 2 + 14, { size: 32, color: C.redHi });

    // Power value
    game.draw.text(Math.round(power * 100) + '%', W / 2, METER_Y - 30, { size: 52, color: meterCol, bold: true });

    // Tap instruction
    game.draw.text('タップで電力チャージ！', W / 2, METER_Y + METER_H + 50, { size: 44, color: C.ui });

    // Big tap target
    var tapPulse = 0.8 + 0.2 * Math.abs(Math.sin(elapsed * 6));
    game.draw.circle(W / 2, H * 0.65, 100 * tapPulse, C.power, 0.15);
    game.draw.circle(W / 2, H * 0.65, 80 * tapPulse, C.power, 0.3);
    game.draw.text('TAP', W / 2, H * 0.65 + 18, { size: 60, color: C.powHi, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 6 * (p.life / 0.3), C.powHi, p.life);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.84, { size: 46, color: feedbackCol, bold: true });
    }

    // Red hit dots
    for (var ri = 0; ri < MAX_RED; ri++) {
      game.draw.circle(W / 2 - (MAX_RED - 1) * 28 + ri * 56, H * 0.88, 16, ri < redHits ? C.red : '#0a0618');
    }

    // Survival progress
    var survRatio = Math.min(1, survivalTime / NEEDED_TIME);
    game.draw.rect(40, H * 0.92, W - 80, 16, C.ui, 0.3);
    game.draw.rect(40, H * 0.92, (W - 80) * survRatio, 16, C.green, 0.9);
    game.draw.text(Math.ceil(survivalTime) + 's / ' + NEEDED_TIME + 's', W / 2, H * 0.96, { size: 40, color: C.text, bold: true });

    var ratio = Math.max(0, 1 - elapsed / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, C.power);
    game.draw.text(Math.ceil(Math.max(0, 90 - elapsed)) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    updateZone();
    power = 0.5;
  });
})(game);
