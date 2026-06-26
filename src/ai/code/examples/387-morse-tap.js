// 387-morse-tap.js
// モールスタップ — 左=ドット、右=ダッシュ、中央=送信でモールス符号入力
// 操作: 左タップ=・、右タップ=ー、中央=送信
// 成功: 5文字正解  失敗: 3回間違える or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a18',
    panel:  '#1e1b4b',
    panelHi:'#312e81',
    dot:    '#fbbf24',
    dotHi:  '#fef3c7',
    dash:   '#3b82f6',
    dashHi: '#93c5fd',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var MORSE = {
    'S': '...',  'O': '---', 'H': '....', 'I': '..',
    'A': '.-',   'T': '-',   'N': '-.',   'E': '.',
    'R': '.-.',  'M': '--'
  };

  var TARGETS = ['S','O','S','H','I'];
  var targetIdx = 0;
  var tapHistory = [];
  var correct = 0;
  var NEEDED = 5;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var resultText = '';
  var autoSubmitTimer = 0;
  var AUTO_SUBMIT = 2.0;

  function getCurrentTarget() { return TARGETS[targetIdx % TARGETS.length]; }

  function submit() {
    var answer = tapHistory.join('');
    var target = MORSE[getCurrentTarget()];
    tapHistory = [];
    autoSubmitTimer = 0;
    if (answer === target) {
      correct++;
      resultText = '正解！';
      flashCol = C.correct;
      flashAnim = 0.8;
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.6, col: C.dotHi });
      }
      targetIdx++;
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 600 + Math.ceil(timeLeft) * 80); }, 800);
      }
    } else {
      wrong++;
      resultText = '不正解 ' + answer + ' ≠ ' + target;
      flashCol = C.wrong;
      flashAnim = 0.8;
      game.audio.play('se_failure', 0.4);
      if (wrong >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty > H * 0.68) {
      // Bottom row buttons
      if (tx < W / 3) {
        // Dot
        tapHistory.push('.');
        autoSubmitTimer = 0;
        game.audio.play('se_tap', 0.3);
      } else if (tx > W * 2 / 3) {
        // Dash
        tapHistory.push('-');
        autoSubmitTimer = 0;
        game.audio.play('se_tap', 0.5);
      } else {
        // Submit
        if (tapHistory.length > 0) submit();
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Auto-submit after idle
    if (tapHistory.length > 0) {
      autoSubmitTimer += dt;
      if (autoSubmitTimer >= AUTO_SUBMIT) submit();
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target letter big
    var target = getCurrentTarget();
    var targetMorse = MORSE[target];
    game.draw.text(target, W / 2, H * 0.24, { size: 200, color: C.dotHi, bold: true });

    // Target morse code display
    var mxStart = W / 2 - (targetMorse.length * 50) / 2;
    for (var mi = 0; mi < targetMorse.length; mi++) {
      var sym = targetMorse[mi];
      var mx = mxStart + mi * 50 + 25;
      if (sym === '.') {
        game.draw.circle(mx, H * 0.42, 16, C.dot, 0.9);
      } else {
        game.draw.rect(mx - 28, H * 0.42 - 10, 56, 20, C.dash, 0.9);
      }
    }

    // Input display
    game.draw.rect(60, H * 0.52, W - 120, 100, C.panel, 0.8);
    var ixStart = 100;
    for (var ic = 0; ic < tapHistory.length; ic++) {
      if (tapHistory[ic] === '.') {
        game.draw.circle(ixStart + ic * 56, H * 0.52 + 50, 18, C.dot, 0.9);
      } else {
        game.draw.rect(ixStart + ic * 56 - 28, H * 0.52 + 38, 56, 24, C.dash, 0.9);
      }
    }
    if (tapHistory.length === 0) {
      game.draw.text('入力してください', W/2, H*0.52+56, { size: 36, color: C.ui });
    }

    // Button row
    var btnY = H * 0.7;
    var btnH = 180;
    // Dot button
    game.draw.rect(0, btnY, W / 3, btnH, C.panel, 0.85);
    game.draw.circle(W / 6, btnY + btnH / 2, 32, C.dot, 0.9);
    game.draw.text('・', W / 6, btnY + btnH / 2 + 12, { size: 56 });

    // Submit button
    game.draw.rect(W / 3, btnY, W / 3, btnH, C.panelHi, 0.85);
    game.draw.text('送信', W / 2, btnY + btnH / 2 + 16, { size: 52, color: C.correct, bold: true });

    // Dash button
    game.draw.rect(W * 2 / 3, btnY, W / 3, btnH, C.panel, 0.85);
    game.draw.rect(W * 5 / 6 - 36, btnY + btnH / 2 - 12, 72, 24, C.dash, 0.9);
    game.draw.text('ー', W * 5 / 6, btnY + btnH / 2 + 12, { size: 56 });

    // Auto-submit indicator
    if (tapHistory.length > 0) {
      var prog2 = autoSubmitTimer / AUTO_SUBMIT;
      game.draw.rect(60, H * 0.64, (W - 120) * prog2, 8, C.dashHi, 0.7);
    }

    // Flash
    if (flashAnim > 0) {
      game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
      game.draw.text(resultText, W / 2, H * 0.62, { size: 44, color: flashCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Mistake dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2 - (MAX_WRONG-1)*40 + wi*80, H*0.935, 16, wi < wrong ? C.wrong : C.panel, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dash : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
