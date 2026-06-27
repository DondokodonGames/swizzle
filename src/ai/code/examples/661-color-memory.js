// 661-color-memory.js
// 色彩記憶 — 光った順番を覚えてタップで再現せよ
// 操作: タップで色を選ぶ
// 成功: 10ラウンドクリア  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03040a',
    panel:   '#0a0c14',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#06070f'
  };

  var COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];
  var LABELS = ['赤', '青', '黄', '緑'];
  var NUM = 4;

  var BTN_SIZE = 200;
  var BTN_GAP = 24;
  var BTN_TOTAL = NUM * BTN_SIZE + (NUM - 1) * BTN_GAP;
  var BTN_START_X = (W - BTN_TOTAL) / 2;
  var BTN_Y = H * 0.74;

  var sequence = [];
  var round = 0;
  var NEEDED_ROUNDS = 10;
  var phase = 'idle'; // idle | show | pause | recall
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_DUR = 0.55;
  var PAUSE_DUR = 0.5;
  var recallIdx = 0;
  var flashIdx = -1;
  var flashTimer = 0;

  var correct = 0;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function startRound() {
    var seqLen = Math.min(3 + round, 8);
    sequence = [];
    for (var i = 0; i < seqLen; i++) {
      sequence.push(Math.floor(Math.random() * NUM));
    }
    phase = 'show';
    showIdx = 0;
    showTimer = SHOW_DUR;
    recallIdx = 0;
    flashIdx = sequence[0];
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'recall') return;
    var hitIdx = -1;
    for (var i = 0; i < NUM; i++) {
      var bx = BTN_START_X + i * (BTN_SIZE + BTN_GAP);
      if (tx >= bx && tx <= bx + BTN_SIZE && ty >= BTN_Y && ty <= BTN_Y + BTN_SIZE) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) return;

    flashIdx = hitIdx;
    flashTimer = 0.2;

    if (hitIdx === sequence[recallIdx]) {
      recallIdx++;
      game.audio.play('se_tap', 0.15);
      if (recallIdx >= sequence.length) {
        correct++;
        round++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = 'パーフェクト！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.6);
        phase = 'idle';
        if (round >= NEEDED_ROUNDS && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 60); }, 700);
        } else {
          setTimeout(startRound, 900);
        }
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '違う！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      phase = 'idle';
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        setTimeout(startRound, 900);
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
    if (flashTimer > 0) flashTimer -= dt;

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        showIdx++;
        if (showIdx >= sequence.length) {
          phase = 'pause';
          showTimer = PAUSE_DUR;
          flashIdx = -1;
        } else {
          showTimer = SHOW_DUR;
          flashIdx = sequence[showIdx];
          game.audio.play('se_tap', 0.1);
        }
      }
    } else if (phase === 'pause') {
      showTimer -= dt;
      if (showTimer <= 0) {
        phase = 'recall';
        flashIdx = -1;
      }
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Phase label
    var phaseLabel = phase === 'show' ? '覚えて！' : (phase === 'recall' ? 'タップ！' : '');
    if (phaseLabel) {
      game.draw.text(phaseLabel, W / 2, H * 0.35, { size: 60, color: phase === 'recall' ? '#a78bfa' : C.text, bold: true });
    }

    // Sequence progress (recall phase)
    if (phase === 'recall') {
      for (var si = 0; si < sequence.length; si++) {
        var sx = W / 2 - sequence.length * 28 + si * 56;
        var sDone = si < recallIdx;
        game.draw.circle(sx, H * 0.44, 20, sDone ? COLORS[sequence[si]] : '#ffffff22', 0.9);
      }
    }

    // Show big flash during show phase
    if (phase === 'show' && flashIdx >= 0) {
      game.draw.circle(W / 2, H * 0.5, 180, COLORS[flashIdx], 0.3);
      game.draw.circle(W / 2, H * 0.5, 130, COLORS[flashIdx], 0.5);
      game.draw.text(LABELS[flashIdx], W / 2, H * 0.5 + 20, { size: 80, color: '#fff', bold: true });
    }

    // Color buttons
    for (var bi = 0; bi < NUM; bi++) {
      var bx2 = BTN_START_X + bi * (BTN_SIZE + BTN_GAP);
      var isFlash = flashIdx === bi && (phase === 'show' || (flashTimer > 0));
      var alpha = isFlash ? 0.95 : 0.55;
      var sz = isFlash ? BTN_SIZE + 16 : BTN_SIZE;
      var ox = isFlash ? -8 : 0;
      game.draw.rect(bx2 + ox + 5, BTN_Y + 5, sz, sz, '#000', 0.3);
      game.draw.rect(bx2 + ox, BTN_Y, sz, sz, COLORS[bi], alpha);
      game.draw.text(LABELS[bi], bx2 + ox + BTN_SIZE / 2, BTN_Y + BTN_SIZE / 2 + 14, { size: 44, color: '#fff', bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.64, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED_ROUNDS, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    setTimeout(startRound, 600);
  });
})(game);
