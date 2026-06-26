// 472-thread-needle.js
// 糸通し — 揺れ動く針の穴に糸を通すタイミングゲーム
// 操作: タップで糸を前進させる（穴の位置に合わせて）
// 成功: 10回通す  失敗: 5回外す or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0810',
    needle: '#94a3b8',
    needleHi: '#e2e8f0',
    hole:   '#1e1030',
    thread: '#f59e0b',
    threadHi: '#fde68a',
    success2: '#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    trail:  '#7c5e1a'
  };

  var NEEDLE_X = W / 2;
  var NEEDLE_Y_CENTER = H * 0.45;
  var NEEDLE_LENGTH = 500;
  var HOLE_RADIUS = 36;
  var HOLE_HEIGHT = 72;

  var needleAngle = 0;
  var needleAngVel = 0.8;  // radians/sec oscillation
  var needleAmpMax = 0.6;
  var needlePhase = 0;
  var needleAmplitude = 0.25;

  var thread = { y: H * 0.82, advancing: false, speed: 600 };
  var threadTrail = [];

  var successes = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.success2;
  var roundActive = true;

  function resetThread() {
    thread.y = H * 0.82;
    thread.advancing = false;
    threadTrail = [];
    roundActive = true;
  }

  function getNeedleHoleY() {
    // Hole is near the tip of the needle (top end)
    return NEEDLE_Y_CENTER - Math.cos(needlePhase) * needleAmplitude * NEEDLE_LENGTH / 2 * 0.7 - NEEDLE_LENGTH * 0.4;
  }

  game.onTap(function(tx, ty) {
    if (done || !roundActive || thread.advancing) return;
    thread.advancing = true;
    game.audio.play('se_tap', 0.4);
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

    // Oscillate needle
    needlePhase += dt * (1.5 + successes * 0.12);
    var targetAmp = Math.min(needleAmpMax, 0.25 + successes * 0.04);
    needleAmplitude += (targetAmp - needleAmplitude) * dt * 2;

    if (resultAnim > 0) resultAnim -= dt * 2;

    // Thread movement
    if (thread.advancing) {
      thread.y -= thread.speed * dt;
      threadTrail.push({ x: W / 2, y: thread.y, life: 0.8 });

      // Check if thread reached needle level
      var holeY = getNeedleHoleY();
      var holeX = NEEDLE_X + Math.sin(needlePhase) * needleAmplitude * NEEDLE_LENGTH * 0.3;

      if (thread.y <= holeY + HOLE_RADIUS && thread.y >= holeY - HOLE_RADIUS) {
        // Check horizontal alignment
        var dist = Math.abs(W / 2 - holeX);
        if (dist < HOLE_RADIUS * 1.2) {
          // Success!
          successes++;
          resultText = '通った！';
          resultCol = C.success2;
          resultAnim = 1.0;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: holeX, y: holeY, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6, col: C.threadHi });
          }
          if (successes >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(successes * 500 + Math.ceil(timeLeft) * 100); }, 700);
          } else {
            setTimeout(function() { if (!done) resetThread(); }, 600);
            roundActive = false;
          }
        } else {
          // Miss — thread hit needle body
          misses++;
          resultText = 'はずれ！';
          resultCol = C.wrong;
          resultAnim = 1.0;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(function() { if (!done) resetThread(); }, 600);
            roundActive = false;
          }
        }
        thread.advancing = false;
      }

      // Thread went past needle — miss
      if (thread.y < NEEDLE_Y_CENTER - NEEDLE_LENGTH * 0.6) {
        misses++;
        resultText = '逃げた！';
        resultCol = C.wrong;
        resultAnim = 1.0;
        game.audio.play('se_failure', 0.4);
        thread.advancing = false;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          setTimeout(function() { if (!done) resetThread(); }, 600);
          roundActive = false;
        }
      }
    }

    // Trail decay
    for (var ti = threadTrail.length - 1; ti >= 0; ti--) {
      threadTrail[ti].life -= dt * 2;
      if (threadTrail[ti].life <= 0) threadTrail.splice(ti, 1);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Needle
    var holeXd = NEEDLE_X + Math.sin(needlePhase) * needleAmplitude * NEEDLE_LENGTH * 0.3;
    var holeYd = getNeedleHoleY();
    var needleTopX = NEEDLE_X + Math.sin(needlePhase) * needleAmplitude * NEEDLE_LENGTH * 0.5;
    var needleTopY = NEEDLE_Y_CENTER - Math.cos(needlePhase) * needleAmplitude * NEEDLE_LENGTH * 0.7 - NEEDLE_LENGTH * 0.3;
    var needleBotX = NEEDLE_X - Math.sin(needlePhase) * needleAmplitude * NEEDLE_LENGTH * 0.5;
    var needleBotY = NEEDLE_Y_CENTER + Math.cos(needlePhase) * needleAmplitude * NEEDLE_LENGTH * 0.7 + NEEDLE_LENGTH * 0.1;

    game.draw.line(needleBotX, needleBotY, needleTopX, needleTopY, C.needle, 18);
    game.draw.line(needleBotX, needleBotY, needleTopX, needleTopY, C.needleHi, 6);

    // Hole (draw as gap)
    game.draw.circle(holeXd, holeYd, HOLE_RADIUS + 8, C.bg, 1.0);
    game.draw.circle(holeXd, holeYd, HOLE_RADIUS, C.hole, 1.0);
    game.draw.circle(holeXd, holeYd, HOLE_RADIUS - 8, '#000', 1.0);

    // Thread trail
    for (var ti2 = 0; ti2 < threadTrail.length; ti2++) {
      var tr = threadTrail[ti2];
      game.draw.circle(tr.x, tr.y, 8 * tr.life, C.trail, tr.life * 0.6);
    }

    // Thread head
    if (roundActive || thread.advancing) {
      game.draw.circle(W / 2, thread.y, 14, C.threadHi, 0.9);
      game.draw.circle(W / 2, thread.y, 8, C.thread, 1.0);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result feedback
    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.78, { size: 72, color: resultCol, bold: true });
    }

    // Tap hint
    if (roundActive && !thread.advancing) {
      var blink = Math.sin(elapsed * 5) * 0.4 + 0.6;
      game.draw.text('タップ！', W / 2, H * 0.88, { size: 56, color: C.thread });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 50 + mi * 100, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.thread : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
  });
})(game);
