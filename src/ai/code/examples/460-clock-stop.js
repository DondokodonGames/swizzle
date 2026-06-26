// 460-clock-stop.js
// 時計停止 — 秒針が12を指した瞬間にタップ
// 操作: タップで秒針を止める（ぴったり12時を狙う）
// 成功: 5回成功  失敗: 5回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0810',
    clock:  '#1a1830',
    clockHi:'#2d2a50',
    rim:    '#3b3870',
    rimHi:  '#6060b0',
    hand:   '#22d3ee',
    handHi: '#cffafe',
    secondH:'#f43f5e',
    twelve: '#fbbf24',
    twelveHi:'#fef08a',
    tick:   '#475569',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var CX = W / 2;
  var CY = H * 0.43;
  var CLOCK_R = 280;
  var TOLERANCE = 0.06;  // radians ≈ 3.4 degrees

  var secondAngle = 0;
  var secondSpeed = 2.5;  // radians per second initially
  var stopped = false;
  var stopAnim = 0;
  var resultAnim = 0;
  var lastResult = '';
  var lastResultCol = C.correct;
  var particles = [];

  var successes = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;

  function resetHand() {
    secondAngle = Math.random() * Math.PI * 2;
    secondSpeed = 2.5 + successes * 0.3;
    stopped = false;
    stopAnim = 0;
    resultAnim = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || stopped) return;
    stopped = true;
    stopAnim = 0.6;

    // 12 o'clock is at angle = -PI/2 (pointing up)
    // Normalize to 0..2PI
    var norm = ((secondAngle + Math.PI/2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    var distTo12 = Math.min(norm, Math.PI * 2 - norm);

    if (distTo12 < TOLERANCE) {
      successes++;
      lastResult = 'ぴったり！';
      lastResultCol = C.correct;
      flashCol = C.correct;
      flashAnim = 0.8;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY - CLOCK_R * 0.8, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life: 0.7, col: C.twelveHi });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(successes * 600 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
    } else {
      misses++;
      lastResult = 'ズレてる！';
      lastResultCol = C.wrong;
      flashCol = C.wrong;
      flashAnim = 0.6;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    resultAnim = 1.0;
    setTimeout(function() { resetHand(); }, 900);
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
    if (stopAnim > 0) stopAnim -= dt * 3;
    if (resultAnim > 0) resultAnim -= dt * 2;

    if (!stopped) {
      secondAngle += secondSpeed * dt;
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

    // Clock face
    game.draw.circle(CX, CY, CLOCK_R + 20, C.rim, 0.3);
    game.draw.circle(CX, CY, CLOCK_R + 10, C.rim, 0.6);
    game.draw.circle(CX, CY, CLOCK_R, C.clock, 0.95);

    // Tick marks
    for (var ti = 0; ti < 60; ti++) {
      var ta = ti * Math.PI / 30 - Math.PI / 2;
      var isHour = ti % 5 === 0;
      var tickR1 = CLOCK_R - (isHour ? 28 : 16);
      var tickR2 = CLOCK_R - 6;
      var tx2 = CX + Math.cos(ta);
      var ty2 = CY + Math.sin(ta);
      game.draw.line(CX + Math.cos(ta)*tickR1, CY + Math.sin(ta)*tickR1,
                     CX + Math.cos(ta)*tickR2, CY + Math.sin(ta)*tickR2,
                     isHour ? C.rimHi : C.tick, isHour ? 6 : 3);
    }

    // 12 highlight
    var twelveX = CX;
    var twelveY = CY - CLOCK_R + 40;
    game.draw.circle(twelveX, twelveY, 32, C.twelve, 0.9);
    game.draw.text('12', twelveX, twelveY + 14, { size: 36, color: '#000', bold: true });

    // Hour and minute hands (decorative, fixed)
    game.draw.line(CX, CY, CX + Math.cos(-Math.PI/2) * CLOCK_R*0.45, CY + Math.sin(-Math.PI/2) * CLOCK_R*0.45, C.hand, 16);
    game.draw.line(CX, CY, CX + Math.cos(-Math.PI/2 + 0.8) * CLOCK_R*0.65, CY + Math.sin(-Math.PI/2 + 0.8) * CLOCK_R*0.65, C.hand, 10);

    // Second hand
    var sAngle = secondAngle - Math.PI/2;
    var sLen = CLOCK_R * 0.88;
    var sTipX = CX + Math.cos(sAngle) * sLen;
    var sTipY = CY + Math.sin(sAngle) * sLen;
    var sTailX = CX - Math.cos(sAngle) * sLen * 0.18;
    var sTailY = CY - Math.sin(sAngle) * sLen * 0.18;
    game.draw.line(sTailX, sTailY, sTipX, sTipY, C.secondH, 5);
    game.draw.circle(CX, CY, 18, C.clockHi, 0.9);
    game.draw.circle(CX, CY, 10, C.secondH, 1.0);

    // Stop flash
    if (stopAnim > 0) {
      game.draw.circle(sTipX, sTipY, 24, C.secondH, stopAnim * 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Result text
    if (resultAnim > 0 && lastResult) {
      game.draw.text(lastResult, W/2, H * 0.75, { size: 56, color: lastResultCol, bold: true });
    }

    // Speed indicator
    var speedLabel = secondSpeed < 3 ? '普通' : secondSpeed < 4 ? '速い' : 'とても速い！';
    game.draw.text('速度: ' + speedLabel, W/2, H * 0.87, { size: 38, color: C.ui });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hand : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    resetHand();
  });
})(game);
