// 438-spin-bottle.js
// ボトルスピン — 回転するボトルが止まる方向を予測してタップ
// 操作: ボトルが止まる方向をタップ（8方向から選択）
// 成功: 10回連続予測  失敗: 3回外れ or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0614',
    table:  '#1a1028',
    tableHi:'#2d1a44',
    bottle: '#16a34a',
    bottleHi:'#4ade80',
    bottleTop:'#b45309',
    bottleCap:'#d97706',
    arrow:  '#fbbf24',
    arrowHi:'#fef08a',
    zone:   '#3b82f6',
    zoneHi: '#93c5fd',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var CX = W / 2;
  var CY = H * 0.46;
  var RADIUS = 280;  // distance from center to tap zones

  var bottleAngle = 0;
  var bottleSpeed = 0;
  var spinning = false;
  var targetAngle = 0;
  var decelTime = 0;
  var DECEL_DURATION = 2.5;
  var phase = 'predict';  // predict, spin, result
  var playerPick = -1;  // which zone picked (0-7)
  var resultTimer = 0;

  var correct = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];

  // 8 direction zones
  var zones = [];
  for (var i = 0; i < 8; i++) {
    var ang = i * Math.PI / 4;
    zones.push({
      angle: ang,
      x: CX + Math.cos(ang) * RADIUS,
      y: CY + Math.sin(ang) * RADIUS,
      label: ['→','↗','↑','↖','←','↙','↓','↘'][i]
    });
  }

  function startSpin() {
    targetAngle = Math.floor(Math.random() * 8) * Math.PI / 4 + (Math.random() - 0.5) * 0.1;
    // How many extra full rotations
    var extraRots = 3 + Math.floor(Math.random() * 4);
    var spinTotal = extraRots * Math.PI * 2 + targetAngle - bottleAngle;
    spinTotal = ((spinTotal % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) + extraRots * Math.PI * 2;
    bottleSpeed = spinTotal / DECEL_DURATION * 2;
    decelTime = 0;
    spinning = true;
    phase = 'spin';
  }

  function getNearestZone(angle) {
    var norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var nearest = Math.round(norm / (Math.PI / 4)) % 8;
    return nearest;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase !== 'predict') return;

    // Find which zone was tapped
    var best = -1;
    var bestDist = 999;
    for (var zi = 0; zi < 8; zi++) {
      var z = zones[zi];
      var dx = tx - z.x;
      var dy = ty - z.y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; best = zi; }
    }
    if (best >= 0 && bestDist < 100) {
      playerPick = best;
      game.audio.play('se_tap', 0.4);
      startSpin();
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    if (phase === 'spin') {
      decelTime += dt;
      var progress = Math.min(1, decelTime / DECEL_DURATION);
      var easeProgress = 1 - Math.pow(1 - progress, 3);
      bottleAngle = bottleAngle + bottleSpeed * (1 - easeProgress) * dt;

      if (progress >= 1) {
        bottleAngle = targetAngle;
        spinning = false;
        phase = 'result';
        resultTimer = 0;

        var landedZone = getNearestZone(bottleAngle);
        if (landedZone === playerPick) {
          correct++;
          flashCol = C.correct;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 10; pi++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: zones[landedZone].x, y: zones[landedZone].y, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150, life: 0.6, col: C.arrowHi });
          }
          if (correct >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 80); }, 700);
          }
        } else {
          misses++;
          flashCol = C.wrong;
          flashAnim = 0.7;
          game.audio.play('se_failure', 0.5);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    if (phase === 'result') {
      resultTimer += dt;
      if (resultTimer > 1.0 && !done) {
        phase = 'predict';
        playerPick = -1;
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Table
    game.draw.circle(CX, CY, RADIUS + 80, C.tableHi, 0.2);
    game.draw.circle(CX, CY, RADIUS + 50, C.table, 0.7);

    // Zone circles
    for (var zi2 = 0; zi2 < 8; zi2++) {
      var z = zones[zi2];
      var isPickedZone = zi2 === playerPick;
      var isLanded = phase === 'result' && zi2 === getNearestZone(bottleAngle);
      var zCol = isLanded ? (isPickedZone ? C.correct : C.wrong) : (isPickedZone ? C.zone : C.ui);
      var zAlpha = isLanded || isPickedZone ? 0.8 : 0.4;
      game.draw.circle(z.x, z.y, 55, zCol, zAlpha * 0.4);
      game.draw.circle(z.x, z.y, 44, zCol, zAlpha);
      game.draw.text(z.label, z.x, z.y + 14, { size: 44, color: '#fff', bold: true });
    }

    // Bottle body
    var bLen = 180;
    var bTipX = CX + Math.cos(bottleAngle) * bLen;
    var bTipY = CY + Math.sin(bottleAngle) * bLen;
    var bEndX = CX - Math.cos(bottleAngle) * bLen * 0.5;
    var bEndY = CY - Math.sin(bottleAngle) * bLen * 0.5;

    game.draw.line(bEndX, bEndY, bTipX, bTipY, C.bottle, 28);
    game.draw.line(bEndX, bEndY, bTipX, bTipY, C.bottleHi, 10);
    // Neck
    var neckX = CX + Math.cos(bottleAngle) * bLen * 0.7;
    var neckY = CY + Math.sin(bottleAngle) * bLen * 0.7;
    game.draw.line(neckX, neckY, bTipX, bTipY, C.bottleTop, 18);
    game.draw.circle(bTipX, bTipY, 14, C.bottleCap, 0.9);
    // Bottom label
    game.draw.circle(bEndX, bEndY, 20, C.bottleHi, 0.5);

    // Center pivot
    game.draw.circle(CX, CY, 18, C.bottleCap, 0.9);
    game.draw.circle(CX, CY, 10, '#fff', 0.7);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    // Instructions
    if (phase === 'predict') {
      game.draw.text('方向を予測してタップ！', W/2, H*0.88, { size: 40, color: C.arrowHi });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.zone : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
