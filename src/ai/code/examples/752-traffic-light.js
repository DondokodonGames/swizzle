// 752-traffic-light.js
// 信号機 — 青信号が点灯した瞬間だけタップせよ。赤・黄色はタップ禁止
// 操作: タップ — 青のときだけ
// 成功: 40回青でタップ  失敗: 10回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0c0c',
    housing: '#1a1a1a',
    rim:     '#2a2a2a',
    red:     '#ef4444',
    redOff:  '#3d0f0f',
    yellow:  '#fbbf24',
    yellowOff:'#3d2e06',
    green:   '#22c55e',
    greenOff:'#0a2e14',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#181818'
  };

  var PHASE_R = 0; // red
  var PHASE_Y = 1; // yellow
  var PHASE_G = 2; // green
  var phase = PHASE_R;
  var phaseTimer = 0;

  var PHASE_DURATIONS = [0.9, 0.5, 0.8]; // seconds each phase
  var answered = false;
  var waitTimer = 0;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  var CX = W / 2;
  var LIGHT_CY = H * 0.42;
  var LIGHT_R = 72;
  var LIGHT_GAP = 190;

  function nextPhase() {
    phase = (phase + 1) % 3;
    var baseDur = PHASE_DURATIONS[phase];
    // Green gets shorter over time
    if (phase === PHASE_G) baseDur = Math.max(0.45, 0.8 - score * 0.01);
    if (phase === PHASE_R) baseDur = Math.max(0.55, 0.9 - score * 0.008);
    phaseTimer = baseDur;
    answered = false;
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0 || answered) return;
    if (phase === PHASE_G) {
      score++;
      answered = true;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = '青！GO！';
      resultTimer = 0.35;
      game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: LIGHT_CY + LIGHT_GAP, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.35, col: C.green });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 120); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = phase === PHASE_R ? '赤だ！STOP！' : '黄色！危険！';
      resultTimer = 0.42;
      game.audio.play('se_failure', 0.3);
      answered = true;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      return;
    }

    phaseTimer -= dt;
    if (phaseTimer <= 0) {
      // Check if green was missed
      if (phase === PHASE_G && !answered) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.22;
        resultText = '見逃した！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.18);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }
      nextPhase();
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var redY    = LIGHT_CY - LIGHT_GAP;
    var yellowY = LIGHT_CY;
    var greenY  = LIGHT_CY + LIGHT_GAP;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Pole
    game.draw.rect(CX - 12, LIGHT_CY + LIGHT_GAP + LIGHT_R, 24, H * 0.28, C.rim, 0.9);

    // Housing
    var boxH = LIGHT_GAP * 2 + LIGHT_R * 2 + 40;
    game.draw.rect(CX - LIGHT_R - 24, redY - LIGHT_R - 20, (LIGHT_R + 24) * 2, boxH, C.housing, 0.95);
    game.draw.rect(CX - LIGHT_R - 24, redY - LIGHT_R - 20, (LIGHT_R + 24) * 2, 8, C.rim, 0.5);

    // Lights
    var rGlow = phase === PHASE_R ? (0.8 + 0.2 * Math.sin(elapsed * 6)) : 0;
    var yGlow = phase === PHASE_Y ? (0.8 + 0.2 * Math.sin(elapsed * 8)) : 0;
    var gGlow = phase === PHASE_G ? (0.85 + 0.15 * Math.sin(elapsed * 5)) : 0;

    // Glow effects
    if (rGlow > 0) game.draw.circle(CX, redY, LIGHT_R + 30, C.red, rGlow * 0.15);
    if (yGlow > 0) game.draw.circle(CX, yellowY, LIGHT_R + 30, C.yellow, yGlow * 0.15);
    if (gGlow > 0) game.draw.circle(CX, greenY, LIGHT_R + 30, C.green, gGlow * 0.2);

    game.draw.circle(CX, redY,    LIGHT_R, phase === PHASE_R    ? C.red    : C.redOff,    phase === PHASE_R    ? 0.9 : 0.9);
    game.draw.circle(CX, yellowY, LIGHT_R, phase === PHASE_Y    ? C.yellow : C.yellowOff, phase === PHASE_Y    ? 0.9 : 0.9);
    game.draw.circle(CX, greenY,  LIGHT_R, phase === PHASE_G    ? C.green  : C.greenOff,  phase === PHASE_G    ? 0.9 : 0.9);
    // Shine
    game.draw.circle(CX - LIGHT_R * 0.28, redY    - LIGHT_R * 0.28, LIGHT_R * 0.22, '#fff', phase === PHASE_R ? 0.35 : 0.08);
    game.draw.circle(CX - LIGHT_R * 0.28, yellowY - LIGHT_R * 0.28, LIGHT_R * 0.22, '#fff', phase === PHASE_Y ? 0.35 : 0.08);
    game.draw.circle(CX - LIGHT_R * 0.28, greenY  - LIGHT_R * 0.28, LIGHT_R * 0.22, '#fff', phase === PHASE_G ? 0.35 : 0.08);

    var label = phase === PHASE_G ? '青！タップ！' : (phase === PHASE_R ? '赤 — 待て' : '黄 — 待て');
    var labelCol = phase === PHASE_G ? C.green : (phase === PHASE_R ? C.red : C.yellow);
    game.draw.text(label, CX, H * 0.83, { size: phase === PHASE_G ? 56 : 42, color: labelCol, bold: phase === PHASE_G });

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, CX, H * 0.88, { size: 50, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    phase = PHASE_R;
    phaseTimer = 1.0;
  });
})(game);
