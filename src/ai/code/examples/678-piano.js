// 678-piano.js
// ピアノ演奏 — 光る鍵盤の順番を覚えて正確に叩け
// 操作: タップで光った順番通りに鍵盤を叩く
// 成功: 10フレーズ演奏  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var NUM_KEYS = 6;
  var KEY_W = 140;
  var KEY_H = 400;
  var KEY_GAP = 8;
  var KEY_Y = H * 0.45;
  var KEYS_TOTAL = NUM_KEYS * KEY_W + (NUM_KEYS - 1) * KEY_GAP;
  var KEY_X0 = (W - KEYS_TOTAL) / 2;

  var KEY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
  var KEY_HI =    ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#d8b4fe'];
  var KEY_LABELS = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ'];

  var C = {
    bg:     '#050106',
    panel:  '#0d0215',
    keyBg:  '#1a0330',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#0a0112'
  };

  function keyX(i) { return KEY_X0 + i * (KEY_W + KEY_GAP); }

  var sequence = [];
  var seqLen = 3;
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_DUR = 0.45;
  var phase = 'show'; // 'show' | 'input' | 'wait'
  var inputIdx = 0;
  var litKey = -1;
  var tapFlash = [0, 0, 0, 0, 0, 0];

  var phrases = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newSequence() {
    seqLen = Math.min(3 + Math.floor(phrases / 2), 7);
    sequence = [];
    for (var i = 0; i < seqLen; i++) {
      sequence.push(Math.floor(Math.random() * NUM_KEYS));
    }
    showIdx = 0;
    showTimer = 0.55;
    litKey = -1;
    inputIdx = 0;
    phase = 'show';
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    var tappedKey = -1;
    for (var i = 0; i < NUM_KEYS; i++) {
      var kx = keyX(i);
      if (tx >= kx && tx < kx + KEY_W && ty >= KEY_Y && ty < KEY_Y + KEY_H) {
        tappedKey = i;
        break;
      }
    }
    if (tappedKey < 0) return;
    tapFlash[tappedKey] = 0.28;

    if (tappedKey === sequence[inputIdx]) {
      inputIdx++;
      game.audio.play('se_tap', 0.12);
      if (inputIdx >= sequence.length) {
        phrases++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = '完璧！';
        resultTimer = 0.55;
        game.audio.play('se_success', 0.65);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: KEY_Y + KEY_H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: KEY_COLORS[sequence[sequence.length - 1]] });
        }
        if (phrases >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(phrases * 400 + Math.ceil(timeLeft) * 60); }, 700);
        } else {
          phase = 'wait';
          setTimeout(newSequence, 800);
        }
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = 'ミス！';
      resultTimer = 0.55;
      game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        phase = 'wait';
        setTimeout(newSequence, 800);
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
    for (var ti = 0; ti < NUM_KEYS; ti++) {
      if (tapFlash[ti] > 0) tapFlash[ti] -= dt * 4;
    }

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (showIdx < sequence.length) {
          litKey = sequence[showIdx];
          showIdx++;
          showTimer = SHOW_DUR;
        } else {
          litKey = -1;
          phase = 'input';
        }
      } else if (showTimer < 0.12 && showIdx > 0) {
        litKey = -1;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Piano panel
    game.draw.rect(W * 0.04, KEY_Y - 50, W * 0.92, KEY_H + 100, C.panel, 0.9);
    game.draw.rect(W * 0.04, KEY_Y - 50, W * 0.92, 6, '#ffffff18', 0.8);

    // Phase label
    var phaseLabel = phase === 'show' ? '記憶中...' : (phase === 'input' ? 'タップ！' : '...');
    var phaseColor = phase === 'input' ? C.correct : '#ffffff55';
    game.draw.text(phaseLabel, W / 2, KEY_Y - 110, { size: 44, color: phaseColor, bold: true });

    // Sequence progress dots
    for (var si = 0; si < sequence.length; si++) {
      var isPlayed = phase === 'input' && si < inputIdx;
      var isShowing = phase === 'show' && si < showIdx;
      var dotAlpha = isPlayed ? 0.4 : (isShowing && si === showIdx - 1 ? 1.0 : 0.3);
      var dotR = isShowing && si === showIdx - 1 ? 22 : 14;
      var dotCol = isPlayed ? '#334155' : KEY_COLORS[sequence[si]];
      var dotX = W / 2 - (sequence.length - 1) * 36 + si * 72;
      game.draw.circle(dotX, KEY_Y - 160, dotR, dotCol, dotAlpha);
      if (phase === 'input' && si === inputIdx) {
        game.draw.circle(dotX, KEY_Y - 160, 28, '#fff', 0.25);
      }
    }

    // Keys
    for (var ki = 0; ki < NUM_KEYS; ki++) {
      var kx2 = keyX(ki);
      var isLit = ki === litKey;
      var isTap = tapFlash[ki] > 0;
      var kCol = isLit ? KEY_HI[ki] : (isTap ? KEY_HI[ki] : KEY_COLORS[ki]);
      var kAlpha = isLit ? 1.0 : (isTap ? 0.85 : 0.3);

      game.draw.rect(kx2 + 4, KEY_Y + 4, KEY_W, KEY_H, '#000', 0.3);
      game.draw.rect(kx2, KEY_Y, KEY_W, KEY_H, kCol, kAlpha);
      game.draw.rect(kx2, KEY_Y, KEY_W, 12, '#ffffff22', isLit ? 0.6 : 0.3);

      if (isLit) {
        game.draw.rect(kx2 - 6, KEY_Y - 6, KEY_W + 12, KEY_H + 12, kCol, 0.15);
      }

      game.draw.text(KEY_LABELS[ki], kx2 + KEY_W / 2, KEY_Y + KEY_H * 0.84, { size: 38, color: isLit ? '#fff' : '#ffffff44', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 64, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 60 + ei * 120, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(phrases + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
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
