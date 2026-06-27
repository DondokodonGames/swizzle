// 764-volt-control.js
// ボルトコントロール — 上昇し続ける電圧をタップで放電し、安全ゾーンに保て
// 操作: タップで電圧を下げる（過放電に注意）
// 成功: 60秒間電圧を安全ゾーン内に維持  失敗: 危険域に3回突入 or 60秒超過

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#030814',
    safe:     '#22c55e',
    warning:  '#fbbf24',
    danger:   '#ef4444',
    rail:     '#1e293b',
    needle:   '#f1f5f9',
    needleLo: '#38bdf8',
    arc:      '#1e3a5f',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#060c14',
    glow:     '#34d399'
  };

  var voltage = 0.3; // 0 = empty, 1 = max
  var RISE_RATE = 0.06; // per second voltage rise
  var DISCHARGE = 0.22; // per tap voltage drop
  var SAFE_LO = 0.3;
  var SAFE_HI = 0.75;
  var DANGER_LO = 0.0;
  var DANGER_HI = 1.0;

  var inDanger = false;
  var dangerTimer = 0;
  var DANGER_GRACE = 0.5; // seconds before counting danger
  var dangerCount = 0;
  var MAX_DANGER = 3;

  var surviveTime = 0;
  var NEEDED_TIME = 60;
  var done = false;
  var timeLeft = 75; // total time limit
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var zap = 0;

  // Meter bar
  var METER_X = W * 0.15;
  var METER_Y = H * 0.22;
  var METER_W = W * 0.7;
  var METER_H = 64;

  game.onTap(function(tx, ty) {
    if (done) return;
    voltage = Math.max(0, voltage - DISCHARGE);
    zap = 0.4;
    game.audio.play('se_tap', 0.09);
    // Spark particles
    var meterFillW = METER_W * voltage;
    for (var p = 0; p < 4; p++) {
      var pa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      particles.push({
        x: METER_X + meterFillW,
        y: METER_Y + METER_H / 2,
        vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 140 - 60,
        life: 0.3, col: C.glow
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

    // Voltage rises
    voltage += RISE_RATE * dt;
    voltage = Math.min(DANGER_HI, voltage);

    // Check safe zone
    var safe = voltage >= SAFE_LO && voltage <= SAFE_HI;
    var danger = voltage < DANGER_LO + 0.02 || voltage > DANGER_HI - 0.02;

    if (safe && !done) {
      surviveTime += dt;
      if (surviveTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.round(surviveTime) * 200 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    }

    if (danger) {
      if (!inDanger) {
        inDanger = true;
        dangerTimer = 0;
      } else {
        dangerTimer += dt;
        if (dangerTimer > DANGER_GRACE) {
          dangerCount++;
          dangerTimer = 0;
          inDanger = false;
          voltage = SAFE_HI - 0.1; // reset voltage to safe zone after penalty
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultText = '危険域！';
          resultTimer = 0.45;
          game.audio.play('se_failure', 0.35);
          if (dangerCount >= MAX_DANGER && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    } else {
      inDanger = false;
      dangerTimer = 0;
    }

    if (zap > 0) zap -= dt * 3;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Circuit grid background (decorative)
    for (var gi = 0; gi < 8; gi++) {
      var gy = H * 0.08 + gi * H * 0.12;
      game.draw.rect(0, gy, W, 1, '#1e293b', 0.4);
    }
    for (var gi2 = 0; gi2 < 6; gi2++) {
      var gx = gi2 * W / 5;
      game.draw.rect(gx, H * 0.08, 1, H * 0.85, '#1e293b', 0.35);
    }

    // Meter background
    game.draw.rect(METER_X - 4, METER_Y - 4, METER_W + 8, METER_H + 8, '#000', 0.4);
    game.draw.rect(METER_X, METER_Y, METER_W, METER_H, C.rail, 1.0);

    // Safe zone band
    game.draw.rect(METER_X + METER_W * SAFE_LO, METER_Y, METER_W * (SAFE_HI - SAFE_LO), METER_H, C.safe, 0.15);
    // Safe zone borders
    game.draw.rect(METER_X + METER_W * SAFE_LO - 3, METER_Y, 6, METER_H, C.safe, 0.7);
    game.draw.rect(METER_X + METER_W * SAFE_HI - 3, METER_Y, 6, METER_H, C.safe, 0.7);

    // Voltage fill
    var fillW = METER_W * voltage;
    var voltColor = voltage < SAFE_LO ? C.needleLo : (voltage > SAFE_HI ? C.danger : C.safe);
    if (fillW > 0) {
      game.draw.rect(METER_X, METER_Y, fillW, METER_H, voltColor, 0.85);
      game.draw.rect(METER_X, METER_Y, fillW, 12, '#fff', 0.12);
    }

    // Voltage marker
    if (voltage > 0.01) {
      game.draw.rect(METER_X + fillW - 4, METER_Y - 8, 8, METER_H + 16, voltColor, zap > 0 ? 1.0 : 0.9);
    }

    // Zone labels
    game.draw.text('低', METER_X - 40, METER_Y + METER_H / 2 + 8, { size: 36, color: C.needleLo });
    game.draw.text('高', METER_X + METER_W + 20, METER_Y + METER_H / 2 + 8, { size: 36, color: C.danger });
    game.draw.text('安全', METER_X + METER_W * ((SAFE_LO + SAFE_HI) / 2), METER_Y - 40, { size: 32, color: C.safe });

    // Percentage
    var pct = Math.round(voltage * 100);
    var pctCol = voltage >= SAFE_LO && voltage <= SAFE_HI ? C.safe : C.danger;
    game.draw.text(pct + '%', W / 2, METER_Y + METER_H + 60, { size: 68, color: pctCol, bold: true });

    // Survive progress
    var survRatio = Math.min(1, surviveTime / NEEDED_TIME);
    game.draw.rect(W * 0.1, H * 0.50, W * 0.8, 20, '#0f172a', 0.8);
    game.draw.rect(W * 0.1, H * 0.50, W * 0.8 * survRatio, 20, C.correct, 0.85);
    game.draw.text('維持時間: ' + Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, H * 0.56, { size: 36, color: C.text + 'cc' });

    // Instruction
    if (!done) {
      game.draw.text('タップで放電', W / 2, H * 0.62, { size: 40, color: C.text + '66' });
    }

    // Zap effect
    if (zap > 0) {
      for (var zi = 0; zi < 3; zi++) {
        var zx = METER_X + fillW + (Math.random() - 0.5) * 60;
        var zy = METER_Y + Math.random() * METER_H;
        game.draw.line(METER_X + fillW, METER_Y + METER_H / 2, zx, zy, C.glow, 3);
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 6 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.70, { size: 56, color: flashCol, bold: true });
    }

    // Danger hearts
    for (var di = 0; di < MAX_DANGER; di++) {
      game.draw.circle(W / 2 - (MAX_DANGER - 1) * 64 + di * 128, H * 0.955, 24, di < dangerCount ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(Math.floor(surviveTime) + 's / 60s', W / 2, 148, { size: 54, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
