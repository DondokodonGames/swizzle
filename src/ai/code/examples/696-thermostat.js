// 696-thermostat.js
// 温度調整 — 上下に動く温度を目標範囲内に保ち続けろ
// 操作: タップで加熱（温度上昇）、離すと冷却
// 成功: 累計15秒を目標範囲内で過ごす  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080310',
    cold:    '#0ea5e9',
    hot:     '#ef4444',
    good:    '#22c55e',
    warn:    '#fbbf24',
    bar:     '#1e293b',
    barHi:   '#334155',
    text:    '#f1f5f9',
    ui:      '#0a0514',
    glow:    '#86efac'
  };

  var THERMO_X = W / 2;
  var THERMO_TOP = H * 0.12;
  var THERMO_BOT = H * 0.85;
  var THERMO_H = THERMO_BOT - THERMO_TOP;
  var BAR_W = 80;

  var MIN_TEMP = 0;
  var MAX_TEMP = 100;
  var temp = 50; // current temperature
  var tempVel = 0;
  var TARGET_LO = 40;
  var TARGET_HI = 65;

  // Natural cooling drift
  var COOL_RATE = 12;   // degrees per second cooling
  var HEAT_RATE = 28;   // degrees per second when tapping
  var DRIFT_AMP = 8;    // random oscillation amplitude
  var DRIFT_FREQ = 0.4;

  var pressing = false;
  var inZoneTime = 0;
  var NEEDED_TIME = 15;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0;
  var particles = [];
  var driftPhase = 0;

  // Success flash
  var successFlash = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    pressing = true;
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

    // Release press after 0.15s (simulate tap)
    // Actually we'll detect "tap" as holding based on how long they hold
    // Since game.onTap fires once, we simulate hold via tap count
    // A single tap gives a burst of heat:
    if (pressing) {
      // Heat burst
      temp += HEAT_RATE * dt;
      pressing = false;
    }

    // Natural drift (oscillation + cooling toward 35)
    driftPhase += dt;
    var drift = Math.sin(driftPhase * DRIFT_FREQ * Math.PI * 2) * DRIFT_AMP * dt;
    temp += drift;
    // Cooling toward 30 (below target range)
    temp += (30 - temp) * COOL_RATE * dt * 0.035;

    // Clamp
    if (temp < MIN_TEMP) temp = MIN_TEMP;
    if (temp > MAX_TEMP) temp = MAX_TEMP;

    // Check in-zone
    var inZone = temp >= TARGET_LO && temp <= TARGET_HI;
    if (inZone && !done) {
      inZoneTime += dt;
      // Occasional positive particle
      if (Math.random() < dt * 3) {
        particles.push({
          x: THERMO_X + (Math.random() - 0.5) * 120,
          y: THERMO_BOT - (temp / MAX_TEMP) * THERMO_H,
          vx: (Math.random() - 0.5) * 80,
          vy: -60 - Math.random() * 80,
          life: 0.7,
          col: C.good
        });
      }
      if (inZoneTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(inZoneTime * 100) + Math.ceil(timeLeft) * 80); }, 700);
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- Draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Thermometer bar background
    game.draw.rect(THERMO_X - BAR_W / 2, THERMO_TOP, BAR_W, THERMO_H, C.bar, 0.9);

    // Target zone highlight
    var zoneBotY = THERMO_BOT - (TARGET_LO / MAX_TEMP) * THERMO_H;
    var zoneTopY = THERMO_BOT - (TARGET_HI / MAX_TEMP) * THERMO_H;
    game.draw.rect(THERMO_X - BAR_W / 2, zoneTopY, BAR_W, zoneBotY - zoneTopY, C.good, 0.15);
    // Zone borders
    game.draw.line(THERMO_X - BAR_W / 2 - 20, zoneTopY, THERMO_X + BAR_W / 2 + 20, zoneTopY, C.good, 3);
    game.draw.line(THERMO_X - BAR_W / 2 - 20, zoneBotY, THERMO_X + BAR_W / 2 + 20, zoneBotY, C.good, 3);

    // Temperature fill
    var fillH = (temp / MAX_TEMP) * THERMO_H;
    var fillY = THERMO_BOT - fillH;
    var tempRatio = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    // Color: cold=blue, warm=yellow, hot=red
    var fillCol;
    if (temp < TARGET_LO) fillCol = C.cold;
    else if (temp <= TARGET_HI) fillCol = C.good;
    else fillCol = C.hot;
    game.draw.rect(THERMO_X - BAR_W / 2, fillY, BAR_W, fillH, fillCol, 0.85);

    // Glow at fill top
    if (inZone) {
      game.draw.rect(THERMO_X - BAR_W / 2 - 10, fillY - 10, BAR_W + 20, 20, C.glow, 0.25);
    }

    // Temp scale markers
    for (var mk = 0; mk <= 10; mk++) {
      var my = THERMO_BOT - (mk / 10) * THERMO_H;
      var mw = mk % 5 === 0 ? 30 : 16;
      game.draw.line(THERMO_X - BAR_W / 2 - mw, my, THERMO_X - BAR_W / 2, my, '#ffffff22', 2);
      if (mk % 5 === 0) {
        game.draw.text(mk * 10 + '', THERMO_X - BAR_W / 2 - 56, my + 10, { size: 28, color: '#ffffff44' });
      }
    }

    // Current temp label
    var tempY = THERMO_BOT - (temp / MAX_TEMP) * THERMO_H;
    game.draw.text(Math.round(temp) + '°', THERMO_X + BAR_W / 2 + 60, tempY + 12, { size: 48, color: fillCol, bold: true });

    // Zone label
    game.draw.text('目標ゾーン', THERMO_X - BAR_W / 2 - 220, (zoneTopY + zoneBotY) / 2 + 12, { size: 34, color: C.good });

    // Instruction
    game.draw.text('タップで加熱！', W / 2, H * 0.91, { size: 44, color: '#ffffff55', bold: true });

    // Progress ring (in-zone time)
    var progRatio = Math.min(1, inZoneTime / NEEDED_TIME);
    var cx = W / 2, cy = H * 0.72;
    var progR = 100;
    // Circle segments approximate
    for (var seg = 0; seg < 24; seg++) {
      if (seg / 24 > progRatio) break;
      var a1 = -Math.PI / 2 + seg * Math.PI * 2 / 24;
      var a2 = -Math.PI / 2 + (seg + 1) * Math.PI * 2 / 24;
      var ax = cx + Math.cos((a1 + a2) / 2) * progR;
      var ay = cy + Math.sin((a1 + a2) / 2) * progR;
      game.draw.circle(ax, ay, 12, C.good, 0.85);
    }
    game.draw.text(Math.floor(inZoneTime) + 's', cx, cy + 16, { size: 52, color: C.good, bold: true });
    game.draw.text('/ ' + NEEDED_TIME + 's', cx, cy + 72, { size: 36, color: '#ffffff44' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    // Timer
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.good : C.hot);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
  });
})(game);
