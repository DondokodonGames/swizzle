// 496-chef-order.js
// シェフオーダー — 注文を記憶してトッピングを正しい順番でタップ
// 操作: 表示された順番通りにアイコンをタップ（記憶ゲーム）
// 成功: 12オーダー達成  失敗: 5回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0500',
    panel:  '#1a0e00',
    item0:  '#ef4444',  // tomato
    item1:  '#22c55e',  // lettuce
    item2:  '#f59e0b',  // cheese
    item3:  '#a855f7',  // onion
    item4:  '#06b6d4',  // cucumber
    item5:  '#f97316',  // carrot
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    bg2:    '#fff7ed'
  };

  var ITEMS = [
    { col: C.item0, label: '🍅', name: 'トマト' },
    { col: C.item1, label: '🥬', name: 'レタス' },
    { col: C.item2, label: '🧀', name: 'チーズ' },
    { col: C.item3, label: '🧅', name: 'オニオン' },
    { col: C.item4, label: '🥒', name: 'キュウリ' },
    { col: C.item5, label: '🥕', name: 'ニンジン' }
  ];

  var COLS = 3;
  var ROWS = 2;
  var BTN_W = 280, BTN_H = 220;
  var BTN_GAP = 20;
  var BTN_OX = (W - (COLS * BTN_W + (COLS - 1) * BTN_GAP)) / 2;
  var BTN_OY = H * 0.62;

  var sequence = [];
  var seqLen = 3;
  var playerIdx = 0;
  var showing = true;
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_EACH = 0.65;
  var orders = 0;
  var NEEDED = 12;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var highlightBtn = -1;
  var highlightTimer = 0;
  var resultText = '';
  var resultLife = 0;

  function genSequence() {
    sequence = [];
    for (var i = 0; i < seqLen; i++) {
      sequence.push(Math.floor(Math.random() * ITEMS.length));
    }
    showIdx = 0;
    showTimer = SHOW_EACH;
    playerIdx = 0;
    showing = true;
  }

  function btnAt(tx, ty) {
    for (var i = 0; i < ITEMS.length; i++) {
      var col2 = i % COLS;
      var row2 = Math.floor(i / COLS);
      var bx = BTN_OX + col2 * (BTN_W + BTN_GAP);
      var by = BTN_OY + row2 * (BTN_H + BTN_GAP);
      if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) return i;
    }
    return -1;
  }

  game.onTap(function(tx, ty) {
    if (done || showing) return;
    var idx = btnAt(tx, ty);
    if (idx < 0) return;
    highlightBtn = idx;
    highlightTimer = 0.2;
    game.audio.play('se_tap', 0.4);

    if (idx === sequence[playerIdx]) {
      playerIdx++;
      if (playerIdx >= sequence.length) {
        orders++;
        flashCol = C.correct;
        flashAnim = 0.4;
        resultText = 'はい！';
        resultLife = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.correct });
        }
        if (orders >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(orders * 400 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          if (orders % 3 === 0 && seqLen < 7) seqLen++;
          setTimeout(function() { if (!done) genSequence(); }, 600);
        }
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.5;
      resultText = 'ちがう！';
      resultLife = 0.8;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        setTimeout(function() { if (!done) genSequence(); }, 700);
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
    if (resultLife > 0) resultLife -= dt * 2;
    if (highlightTimer > 0) { highlightTimer -= dt; if (highlightTimer <= 0) highlightBtn = -1; }

    if (showing) {
      showTimer -= dt;
      if (showTimer <= 0) {
        showIdx++;
        if (showIdx >= sequence.length) {
          showing = false;
        } else {
          showTimer = SHOW_EACH;
          game.audio.play('se_tap', 0.3);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Order display area
    game.draw.rect(60, H * 0.18, W - 120, H * 0.38, C.panel, 0.9);

    if (showing) {
      // Show current sequence item
      var curItem = ITEMS[sequence[showIdx]];
      game.draw.circle(W / 2, H * 0.35, 140, curItem.col, 0.25);
      game.draw.circle(W / 2, H * 0.35, 110, curItem.col, 0.8);
      game.draw.text(curItem.name, W / 2, H * 0.35 + 30, { size: 56, color: '#fff', bold: true });
      // Progress dots
      for (var di = 0; di < sequence.length; di++) {
        var dotCol2 = di < showIdx ? ITEMS[sequence[di]].col : (di === showIdx ? '#fff' : C.ui);
        game.draw.circle(W / 2 - (sequence.length - 1) * 36 + di * 72, H * 0.52, 20, dotCol2, di <= showIdx ? 0.9 : 0.5);
      }
      game.draw.text('覚えて！', W / 2, H * 0.22, { size: 52, color: C.text, bold: true });
    } else {
      // Player input phase
      game.draw.text('タップ！', W / 2, H * 0.22, { size: 52, color: C.text, bold: true });
      // Show progress
      for (var si = 0; si < sequence.length; si++) {
        var dotAlpha = si < playerIdx ? 0.9 : 0.3;
        var dotC = si < playerIdx ? ITEMS[sequence[si]].col : C.ui;
        game.draw.circle(W / 2 - (sequence.length - 1) * 36 + si * 72, H * 0.36, 24, dotC, dotAlpha);
      }
      // Current target hint (small)
      if (playerIdx < sequence.length) {
        var nextItem = ITEMS[sequence[playerIdx]];
        game.draw.circle(W / 2, H * 0.44, 50, nextItem.col, 0.15);
        game.draw.text('次→' + nextItem.name, W / 2, H * 0.47 + 16, { size: 36, color: nextItem.col });
      }
    }

    // Buttons
    for (var bi = 0; bi < ITEMS.length; bi++) {
      var bc = bi % COLS;
      var br = Math.floor(bi / COLS);
      var bx = BTN_OX + bc * (BTN_W + BTN_GAP);
      var by2 = BTN_OY + br * (BTN_H + BTN_GAP);
      var isHl = (bi === highlightBtn);
      game.draw.rect(bx + 4, by2 + 4, BTN_W - 8, BTN_H - 8, ITEMS[bi].col, isHl ? 0.9 : 0.7);
      game.draw.rect(bx + 4, by2 + 4, BTN_W - 8, 14, '#fff', 0.2);
      game.draw.text(ITEMS[bi].name, bx + BTN_W / 2, by2 + BTN_H / 2 + 20, { size: 36, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.92, { size: 64, color: flashCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + mi * 112, H * 0.96, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(orders + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.item5 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    genSequence();
  });
})(game);
