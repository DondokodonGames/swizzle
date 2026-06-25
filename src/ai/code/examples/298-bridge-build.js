// 298-bridge-build.js
// 橋を架けろ — タイミングよくタップして橋の長さを調整、対岸にぴったり届かせる
// 操作: タップ長押し中に橋が伸びる、離した長さで勝負
// 成功: 10本の橋を渡りきる  失敗: 3回落下 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1628',
    sky:     '#0f2040',
    platform:'#334155',
    platHi:  '#475569',
    bridge:  '#d97706',
    bridgeHi:'#f59e0b',
    man:     '#22c55e',
    manHi:   '#86efac',
    danger:  '#ef4444',
    water:   '#0369a1',
    waterHi: '#0ea5e9',
    correct: '#22c55e',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var PLAT_H = 120;
  var PLAT_Y = H * 0.62;

  var leftX = 0;
  var rightX = 0;
  var leftW = 0;
  var rightW = 0;
  var gap = 0;

  var bridgeLen = 0;
  var maxBridgeLen = 0;
  var growing = false;
  var bridgeState = 'idle'; // idle, growing, falling, walking, done_round
  var bridgeFallAngle = 0;
  var manX = 0;
  var manWalkPhase = 0;

  var crossed = 0;
  var NEEDED = 10;
  var falls = 0;
  var MAX_FALL = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var roundResult = '';
  var roundResultTimer = 0;

  function newRound() {
    leftW = 160 + Math.floor(Math.random() * 100);
    leftX = 40;
    gap = 200 + Math.floor(Math.random() * 400);
    rightW = 140 + Math.floor(Math.random() * 120);
    rightX = leftX + leftW + gap;
    bridgeLen = 0;
    maxBridgeLen = gap + rightW + 80; // max possible
    bridgeState = 'idle';
    bridgeFallAngle = 0;
    manX = leftX + leftW / 2;
    roundResult = '';
  }

  var touchStart = -1;

  game.onTap(function(tx, ty) {
    // Handled via update check
  });

  // Use update loop to detect hold
  var touching = false;
  var touchTimer = 0;

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    // Not used
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (bridgeState === 'idle' || bridgeState === 'growing') {
      if (bridgeState === 'idle') {
        bridgeState = 'growing';
        bridgeLen = 0;
        touching = true;
        touchTimer = 0;
      } else if (bridgeState === 'growing') {
        // Release — bridge falls
        touching = false;
        bridgeState = 'falling';
        bridgeFallAngle = 0;
        game.audio.play('se_tap', 0.2);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (roundResultTimer > 0) roundResultTimer -= dt;

    if (bridgeState === 'growing' && touching) {
      bridgeLen += 400 * dt;
      if (bridgeLen > maxBridgeLen) {
        bridgeLen = maxBridgeLen;
        touching = false;
        bridgeState = 'falling';
      }
    }

    if (bridgeState === 'falling') {
      bridgeFallAngle += dt * 3;
      if (bridgeFallAngle >= Math.PI / 2) {
        bridgeFallAngle = Math.PI / 2;
        // Check if bridge reaches platform
        var bridgeEndX = leftX + leftW + bridgeLen;
        if (bridgeEndX >= rightX && bridgeEndX <= rightX + rightW) {
          // Success — man walks
          bridgeState = 'walking';
          game.audio.play('se_success', 0.4);
          roundResult = 'ぴったり！';
          roundResultTimer = 1.5;
        } else if (bridgeEndX > rightX + rightW) {
          // Too long
          bridgeState = 'falling2';
          game.audio.play('se_failure', 0.5);
          roundResult = '長すぎ！';
          roundResultTimer = 1.0;
          falls++;
          for (var fi = 0; fi < 8; fi++) {
            var fang = Math.random() * Math.PI * 2;
            particles.push({ x: bridgeEndX, y: PLAT_Y, vx: Math.cos(fang) * 150, vy: Math.sin(fang) * 150, life: 0.6, col: C.danger });
          }
          if (falls >= MAX_FALL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(function() { if (!done) newRound(); }, 1000);
          }
        } else {
          // Too short
          bridgeState = 'falling2';
          game.audio.play('se_failure', 0.5);
          roundResult = '短い！';
          roundResultTimer = 1.0;
          falls++;
          for (var fi2 = 0; fi2 < 8; fi2++) {
            var fang2 = Math.random() * Math.PI * 2;
            particles.push({ x: leftX + leftW + bridgeLen / 2, y: PLAT_Y + 60, vx: Math.cos(fang2) * 150, vy: Math.sin(fang2) * 180, life: 0.6, col: C.danger });
          }
          if (falls >= MAX_FALL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(function() { if (!done) newRound(); }, 1000);
          }
        }
      }
    }

    if (bridgeState === 'walking') {
      manX += 350 * dt;
      manWalkPhase += dt * 8;
      if (manX >= rightX + rightW / 2) {
        crossed++;
        for (var ci = 0; ci < 10; ci++) {
          var cang = Math.random() * Math.PI * 2;
          particles.push({ x: manX, y: PLAT_Y - 80, vx: Math.cos(cang) * 200, vy: Math.sin(cang) * 200 - 50, life: 0.7, col: C.manHi });
        }
        bridgeState = 'done_round';
        if (crossed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(crossed * 300 + Math.ceil(timeLeft) * 100); }, 500);
          return;
        }
        setTimeout(function() { if (!done) newRound(); }, 600);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient
    game.draw.rect(0, 0, W, PLAT_Y, C.sky, 0.7);

    // Water below platforms
    game.draw.rect(0, PLAT_Y + PLAT_H, W, H - PLAT_Y - PLAT_H, C.water, 0.9);
    game.draw.rect(0, PLAT_Y + PLAT_H, W, 20, C.waterHi, 0.5);

    // Left platform
    game.draw.rect(leftX, PLAT_Y, leftW, PLAT_H, C.platform, 0.9);
    game.draw.rect(leftX, PLAT_Y, leftW, 14, C.platHi, 0.6);

    // Right platform (gap indicator dots)
    if (rightX < W) {
      game.draw.rect(rightX, PLAT_Y, rightW, PLAT_H, C.platform, 0.9);
      game.draw.rect(rightX, PLAT_Y, rightW, 14, C.platHi, 0.6);
    }

    // Bridge
    if (bridgeLen > 0) {
      var angle = bridgeFallAngle; // 0 = vertical/growing, pi/2 = horizontal
      var bx = leftX + leftW;
      var by = PLAT_Y;
      var endX = bx + bridgeLen * Math.sin(angle);
      var endY = by + bridgeLen * (1 - Math.cos(angle));
      // Draw bridge as thick line
      game.draw.line(bx, by, endX, endY, C.bridge, 20);
      game.draw.line(bx, by, endX, endY, C.bridgeHi, 6);
      // Length indicator
      if (bridgeState === 'growing' || bridgeState === 'idle') {
        game.draw.text(Math.round(bridgeLen) + '', bx + bridgeLen / 2, by - 40, { size: 36, color: C.bridgeHi });
      }
    }

    // Gap indicator
    game.draw.text('← ' + Math.round(gap) + ' →', (leftX + leftW + rightX) / 2, PLAT_Y - 40, { size: 32, color: C.ui });

    // Man (stick figure)
    var mx = manX;
    var my = PLAT_Y - 10;
    var legSwing = Math.sin(manWalkPhase) * 15;
    // Body
    game.draw.circle(mx, my - 60, 20, C.man, 0.9);
    game.draw.circle(mx, my - 60, 20, C.manHi, 0.2);
    game.draw.line(mx, my - 40, mx, my - 10, C.man, 10);
    game.draw.line(mx, my - 10, mx - 20 + legSwing, my + 30, C.man, 8);
    game.draw.line(mx, my - 10, mx + 20 - legSwing, my + 30, C.man, 8);

    // Hint when idle
    if (bridgeState === 'idle') {
      game.draw.text('タップ→伸びる  タップ→固定', W / 2, H * 0.87, { size: 36, color: C.ui });
    }

    // Round result
    if (roundResultTimer > 0) {
      game.draw.text(roundResult, W / 2, H * 0.84, { size: 56, color: roundResult.includes('ぴったり') ? C.correct : C.danger, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 1.5, p.col, p.life * 0.8);
    }

    // Fall dots
    for (var fi3 = 0; fi3 < MAX_FALL; fi3++) {
      game.draw.circle(W / 2 - (MAX_FALL - 1) * 30 + fi3 * 60, H * 0.93, 16, fi3 < falls ? C.danger : '#06101e');
    }

    game.draw.text(crossed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bridge : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newRound();
  });
})(game);
