// 111-memory-lights.js
// 記憶の光 — 光ったパネルの順番を覚えてそのまま再現する、脳が震える瞬間
// 操作: タップでパネルを選択
// 成功: レベル7をクリア  失敗: 順番を間違える

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040608',
    panel:   '#0f1520',
    panelLit:'#facc15',
    panelHi: '#fef08a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var COLS = 3, ROWS = 3;
  var CELL = 240;
  var GAP = 20;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2;

  var sequence = [];
  var playerSeq = [];
  var level = 1;
  var phase = 'show'; // 'show' | 'input' | 'feedback'
  var showIndex = 0;
  var showTimer = 0;
  var SHOW_ON = 0.5;
  var SHOW_OFF = 0.25;
  var litPanel = -1;
  var feedbackTimer = 0;
  var feedbackOk = false;
  var done = false;
  var timeLeft = 60;

  function cellIndex(col, row) { return row * COLS + col; }

  function cellRect(idx) {
    var col = idx % COLS;
    var row = Math.floor(idx / COLS);
    return {
      x: GRID_X + col * (CELL + GAP),
      y: GRID_Y + row * (CELL + GAP),
      w: CELL, h: CELL
    };
  }

  function startLevel() {
    sequence.push(Math.floor(Math.random() * (COLS * ROWS)));
    playerSeq = [];
    phase = 'show';
    showIndex = 0;
    showTimer = SHOW_ON;
    litPanel = sequence[0];
    game.audio.play('se_tap', 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = cellRect(i);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
        litPanel = i;
        playerSeq.push(i);
        var expected = sequence[playerSeq.length - 1];
        if (i !== expected) {
          // Wrong
          feedbackOk = false;
          feedbackTimer = 0.8;
          phase = 'feedback';
          game.audio.play('se_failure');
          done = true;
          setTimeout(function() { game.end.failure(); }, 900);
          return;
        }
        game.audio.play('se_tap', 0.6);
        if (playerSeq.length === sequence.length) {
          // Level complete
          level++;
          feedbackOk = true;
          feedbackTimer = 0.7;
          phase = 'feedback';
          if (level > 7) {
            game.audio.play('se_success');
            done = true;
            setTimeout(function() { game.end.success(level * 80 + Math.ceil(timeLeft) * 5); }, 800);
          } else {
            game.audio.play('se_success');
            setTimeout(function() { startLevel(); }, 900);
          }
        }
        return;
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
        if (litPanel >= 0) {
          // Was lit — turn off
          litPanel = -1;
          showTimer = SHOW_OFF;
        } else {
          // Was off — advance
          showIndex++;
          if (showIndex >= sequence.length) {
            phase = 'input';
            litPanel = -1;
          } else {
            litPanel = sequence[showIndex];
            showTimer = SHOW_ON;
            game.audio.play('se_tap', 0.4);
          }
        }
      }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid panels
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = cellRect(i);
      var isLit = (i === litPanel);
      game.draw.rect(r.x, r.y, r.w, r.h, isLit ? C.panelLit : C.panel);
      if (isLit) {
        game.draw.rect(r.x, r.y, r.w, 8, C.panelHi);
        game.draw.rect(r.x, r.y, 8, r.h, C.panelHi);
      }
    }

    // Feedback overlay
    if (feedbackTimer > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedbackTimer * 0.25);
      game.draw.text(feedbackOk ? 'よし！' : 'ミス！', W / 2, H * 0.18, {
        size: 96, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Level + phase
    game.draw.text('Level ' + level + ' / 7', W / 2, 144, { size: 56, color: '#f1f5f9', bold: true });

    var phaseLabel = phase === 'show' ? '覚えて...' : (phase === 'input' ? '再現せよ！' : '');
    if (phaseLabel) {
      game.draw.text(phaseLabel, W / 2, H * 0.86, { size: 52, color: phase === 'input' ? C.panelLit : C.ui });
    }

    // Sequence dots
    for (var s = 0; s < sequence.length; s++) {
      var sx = W / 2 + (s - (sequence.length - 1) / 2) * 52;
      game.draw.circle(sx, H * 0.92, 18, s < playerSeq.length ? C.correct : '#1a2030');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6366f1' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    startLevel();
  });
})(game);
