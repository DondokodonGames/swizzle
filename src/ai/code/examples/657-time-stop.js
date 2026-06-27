// 657-time-stop.js
// タイムストップ — 動くターゲットが指定位置に来た瞬間に時を止めろ
// 操作: タップで時間を止める
// 成功: 15回ピタリ止める  失敗: 10回外す or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030306',
    track:   '#0a0a14',
    marker:  '#7c3aed',
    markerHi:'#a78bfa',
    target:  '#f59e0b',
    targetHi:'#fde68a',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    frozen:  '#60a5fa',
    frozenHi:'#bfdbfe',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#06060d'
  };

  var TRACK_Y = H * 0.5;
  var ZONE_X = W * 0.72;
  var ZONE_W = 80;

  var markerX = W * 0.1;
  var markerSpeed = 350;
  var markerDir = 1;

  var frozen = false;
  var frozenTimer = 0;
  var FREEZE_DUR = 0.6;

  var correct = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.zone;
  var resultTimer = 0, resultText = '';

  game.onTap(function(tx, ty) {
    if (done || frozen) return;
    frozen = true;
    frozenTimer = FREEZE_DUR;

    var inZone = markerX >= ZONE_X - ZONE_W / 2 && markerX <= ZONE_X + ZONE_W / 2;
    if (inZone) {
      correct++;
      flashCol = C.zone;
      flashAnim = 0.3;
      resultText = 'ストップ！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: markerX, y: TRACK_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.frozenHi });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 350 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '外れ！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (frozen) {
      frozenTimer -= dt;
      if (frozenTimer <= 0) frozen = false;
    } else {
      // Move marker with increasing speed
      var spd = markerSpeed * (1 + elapsed * 0.015);
      markerX += markerDir * spd * dt;
      if (markerX > W - 60) { markerX = W - 60; markerDir = -1; }
      if (markerX < 60) { markerX = 60; markerDir = 1; }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Track
    game.draw.rect(40, TRACK_Y - 20, W - 80, 40, C.track, 0.8);
    game.draw.rect(40, TRACK_Y - 2, W - 80, 4, '#ffffff11', 0.5);

    // Zone
    game.draw.rect(ZONE_X - ZONE_W / 2 - 4, TRACK_Y - 60, ZONE_W + 8, 120, C.zoneHi, 0.08);
    game.draw.rect(ZONE_X - ZONE_W / 2, TRACK_Y - 52, ZONE_W, 104, C.zone, 0.15);
    game.draw.line(ZONE_X - ZONE_W / 2, TRACK_Y - 52, ZONE_X - ZONE_W / 2, TRACK_Y + 52, C.zoneHi, 4);
    game.draw.line(ZONE_X + ZONE_W / 2, TRACK_Y - 52, ZONE_X + ZONE_W / 2, TRACK_Y + 52, C.zoneHi, 4);
    game.draw.text('STOP', ZONE_X, TRACK_Y + 80, { size: 36, color: C.zoneHi, bold: true });

    // Speed label
    game.draw.text('→', W * 0.85, TRACK_Y - 60, { size: 40, color: '#ffffff33' });

    // Marker
    var markerCol = frozen ? C.frozen : C.target;
    var markerGlowCol = frozen ? C.frozenHi : C.targetHi;
    game.draw.circle(markerX, TRACK_Y + 5, 44, '#000', 0.3);
    game.draw.circle(markerX, TRACK_Y, 44, markerCol, 0.9);
    game.draw.circle(markerX - 14, TRACK_Y - 14, 16, markerGlowCol, 0.5);

    // Frozen indicator
    if (frozen) {
      var fRatio = frozenTimer / FREEZE_DUR;
      game.draw.circle(markerX, TRACK_Y, 56 + (1 - fRatio) * 30, C.frozen, fRatio * 0.3);
      game.draw.text('❄', markerX, TRACK_Y - 60, { size: 48, color: C.frozenHi });
    }

    // Clock visual
    var clockY = H * 0.3;
    game.draw.circle(W / 2, clockY, 100, C.track, 0.8);
    game.draw.circle(W / 2, clockY, 96, C.ui, 0.6);
    var handAngle = elapsed * (frozen ? 0 : 2) - Math.PI / 2;
    game.draw.line(W / 2, clockY, W / 2 + Math.cos(handAngle) * 70, clockY + Math.sin(handAngle) * 70, C.target, 6);
    game.draw.line(W / 2, clockY, W / 2 + Math.cos(handAngle * 12) * 50, clockY + Math.sin(handAngle * 12) * 50, C.marker, 4);
    game.draw.circle(W / 2, clockY, 8, '#fff', 0.9);
    if (frozen) {
      game.draw.text('STOP', W / 2, clockY + 6, { size: 28, color: C.frozen, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.72, { size: 72, color: flashCol, bold: true });
    }
    if (!frozen) {
      game.draw.text('TAP!', W / 2, H * 0.78, { size: 44, color: '#ffffff44' });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.zone : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
