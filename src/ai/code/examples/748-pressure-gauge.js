// 748-pressure-gauge.js
// プレッシャーゲージ — 回転する針がグリーンゾーンに入った瞬間タップせよ
// 操作: タップ — 針がゾーン内にあるとき成功
// 成功: 30回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0605',
    dial:    '#1c1008',
    dialRim: '#78350f',
    needle:  '#ef4444',
    needleTip:'#fbbf24',
    zone:    '#22c55e',
    zoneDim: '#14532d',
    red:     '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#fef3c7',
    ui:      '#140803'
  };

  var CX = W / 2;
  var CY = H * 0.46;
  var DIAL_R = 280;
  var NEEDLE_L = 240;

  // Zone: angle range from MIN_A to MAX_A (radians, 0=right)
  var ZONE_START = Math.PI * 0.62; // ~112 degrees (upper left-ish)
  var ZONE_END   = Math.PI * 0.88; // ~158 degrees
  // Needle sweeps full circle
  var needleAngle = 0;
  var needleSpeed = 2.2; // radians/sec

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var lockTimer = 0;

  function angleInZone(a) {
    var na = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return na >= ZONE_START && na <= ZONE_END;
  }

  game.onTap(function(tx, ty) {
    if (done || lockTimer > 0) return;
    var inZone = angleInZone(needleAngle);
    if (inZone) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      var pos = Math.round(((needleAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - ZONE_START) / (ZONE_END - ZONE_START) * 100);
      resultText = '圧力' + pos + '%！';
      resultTimer = 0.4;
      lockTimer = 0.3;
      game.audio.play('se_tap', 0.12);
      var nx = CX + Math.cos(needleAngle) * NEEDLE_L;
      var ny = CY + Math.sin(needleAngle) * NEEDLE_L;
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: nx, y: ny, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.zone });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = 'ゾーン外！';
      resultTimer = 0.4;
      lockTimer = 0.18;
      game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
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

    if (lockTimer > 0) lockTimer -= dt;

    var spd = Math.min(5.5, needleSpeed + score * 0.09);
    needleAngle += spd * dt;

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inZone = angleInZone(needleAngle);

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Dial background
    game.draw.circle(CX + 8, CY + 8, DIAL_R, '#000', 0.35);
    game.draw.circle(CX, CY, DIAL_R, C.dial, 0.95);
    game.draw.circle(CX, CY, DIAL_R - 8, C.dialRim, 0.3);

    // Danger zone (red arc at right)
    for (var ri = 0; ri < 30; ri++) {
      var ra = (ri / 30) * Math.PI * 0.5 - Math.PI * 0.05;
      var rx = CX + Math.cos(ra) * (DIAL_R - 24);
      var ry = CY + Math.sin(ra) * (DIAL_R - 24);
      game.draw.circle(rx, ry, 10, C.red, 0.55);
    }

    // Green zone arc
    var ZONE_STEPS = 24;
    for (var gi = 0; gi <= ZONE_STEPS; gi++) {
      var ga = ZONE_START + (gi / ZONE_STEPS) * (ZONE_END - ZONE_START);
      var gx = CX + Math.cos(ga) * (DIAL_R - 24);
      var gy = CY + Math.sin(ga) * (DIAL_R - 24);
      game.draw.circle(gx, gy, 12, inZone ? C.zone : C.zoneDim, inZone ? 0.85 : 0.5);
    }

    // Tick marks
    for (var ti = 0; ti < 20; ti++) {
      var ta = (ti / 20) * Math.PI * 2;
      var t1x = CX + Math.cos(ta) * (DIAL_R - 40);
      var t1y = CY + Math.sin(ta) * (DIAL_R - 40);
      var t2x = CX + Math.cos(ta) * (DIAL_R - 18);
      var t2y = CY + Math.sin(ta) * (DIAL_R - 18);
      game.draw.line(t1x, t1y, t2x, t2y, '#3d2b10', ti % 5 === 0 ? 4 : 2);
    }

    // Needle
    var nx = CX + Math.cos(needleAngle) * NEEDLE_L;
    var ny = CY + Math.sin(needleAngle) * NEEDLE_L;
    var bx = CX - Math.cos(needleAngle) * 50;
    var by = CY - Math.sin(needleAngle) * 50;
    game.draw.line(bx, by, nx, ny, C.needle, inZone ? 8 : 6);
    game.draw.circle(nx, ny, 12, C.needleTip, 0.9);
    game.draw.circle(CX, CY, 22, '#5a3010', 0.95);
    game.draw.circle(CX, CY, 12, C.needleTip, 0.9);

    if (inZone && lockTimer <= 0) {
      game.draw.text('今タップ！', W / 2, H * 0.82, { size: 56, color: C.zone, bold: true });
    } else {
      game.draw.text('グリーンゾーンでタップ', W / 2, H * 0.82, { size: 36, color: C.text + '44' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
