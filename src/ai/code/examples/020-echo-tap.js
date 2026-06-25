// 020-echo-tap.js
// エコータップ — 響いたリズムを完璧に返す音楽の快感
// 操作: 光ったリズムパターンをタップで再現
// 成功: 3パターン完璧に  失敗: 間違い or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0714',
    pad:     '#120e20',
    padEdge: '#1e1a30',
    lit:     '#c084fc',
    litHi:   '#e9d5ff',
    hit:     '#22c55e',
    miss:    '#ef4444',
    ui:      '#475569'
  };

  // 4 large pads arranged in 2x2
  var PAD_SIZE = 420;
  var PAD_GAP = 20;
  var PADS_X = (W - (PAD_SIZE * 2 + PAD_GAP)) / 2;
  var PADS_Y = H * 0.3;

  var PADS = [
    { x: PADS_X,                  y: PADS_Y,            color: '#818cf8' }, // top-left
    { x: PADS_X + PAD_SIZE + PAD_GAP, y: PADS_Y,        color: '#c084fc' }, // top-right
    { x: PADS_X,                  y: PADS_Y + PAD_SIZE + PAD_GAP, color: '#f472b6' }, // bot-left
    { x: PADS_X + PAD_SIZE + PAD_GAP, y: PADS_Y + PAD_SIZE + PAD_GAP, color: '#fb923c' } // bot-right
  ];

  var round = 0;
  var needed = 3;
  var timeLeft = 25;
  var done = false;

  var phase = 'show';   // 'show' | 'input' | 'feedback'
  var sequence = [];     // pattern to remember (pad indices 0-3)
  var playerSeq = [];
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_ON = 0.5;    // how long each pad lights
  var SHOW_OFF = 0.25;  // gap between pads
  var activePad = -1;
  var feedbackTimer = 0;
  var feedbackOk = false;

  function buildSequence() {
    // Round 1: 3 beats, Round 2: 4 beats, Round 3: 5 beats
    var len = 3 + round;
    var seq = [];
    for (var i = 0; i < len; i++) {
      seq.push(Math.floor(Math.random() * 4));
    }
    return seq;
  }

  function startRound() {
    sequence = buildSequence();
    playerSeq = [];
    showIdx = 0;
    showTimer = 0.6; // lead-in delay
    activePad = -1;
    phase = 'show';
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'input') return;

    // Which pad was tapped?
    var tapped = -1;
    for (var i = 0; i < 4; i++) {
      var p = PADS[i];
      if (x >= p.x && x < p.x + PAD_SIZE && y >= p.y && y < p.y + PAD_SIZE) {
        tapped = i;
        break;
      }
    }
    if (tapped === -1) return;

    var expected = sequence[playerSeq.length];
    playerSeq.push(tapped);
    activePad = tapped;

    if (tapped !== expected) {
      feedbackOk = false;
      feedbackTimer = 0.8;
      phase = 'feedback';
      game.audio.play('se_failure', 0.7);
      done = true;
      setTimeout(function() { game.end.failure(); }, 900);
      return;
    }

    game.audio.play('se_tap', 0.7 + tapped * 0.07);

    if (playerSeq.length >= sequence.length) {
      // Round complete
      round++;
      feedbackOk = true;
      feedbackTimer = 0.7;
      phase = 'feedback';
      game.audio.play('se_success', 0.8);
      if (round >= needed) {
        done = true;
        setTimeout(function() {
          game.end.success(round * 40 + Math.ceil(timeLeft) * 5);
        }, 800);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (activePad >= 0) {
          // just turned off
          activePad = -1;
          if (showIdx >= sequence.length) {
            phase = 'input';
          } else {
            showTimer = SHOW_ON;
            activePad = sequence[showIdx];
            showIdx++;
            game.audio.play('se_tap', 0.6);
          }
        } else {
          // turn on next
          if (showIdx < sequence.length) {
            activePad = sequence[showIdx];
            showIdx++;
            showTimer = SHOW_ON;
            game.audio.play('se_tap', 0.6);
          } else {
            phase = 'input';
          }
        }
      } else if (activePad >= 0 && showTimer < SHOW_OFF) {
        activePad = -1;
        showTimer = SHOW_OFF;
      }
    } else if (phase === 'input') {
      // brief flash on tap
      if (activePad >= 0 && showTimer <= 0) {
        activePad = -1;
      }
      showTimer -= dt;
    } else if (phase === 'feedback') {
      feedbackTimer -= dt;
      if (feedbackTimer <= 0 && !done) {
        startRound();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0d0a18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Round pips
    for (var r = 0; r < needed; r++) {
      var rx = W / 2 + (r - (needed - 1) / 2) * 80;
      game.draw.circle(rx, 128, 26, r < round ? C.hit : C.pad);
      if (r < round) game.draw.circle(rx, 128, 14, '#fff', 0.5);
    }

    // Phase label
    var phaseLabel = phase === 'show' ? '覚えろ！' : (phase === 'input' ? '再現しろ！' : '');
    if (phaseLabel) {
      game.draw.text(phaseLabel, W / 2, 210, { size: 56, color: C.lit, bold: phase === 'show' });
    }

    // Sequence progress in input phase
    if (phase === 'input') {
      game.draw.text(playerSeq.length + ' / ' + sequence.length, W / 2, 210, {
        size: 52, color: '#a78bfa', bold: true
      });
    }

    // Pads
    for (var p = 0; p < 4; p++) {
      var pad = PADS[p];
      var isActive = p === activePad;
      var bgColor = isActive ? pad.color : C.pad;
      var alpha = isActive ? 1.0 : 1.0;

      // shadow
      game.draw.rect(pad.x + 6, pad.y + 10, PAD_SIZE, PAD_SIZE, '#000', 0.4);
      // edge
      game.draw.rect(pad.x - 6, pad.y - 6, PAD_SIZE + 12, PAD_SIZE + 12, C.padEdge);
      // body
      game.draw.rect(pad.x, pad.y, PAD_SIZE, PAD_SIZE, bgColor, alpha);
      // shine
      if (isActive) {
        game.draw.rect(pad.x + 12, pad.y + 12, PAD_SIZE - 24, PAD_SIZE / 3, '#fff', 0.25);
        var gA = 0.3 + 0.1 * Math.sin(game.time.elapsed * 15);
        game.draw.rect(pad.x - 12, pad.y - 12, PAD_SIZE + 24, PAD_SIZE + 24, pad.color, gA);
      }
    }

    // Feedback
    if (phase === 'feedback') {
      var prog = 1 - feedbackTimer / 0.7;
      if (feedbackOk) {
        game.draw.text('完璧！', W / 2, PADS_Y - 120 - prog * 60, { size: 88, color: C.hit, bold: true });
      } else {
        game.draw.text('ちがう！', W / 2, PADS_Y - 100, { size: 80, color: C.miss, bold: true });
      }
    }

    // Guide
    game.draw.text(phase === 'input' ? '同じ順でタップ！' : '光る順を覚えろ！', W / 2, H - 200, {
      size: 52, color: C.ui
    });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    startRound();
  });
})(game);
