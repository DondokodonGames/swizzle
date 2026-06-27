// 790-echo-chain.js
// エコーチェーン — 光のパターンを覚えて、同じ順序で再現せよ
// 操作: タップ — 表示されたパネルの光の順序を再現
// 成功: 20セット完走  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03060a',
    panelOff:'#0a1520',
    panelOn: '#0ea5e9',
    panelHi: '#7dd3fc',
    panelHit:'#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050a0f'
  };

  var PANEL_COUNT = 4;
  var panelColors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];
  var panelNames = ['赤', '緑', '青', '黄'];

  // Layout: 2×2 grid
  function getPanelRect(idx) {
    var col = idx % 2;
    var row = Math.floor(idx / 2);
    var pw = W * 0.42;
    var ph = W * 0.42;
    var gap = W * 0.04;
    var startX = (W - 2 * pw - gap) / 2;
    var startY = H * 0.32;
    return {
      x: startX + col * (pw + gap),
      y: startY + row * (ph + gap),
      w: pw,
      h: ph,
      cx: startX + col * (pw + gap) + pw / 2,
      cy: startY + row * (ph + gap) + ph / 2
    };
  }

  var sequence = [];
  var sequenceLen = 3;
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_ON = 0.5;
  var SHOW_OFF = 0.2;
  var phase = 'show'; // 'show' | 'input'
  var inputIdx = 0;
  var panelFlash = [-1, 0]; // [panelIdx, timer]
  var litPanel = -1; // currently lit panel during show
  var waitTimer = 0;
  var WAIT_DUR = 0.5;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var particles = [];

  function newSequence() {
    sequenceLen = Math.min(8, 3 + Math.floor(score / 3));
    sequence = [];
    for (var i = 0; i < sequenceLen; i++) {
      sequence.push(Math.floor(Math.random() * PANEL_COUNT));
    }
    showIdx = 0;
    showTimer = 0;
    litPanel = -1;
    phase = 'show';
    inputIdx = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input' || waitTimer > 0) return;
    var hitIdx = -1;
    for (var i = 0; i < PANEL_COUNT; i++) {
      var r = getPanelRect(i);
      if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) return;

    panelFlash[0] = hitIdx;
    panelFlash[1] = 0.25;
    game.audio.play('se_tap', 0.07);

    if (hitIdx === sequence[inputIdx]) {
      inputIdx++;
      if (inputIdx >= sequence.length) {
        // Complete!
        score++;
        flashCol = C.correct;
        flashAnim = 0.22;
        resultText = '正解！';
        resultTimer = 0.4;
        game.audio.play('se_success', 0.65);
        var r2 = getPanelRect(hitIdx);
        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: r2.cx, y: r2.cy, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: panelColors[hitIdx] });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 140); }, 700);
          return;
        }
        waitTimer = WAIT_DUR;
        phase = 'wait';
      }
    } else {
      // Wrong panel
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ちがう！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      waitTimer = WAIT_DUR;
      phase = 'wait';
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

    if (panelFlash[1] > 0) panelFlash[1] -= dt * 4;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newSequence();
    } else if (phase === 'show') {
      showTimer += dt;
      var onOff = SHOW_ON + SHOW_OFF;
      var idx = Math.floor(showTimer / onOff);
      var phaseT = (showTimer % onOff);
      litPanel = (phaseT < SHOW_ON && idx < sequenceLen) ? sequence[idx] : -1;
      if (idx >= sequenceLen && phaseT >= SHOW_OFF) {
        // Done showing
        phase = 'input';
        litPanel = -1;
      }
    } else if (phase === 'wait') {
      // waiting
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Sequence length indicator
    game.draw.text('長さ: ' + sequenceLen, W / 2, H * 0.22, { size: 38, color: C.text + '66' });

    // Panels
    for (var pi = 0; pi < PANEL_COUNT; pi++) {
      var r = getPanelRect(pi);
      var isLit = litPanel === pi;
      var isFlash = panelFlash[0] === pi && panelFlash[1] > 0;
      var col2 = panelColors[pi];
      var alpha = 0.2;
      if (isLit) alpha = 0.9;
      else if (isFlash) alpha = 0.7;

      game.draw.rect(r.x, r.y, r.w, r.h, isLit || isFlash ? col2 : C.panelOff, alpha);
      game.draw.rect(r.x, r.y, r.w, 6, isLit || isFlash ? '#fff' : '#1e2d3d', 0.4);

      // Panel name
      if (!isLit && !isFlash) {
        game.draw.text(panelNames[pi], r.cx, r.cy + 12, { size: 48, color: col2 + '66', bold: true });
      }

      // Glow
      if (isLit) {
        game.draw.circle(r.cx, r.cy, r.w * 0.6, col2, 0.15);
      }
    }

    // Input progress dots
    if (phase === 'input') {
      for (var si = 0; si < sequence.length; si++) {
        var dotX = W / 2 - (sequence.length - 1) * 22 + si * 44;
        game.draw.circle(dotX, H * 0.77, 14, si < inputIdx ? C.correct : '#1e293b', 0.9);
      }
      game.draw.text('タップで再現！', W / 2, H * 0.82, { size: 40, color: C.text + '55' });
    } else if (phase === 'show') {
      game.draw.text('覚えて...', W / 2, H * 0.82, { size: 44, color: C.panelHi + 'aa' });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.24, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 80 + ei * 160, H * 0.955, 28, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newSequence();
  });
})(game);
