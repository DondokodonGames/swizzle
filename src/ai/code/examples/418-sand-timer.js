// 418-sand-timer.js
// 砂時計 — 砂が落ちきる瞬間にタップする完璧なタイミング
// 操作: タップで砂時計をひっくり返す
// 成功: 5回連続で砂が落ちきった0.5秒以内にタップ  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0a1a',
    glass:  '#94a3b8',
    glassHi:'#e2e8f0',
    sand:   '#f59e0b',
    sandHi: '#fcd34d',
    sandLo: '#92400e',
    frame:  '#78716c',
    frameHi:'#d6d3d1',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FLIP_DURATION = 5 + Math.random() * 3;  // randomized each turn
  var PERFECT_WINDOW = 0.5;  // seconds after empty
  var sandLevel = 1.0;  // 1.0 = full top, 0.0 = empty top
  var flipping = false;
  var flipAnim = 0;  // 0-1 rotation animation
  var phase = 'running';  // running, empty, wait
  var emptyTimer = 0;
  var successes = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var wobble = 0;

  function startNewRound() {
    FLIP_DURATION = 4 + Math.random() * 4;
    sandLevel = 1.0;
    flipping = false;
    flipAnim = 0;
    phase = 'running';
    emptyTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (phase === 'running') {
      // Too early — miss
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.6;
      wobble = 1.0;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    } else if (phase === 'empty') {
      // Perfect timing!
      if (emptyTimer <= PERFECT_WINDOW) {
        successes++;
        flashCol = C.correct;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 15; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W/2, y: H/2, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180-60, life: 0.7, col: C.sandHi });
        }
        if (successes >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(successes * 500 + Math.ceil(timeLeft) * 80); }, 600);
          return;
        }
        // Flip it back over
        flipping = true;
        flipAnim = 0;
        setTimeout(function() {
          flipping = false;
          flipAnim = 0;
          startNewRound();
        }, 400);
        phase = 'flipping';
      } else {
        // Waited too long
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.4);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        startNewRound();
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (wobble > 0) wobble -= dt * 4;

    if (phase === 'running') {
      sandLevel -= dt / FLIP_DURATION;
      if (sandLevel <= 0) {
        sandLevel = 0;
        phase = 'empty';
        emptyTimer = 0;
        game.audio.play('se_tap', 0.15);
      }
    } else if (phase === 'empty') {
      emptyTimer += dt;
      if (emptyTimer > PERFECT_WINDOW + 1.5) {
        // Miss — waited too long without tapping
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.4);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        startNewRound();
      }
    } else if (phase === 'flipping') {
      flipAnim = Math.min(1, flipAnim + dt * 4);
    }

    if (flipping) flipAnim = Math.min(1, flipAnim + dt * 4);

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var cx = W / 2;
    var cy = H / 2;
    var wobbleX = Math.sin(wobble * 20) * wobble * 30;

    // Hourglass frame
    var glW = 240;
    var glH = 400;
    var glX = cx - glW/2 + wobbleX;
    var glY = cy - glH/2;

    // Top glass bulb (trapezoid approximated with rects+circles)
    game.draw.rect(glX + 30, glY, glW - 60, glH/2, C.glass, 0.15);
    game.draw.circle(glX + glW/2, glY + 30, 90, C.glass, 0.15);
    game.draw.circle(glX + glW/2, glY + glH/2, 20, C.glass, 0.3);

    // Bottom glass bulb
    game.draw.rect(glX + 30, glY + glH/2, glW - 60, glH/2, C.glass, 0.15);
    game.draw.circle(glX + glW/2, glY + glH - 30, 90, C.glass, 0.15);

    // Sand in top
    if (sandLevel > 0) {
      var topSandH = (glH/2 - 40) * sandLevel;
      var topSandY = glY + 40 + (glH/2 - 40) * (1 - sandLevel);
      game.draw.rect(glX + 40, topSandY, glW - 80, topSandH, C.sand, 0.85);
      game.draw.rect(glX + 40, topSandY, glW - 80, 8, C.sandHi, 0.5);
    }

    // Sand in bottom
    var botSandH = (glH/2 - 40) * (1 - sandLevel);
    var botSandY = glY + glH/2 + glH/2 - 40 - botSandH;
    if (botSandH > 0) {
      game.draw.rect(glX + 40, botSandY, glW - 80, botSandH, C.sandLo, 0.85);
      game.draw.rect(glX + 40, botSandY, glW - 80, 8, C.sand, 0.4);
    }

    // Falling sand stream (thin line through neck)
    if (phase === 'running' && sandLevel > 0.01) {
      var neckY = cy;
      game.draw.line(cx + wobbleX, neckY - 10, cx + wobbleX, neckY + 15, C.sand, 4);
      game.draw.circle(cx + wobbleX, neckY + 15, 5, C.sand, 0.8);
    }

    // Frame bars (top and bottom)
    game.draw.rect(glX + 10, glY - 20, glW - 20, 20, C.frame, 0.9);
    game.draw.rect(glX + 10, glY + glH, glW - 20, 20, C.frame, 0.9);
    game.draw.line(glX + 30, glY - 10, glX + 30, glY + glH + 10, C.frameHi, 6);
    game.draw.line(glX + glW - 30, glY - 10, glX + glW - 30, glY + glH + 10, C.frameHi, 6);

    // Glass highlight
    game.draw.circle(glX + glW/2 - 30, glY + 50, 25, '#fff', 0.08);
    game.draw.circle(glX + glW/2 - 20, glY + glH - 50, 20, '#fff', 0.06);

    // Phase indicator
    if (phase === 'empty') {
      var urgency = Math.min(1, emptyTimer / PERFECT_WINDOW);
      var pulseR = 100 + Math.sin(elapsed * 10) * 20;
      game.draw.circle(cx, cy, pulseR, urgency > 0.8 ? C.wrong : C.correct, 0.2 * (1 - urgency * 0.5));
      game.draw.text('タップ！', cx, cy - glH/2 - 80, { size: 64, color: C.sandHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Success dots
    for (var si = 0; si < NEEDED; si++) {
      game.draw.circle(W/2 - (NEEDED-1)*44 + si*88, H*0.84, 22, si < successes ? C.correct : C.ui, 0.9);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.92, 16, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sandHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    startNewRound();
  });
})(game);
