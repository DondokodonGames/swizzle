// 578-heat-gauge.js
// ヒートゲージ — ボタンを連打して温度を一定のゾーンに保つ
// 操作: タップで温度を上げる、放置で下がる
// 成功: 30秒間ゾーン内維持  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0404',
    cold:    '#3b82f6',
    cool:    '#22c55e',
    warm:    '#f59e0b',
    hot:     '#ef4444',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    gauge:   '#1a0000',
    gaugeHi: '#330000',
    text:    '#f1f5f9',
    ui:      '#374151',
    win:     '#22c55e'
  };

  var GAUGE_X = W / 2 - 40;
  var GAUGE_Y = H * 0.15;
  var GAUGE_W = 80;
  var GAUGE_H = H * 0.55;
  var ZONE_MIN = 0.45;
  var ZONE_MAX = 0.70;

  var temperature = 0.3; // 0-1
  var coolRate = 0.12; // per second
  var heatPerTap = 0.08;
  var inZoneTime = 0;
  var NEEDED_TIME = 30;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var tapFlash = 0;
  var lastTapTime = -10;
  var streak = 0;

  function getColor(t) {
    if (t < 0.3) return C.cold;
    if (t < 0.5) return C.cool;
    if (t < 0.7) return C.warm;
    return C.hot;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    temperature = Math.min(1, temperature + heatPerTap);
    tapFlash = 0.15;
    lastTapTime = elapsed;
    streak++;
    game.audio.play('se_tap', 0.2 + Math.min(0.3, streak * 0.02));

    // Heat particles
    var fireY = GAUGE_Y + GAUGE_H * (1 - temperature);
    for (var pi = 0; pi < 2; pi++) {
      particles.push({
        x: GAUGE_X + GAUGE_W / 2 + (Math.random() - 0.5) * 30,
        y: fireY + 20,
        vx: (Math.random() - 0.5) * 80,
        vy: -80 - Math.random() * 80,
        life: 0.3 + Math.random() * 0.2,
        col: temperature > 0.7 ? C.hot : C.warm
      });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (tapFlash > 0) tapFlash -= dt * 5;

    // Cool down over time
    var timeSinceT = elapsed - lastTapTime;
    temperature = Math.max(0, temperature - coolRate * dt * (1 + timeSinceT * 0.3));
    if (timeSinceT > 0.5) streak = 0;

    // Check zone
    var inZone = temperature >= ZONE_MIN && temperature <= ZONE_MAX;
    if (inZone) {
      inZoneTime += dt;
      if (inZoneTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.round(inZoneTime * 100) + Math.ceil(timeLeft) * 100); }, 700);
      }
    }

    // Spawn ambient particles based on temperature
    if (Math.random() < temperature * 0.3) {
      var fx = GAUGE_X + Math.random() * GAUGE_W;
      var fy = GAUGE_Y + GAUGE_H * (1 - temperature);
      particles.push({
        x: fx, y: fy,
        vx: (Math.random() - 0.5) * 60,
        vy: -40 - Math.random() * 60,
        life: 0.4,
        col: getColor(temperature)
      });
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Gauge background
    game.draw.rect(GAUGE_X - 4, GAUGE_Y - 4, GAUGE_W + 8, GAUGE_H + 8, C.gaugeHi, 0.9);
    game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H, C.gauge, 0.95);

    // Zone indicator
    var zoneY1 = GAUGE_Y + GAUGE_H * (1 - ZONE_MAX);
    var zoneH = GAUGE_H * (ZONE_MAX - ZONE_MIN);
    game.draw.rect(GAUGE_X, zoneY1, GAUGE_W, zoneH, C.zone, 0.12 + (inZone ? Math.sin(elapsed * 4) * 0.05 : 0));
    game.draw.line(GAUGE_X - 10, zoneY1, GAUGE_X + GAUGE_W + 10, zoneY1, C.zoneHi, 3);
    game.draw.line(GAUGE_X - 10, zoneY1 + zoneH, GAUGE_X + GAUGE_W + 10, zoneY1 + zoneH, C.zoneHi, 3);
    game.draw.text('目標', GAUGE_X + GAUGE_W + 40, zoneY1 + zoneH / 2 + 14, { size: 28, color: C.zoneHi });

    // Temperature fill
    var fillH = GAUGE_H * temperature;
    var fillY = GAUGE_Y + GAUGE_H - fillH;
    var tCol = getColor(temperature);

    // Gradient-like: draw multiple thin strips
    for (var gi = 0; gi < 8; gi++) {
      var gfrac = gi / 8;
      var gT = temperature * gfrac;
      var gCol = getColor(gT);
      var gH = fillH / 8;
      var gY = fillY + fillH - (gi + 1) * gH;
      game.draw.rect(GAUGE_X + 4, gY, GAUGE_W - 8, gH + 2, gCol, 0.85);
    }

    // Surface glow
    if (fillH > 10) {
      game.draw.rect(GAUGE_X + 4, fillY, GAUGE_W - 8, 12, tCol, 0.7 + Math.sin(elapsed * 8) * 0.2);
    }

    // Temperature value
    game.draw.text(Math.round(temperature * 100) + '°', GAUGE_X - 100, fillY + 16, { size: 44, color: tCol, bold: true });

    // Gauge decorations
    for (var li = 0; li <= 10; li++) {
      var ly = GAUGE_Y + GAUGE_H * (1 - li / 10);
      game.draw.line(GAUGE_X - 20, ly, GAUGE_X, ly, C.ui, li % 5 === 0 ? 3 : 1);
      if (li % 5 === 0) {
        game.draw.text(li * 10 + '', GAUGE_X - 50, ly + 10, { size: 24, color: C.ui });
      }
    }

    // Particles (fire)
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.6);
    }

    if (tapFlash > 0) game.draw.rect(0, 0, W, H, tCol, tapFlash * 0.08);
    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.win, flashAnim * 0.1);

    // Zone time progress
    var progW = W * 0.6;
    var progX = (W - progW) / 2;
    var progY = H * 0.8;
    game.draw.rect(progX, progY, progW, 28, C.ui, 0.4);
    game.draw.rect(progX, progY, progW * (inZoneTime / NEEDED_TIME), 28, C.zone, 0.9);
    game.draw.text(Math.round(inZoneTime) + ' / ' + NEEDED_TIME + '秒', W / 2, progY + 60, { size: 44, color: C.text, bold: true });

    // Tap instruction
    game.draw.circle(W / 2, H * 0.91, 80, tCol, 0.15 + Math.sin(elapsed * 5) * 0.08);
    game.draw.circle(W / 2, H * 0.91, 60, tCol, 0.25);
    game.draw.text('TAP', W / 2, H * 0.91 + 18, { size: 44, color: '#fff', bold: true });

    // Status
    var status = inZone ? '適正温度!' : (temperature < ZONE_MIN ? '温度が低い!' : '熱すぎ!');
    game.draw.text(status, W / 2, H * 0.76, { size: 36, color: inZone ? C.zone : tCol });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.warm : C.hot);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    temperature = 0.2;
  });
})(game);
