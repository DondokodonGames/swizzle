// 667-spiral-drop.js
// 螺旋降下 — 回転する輪のすき間に合わせてタップで通り抜けろ
// 操作: タップで次の輪に進む
// 成功: 25個の輪を通過  失敗: 8回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030008',
    ring:    '#7c3aed',
    ringHi:  '#a78bfa',
    gap:     '#000000',
    ball:    '#f59e0b',
    ballHi:  '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060010'
  };

  var CENTER_X = W / 2;
  var CENTER_Y = H / 2;
  var RING_R = 340;
  var GAP_ARC = 0.6; // radians of open gap in each ring

  var rings = [];
  var ballAngle = -Math.PI / 2; // ball starts at top
  var ballR = 0; // current ring index (0=innermost)
  var MAX_RINGS = 5;

  var passed = 0;
  var NEEDED = 25;
  var hits = 0;
  var MAX_HIT = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  var advancing = false;
  var advanceTimer = 0;

  function initRings() {
    rings = [];
    for (var i = 0; i < MAX_RINGS; i++) {
      rings.push({
        r: 60 + i * 64,
        gapStart: Math.random() * Math.PI * 2,
        rotSpeed: (0.8 + Math.random() * 0.6) * (i % 2 === 0 ? 1 : -1)
      });
    }
  }

  function isInGap(ring, angle) {
    var relAngle = ((angle - ring.gapStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return relAngle < GAP_ARC || relAngle > Math.PI * 2 - 0.1;
  }

  game.onTap(function(tx, ty) {
    if (done || advancing) return;

    // Check if ball's angle aligns with the next ring's gap
    var nextRingIdx = ballR;
    if (nextRingIdx >= rings.length) return;

    var ring = rings[nextRingIdx];
    if (isInGap(ring, ballAngle)) {
      // Pass through!
      advancing = true;
      advanceTimer = 0.25;
      passed++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '通過！';
      resultTimer = 0.45;
      game.audio.play('se_success', 0.55);

      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        var bx = CENTER_X + Math.cos(ballAngle) * (ring.r);
        var by = CENTER_Y + Math.sin(ballAngle) * (ring.r);
        particles.push({ x: bx, y: by, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.ballHi });
      }

      ballR++;

      if (ballR >= rings.length) {
        // Completed all rings! Reset
        ballR = 0;
        initRings();
      }

      if (passed >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(passed * 350 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Hit the ring!
      hits++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '衝突！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.4);
      if (hits >= MAX_HIT && !done) {
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

    if (advancing) {
      advanceTimer -= dt;
      if (advanceTimer <= 0) advancing = false;
    }

    // Rotate rings
    var speedMult = 1 + elapsed * 0.015;
    for (var i = 0; i < rings.length; i++) {
      rings[i].gapStart += rings[i].rotSpeed * speedMult * dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw rings (from outer to inner)
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      var ring = rings[ri];
      var inBallRing = ri === ballR;
      var crossed = ri < ballR;

      // Draw the ring as arc (full circle - gap)
      // We draw the ring by drawing many short segments except in the gap
      var numSegs = 60;
      for (var seg = 0; seg < numSegs; seg++) {
        var segAngle = (seg / numSegs) * Math.PI * 2;
        var relA = ((segAngle - ring.gapStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        var inGap = relA < GAP_ARC;
        if (!inGap) {
          var ax1 = CENTER_X + Math.cos(segAngle) * (ring.r - 8);
          var ay1 = CENTER_Y + Math.sin(segAngle) * (ring.r - 8);
          var ax2 = CENTER_X + Math.cos(segAngle + Math.PI * 2 / numSegs) * (ring.r + 8);
          var ay2 = CENTER_Y + Math.sin(segAngle + Math.PI * 2 / numSegs) * (ring.r + 8);
          var alpha = crossed ? 0.3 : (inBallRing ? 0.95 : 0.6);
          game.draw.line(ax1, ay1, ax2, ay2, inBallRing ? C.ringHi : C.ring, inBallRing ? 16 : 12);
        }
      }

      // Gap indicator arrow
      var gapMidAngle = ring.gapStart + GAP_ARC / 2;
      var gx = CENTER_X + Math.cos(gapMidAngle) * ring.r;
      var gy = CENTER_Y + Math.sin(gapMidAngle) * ring.r;
      if (inBallRing) {
        game.draw.circle(gx, gy, 14, C.correct, 0.8);
      }
    }

    // Ball
    var currentRing = ballR < rings.length ? rings[ballR] : null;
    var ballRadius = currentRing ? currentRing.r - 28 : 20;
    var bx2 = CENTER_X + Math.cos(ballAngle) * ballRadius;
    var by2 = CENTER_Y + Math.sin(ballAngle) * ballRadius;
    game.draw.circle(bx2 + 4, by2 + 4, 36, '#000', 0.3);
    game.draw.circle(bx2, by2, 36, C.ball, 0.9);
    game.draw.circle(bx2 - 11, by2 - 11, 13, C.ballHi, 0.5);

    // Tap hint
    var hint = currentRing ? isInGap(currentRing, ballAngle) ? 'NOW!' : 'TAP' : '';
    if (hint === 'NOW!') {
      game.draw.text('NOW!', bx2, by2 - 60, { size: 44, color: C.correct, bold: true });
    } else {
      game.draw.text(hint, W / 2, H * 0.88, { size: 40, color: '#ffffff33' });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.83, { size: 64, color: flashCol, bold: true });
    }

    // Hit indicators
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 44 + hi * 88, H * 0.955, 18, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.ringHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    initRings();
  });
})(game);
