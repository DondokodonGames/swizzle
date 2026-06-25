// 246-color-memory.js
// カラーメモリー — 一瞬だけ見せた色の組み合わせを記憶して再現する
// 操作: 記憶した順に色パネルをタップ
// 成功: 8ラウンドクリア  失敗: 2回ミス

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050508',
    ui:     '#475569',
    text:   '#f1f5f9',
    correct:'#22c55e',
    wrong:  '#ef4444'
  };

  var COLORS = [
    { name: '赤', col: '#ef4444', hi: '#fca5a5' },
    { name: '青', col: '#3b82f6', hi: '#93c5fd' },
    { name: '緑', col: '#22c55e', hi: '#86efac' },
    { name: '黄', col: '#f59e0b', hi: '#fde68a' },
    { name: '紫', col: '#a855f7', hi: '#d8b4fe' },
    { name: '白', col: '#e2e8f0', hi: '#fff' }
  ];

  var GRID = 2; // 2×3 = 6 panels
  var PANEL_W = (W - 80) / 3;
  var PANEL_H = 260;
  var PANEL_MARGIN = 20;
  var PANEL_START_Y = H * 0.45;

  var STATE = 'SHOW'; // SHOW, INPUT
  var sequence = [];
  var round = 0;
  var TOTAL_ROUNDS = 8;
  var inputIdx = 0;
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_INTERVAL = 0.6;
  var misses = 0;
  var MAX_MISS = 2;
  var done = false;
  var elapsed = 0;
  var flashCol = '';
  var flashTimer = 0;
  var highlightPanel = -1;
  var highlightTimer = 0;

  function startRound() {
    round++;
    sequence = [];
    var seqLen = 2 + Math.floor(round * 0.7);
    for (var i = 0; i < seqLen; i++) {
      sequence.push(Math.floor(Math.random() * COLORS.length));
    }
    STATE = 'SHOW';
    showIdx = -1;
    showTimer = 0.6;
    inputIdx = 0;
  }

  function panelIndex(tx, ty) {
    for (var col = 0; col < 3; col++) {
      for (var row = 0; row < 2; row++) {
        var px = 40 + col * (PANEL_W + PANEL_MARGIN);
        var py = PANEL_START_Y + row * (PANEL_H + PANEL_MARGIN);
        if (tx >= px && tx < px + PANEL_W && ty >= py && ty < py + PANEL_H) {
          return row * 3 + col;
        }
      }
    }
    return -1;
  }

  game.onTap(function(tx, ty) {
    if (done || STATE !== 'INPUT') return;
    var idx = panelIndex(tx, ty);
    if (idx < 0) return;

    highlightPanel = idx;
    highlightTimer = 0.2;

    if (idx === sequence[inputIdx]) {
      game.audio.play('se_tap', 0.4);
      inputIdx++;
      if (inputIdx >= sequence.length) {
        flashCol = C.correct;
        flashTimer = 0.3;
        game.audio.play('se_success', 0.6);
        if (round >= TOTAL_ROUNDS && !done) {
          done = true;
          setTimeout(function() { game.end.success(round * 200 + misses === 0 ? 500 : 0); }, 600);
        } else {
          setTimeout(function() { if (!done) startRound(); }, 700);
          STATE = 'WAIT';
        }
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashTimer = 0.4;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        setTimeout(function() { if (!done) startRound(); }, 700);
        STATE = 'WAIT';
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;
    if (flashTimer > 0) flashTimer -= dt;
    if (highlightTimer > 0) highlightTimer -= dt;

    if (STATE === 'SHOW') {
      showTimer -= dt;
      if (showTimer <= 0) {
        showIdx++;
        if (showIdx >= sequence.length) {
          STATE = 'INPUT';
          showIdx = -1;
        } else {
          showTimer = SHOW_INTERVAL;
          game.audio.play('se_tap', 0.25);
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (flashTimer > 0) {
      game.draw.rect(0, 0, W, H, flashCol, flashTimer * 0.3);
    }

    // Panels
    for (var col = 0; col < 3; col++) {
      for (var row = 0; row < 2; row++) {
        var idx = row * 3 + col;
        var color = COLORS[idx];
        var px = 40 + col * (PANEL_W + PANEL_MARGIN);
        var py = PANEL_START_Y + row * (PANEL_H + PANEL_MARGIN);
        var lit = (STATE === 'SHOW' && showIdx >= 0 && sequence[showIdx] === idx);
        var tapped = (STATE === 'INPUT' && highlightPanel === idx && highlightTimer > 0);
        var alpha = lit || tapped ? 1.0 : 0.35;
        game.draw.rect(px, py, PANEL_W, PANEL_H, color.col, alpha);
        if (lit || tapped) {
          game.draw.rect(px, py, PANEL_W, 8, color.hi, 0.7);
          game.draw.rect(px, py + PANEL_H - 8, PANEL_W, 8, color.hi, 0.7);
        }
        game.draw.text(color.name, px + PANEL_W / 2, py + PANEL_H / 2 + 12, { size: 48, color: '#fff', bold: true });
      }
    }

    // Show sequence progress
    if (STATE === 'SHOW') {
      var seqStr = '';
      for (var si = 0; si < sequence.length; si++) {
        seqStr += (si === showIdx ? '●' : (si < showIdx ? '○' : '·'));
      }
      game.draw.text(seqStr, W / 2, H * 0.4, { size: 44, color: C.ui });
      game.draw.text('覚えろ！', W / 2, H * 0.35, { size: 56, color: C.text, bold: true });
    } else if (STATE === 'INPUT') {
      game.draw.text(inputIdx + ' / ' + sequence.length, W / 2, H * 0.38, { size: 48, color: C.correct });
      game.draw.text('入力！', W / 2, H * 0.34, { size: 56, color: C.text, bold: true });
    }

    // Misses
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 30 + mi * 60, H * 0.93, 18, mi < misses ? C.wrong : '#1a1a2e');
    }

    game.draw.text('ROUND ' + round + ' / ' + TOTAL_ROUNDS, W / 2, 148, { size: 54, color: C.text, bold: true });

    var ratio = Math.max(0, 1 - elapsed / 120);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(Math.max(0, 120 - elapsed)) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    startRound();
  });
})(game);
