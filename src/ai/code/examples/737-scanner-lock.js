// 737-scanner-lock.js
// スキャナーロック — 上下に流れるスキャン線がターゲットゾーンに入った瞬間タップせよ
// 操作: タップ — スキャン線がゾーン内にあるとき成功
// 成功: 30回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020d1a',
    scanner: '#00e5ff',
    zone:    '#0e3a50',
    zoneHi:  '#22c55e',
    grid:    '#0a2a3a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#e0f7ff',
    ui:      '#05101f'
  };

  var SCAN_Y0 = H * 0.20;
  var SCAN_Y1 = H * 0.80;
  var SCAN_H  = SCAN_Y1 - SCAN_Y0;

  var ZONE_HALF = 72;
  var ZONE_CY   = H * 0.50;

  var scanY = SCAN_Y0;
  var scanDir = 1;
  var SCAN_SPEED = 560;

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

  game.onTap(function(tx, ty) {
    if (done || lockTimer > 0) return;
    var inZone = Math.abs(scanY - ZONE_CY) < ZONE_HALF;
    if (inZone) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = 'ロック！';
      resultTimer = 0.4;
      game.audio.play('se_tap', 0.12);
      lockTimer = 0.28;
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: scanY, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: C.scanner });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      var miss = Math.round(Math.abs(scanY - ZONE_CY) - ZONE_HALF);
      resultText = miss + 'px ズレ！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.25);
      lockTimer = 0.18;
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

    var spd = Math.min(1100, SCAN_SPEED + score * 14);
    scanY += spd * scanDir * dt;
    if (scanY > SCAN_Y1) { scanY = SCAN_Y1; scanDir = -1; }
    if (scanY < SCAN_Y0) { scanY = SCAN_Y0; scanDir =  1; }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inZone = Math.abs(scanY - ZONE_CY) < ZONE_HALF;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Scan area grid
    game.draw.rect(0, SCAN_Y0, W, SCAN_H, C.grid, 0.4);
    for (var gl = 0; gl <= 10; gl++) {
      var ly = SCAN_Y0 + gl * (SCAN_H / 10);
      game.draw.line(0, ly, W, ly, C.scanner, 0.08);
    }
    for (var gc = 0; gc <= 6; gc++) {
      game.draw.line(gc * (W / 6), SCAN_Y0, gc * (W / 6), SCAN_Y1, C.scanner, 0.06);
    }

    // Target zone
    var zy0 = ZONE_CY - ZONE_HALF;
    var zy1 = ZONE_CY + ZONE_HALF;
    game.draw.rect(0, zy0, W, ZONE_HALF * 2, inZone ? C.zoneHi : C.zone, inZone ? 0.22 : 0.18);
    game.draw.line(0, zy0, W, zy0, inZone ? C.zoneHi : C.scanner, inZone ? 4 : 2);
    game.draw.line(0, zy1, W, zy1, inZone ? C.zoneHi : C.scanner, inZone ? 4 : 2);
    game.draw.text('TARGET', W / 2, ZONE_CY, { size: 40, color: (inZone ? C.zoneHi : C.scanner) + 'aa', bold: true });

    // Scanner line
    game.draw.rect(0, scanY - 4, W, 8, C.scanner, inZone ? 1.0 : 0.8);
    game.draw.rect(0, scanY - 18, W, 36, C.scanner, 0.06);
    game.draw.rect(0, scanY - 22, 52, 44, C.scanner, inZone ? 0.9 : 0.6);
    game.draw.rect(W - 52, scanY - 22, 52, 44, C.scanner, inZone ? 0.9 : 0.6);

    if (inZone && lockTimer <= 0) {
      game.draw.text('今タップ！', W / 2, H * 0.87, { size: 56, color: C.zoneHi, bold: true });
    } else {
      game.draw.text('ゾーンでタップ', W / 2, H * 0.87, { size: 40, color: C.text + '44' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.13, { size: 52, color: flashCol, bold: true });
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
    scanY = SCAN_Y0;
  });
})(game);
