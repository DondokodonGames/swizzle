// 251-memory-palace.js
// メモリーパレス — 記憶宮殿：部屋に置かれたアイテムの位置を記憶して答える
// 操作: アイテムが消えた後、元あった場所をタップ
// 成功: 10問全正解  失敗: 3問外す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060310',
    room:    '#0f0a1e',
    roomHi:  '#1e1438',
    item:    '#f59e0b',
    itemHi:  '#fde68a',
    correct: '#22c55e',
    corHi:   '#86efac',
    wrong:   '#ef4444',
    wrnHi:   '#fca5a5',
    ui:      '#475569',
    text:    '#f1f5f9',
    shadow:  '#a855f7'
  };

  var ITEMS = ['★', '♦', '●', '▲', '■', '♠', '♣', '♥', '◆', '⊕'];

  var GRID_COLS = 4;
  var GRID_ROWS = 5;
  var CELL_W = (W - 80) / GRID_COLS;
  var CELL_H = (H * 0.65) / GRID_ROWS;
  var GRID_X = 40;
  var GRID_Y = H * 0.2;

  var STATE = 'SHOW';
  var currentItem = '';
  var currentPos = -1;
  var round = 0;
  var TOTAL_ROUNDS = 10;
  var showTimer = 0;
  var SHOW_DURATION = 1.5;
  var correct = 0;
  var wrongs = 0;
  var MAX_WRONG = 3;
  var done = false;
  var elapsed = 0;
  var timeLeft = 50;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var itemGlowPhase = 0;

  function startRound() {
    STATE = 'SHOW';
    showTimer = SHOW_DURATION;
    currentPos = Math.floor(Math.random() * (GRID_COLS * GRID_ROWS));
    currentItem = ITEMS[round % ITEMS.length];
    round++;
    itemGlowPhase = 0;
  }

  function cellRect(pos) {
    var col = pos % GRID_COLS;
    var row = Math.floor(pos / GRID_COLS);
    return {
      x: GRID_X + col * CELL_W,
      y: GRID_Y + row * CELL_H,
      cx: GRID_X + col * CELL_W + CELL_W / 2,
      cy: GRID_Y + row * CELL_H + CELL_H / 2
    };
  }

  game.onTap(function(tx, ty) {
    if (done || STATE !== 'INPUT') return;

    var picked = -1;
    for (var pi = 0; pi < GRID_COLS * GRID_ROWS; pi++) {
      var r = cellRect(pi);
      if (tx >= r.x && tx < r.x + CELL_W && ty >= r.y && ty < r.y + CELL_H) {
        picked = pi;
        break;
      }
    }
    if (picked < 0) return;

    if (picked === currentPos) {
      correct++;
      feedback = '正解！';
      feedbackCol = C.correct;
      feedbackTimer = 0.6;
      game.audio.play('se_success', 0.7);
      var r2 = cellRect(picked);
      for (var pp = 0; pp < 8; pp++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: r2.cx, y: r2.cy, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, life: 0.5 });
      }
      if (round >= TOTAL_ROUNDS && correct >= TOTAL_ROUNDS - MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 150 + Math.ceil(timeLeft) * 60); }, 600);
        return;
      }
      setTimeout(function() { if (!done) startRound(); }, 700);
      STATE = 'WAIT';
    } else {
      wrongs++;
      feedback = 'ハズレ！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.6;
      game.audio.play('se_failure', 0.5);
      // Show correct position briefly
      STATE = 'REVEAL';
      setTimeout(function() {
        if (!done) {
          if (wrongs >= MAX_WRONG) {
            done = true;
            game.end.failure();
          } else {
            startRound();
          }
        }
      }, 800);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;
    itemGlowPhase += dt * 4;

    if (STATE === 'SHOW') {
      showTimer -= dt;
      if (showTimer <= 0) {
        STATE = 'INPUT';
        game.audio.play('se_tap', 0.2);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Room background
    game.draw.rect(GRID_X - 10, GRID_Y - 10, W - 60, H * 0.65 + 20, C.room, 0.8);

    // Grid cells
    for (var ci = 0; ci < GRID_COLS * GRID_ROWS; ci++) {
      var r3 = cellRect(ci);
      game.draw.rect(r3.x + 2, r3.y + 2, CELL_W - 4, CELL_H - 4, C.roomHi, 0.5);
    }

    // Item
    if (STATE === 'SHOW' || STATE === 'REVEAL') {
      var r4 = cellRect(currentPos);
      var glow = 0.3 + 0.2 * Math.abs(Math.sin(itemGlowPhase));
      game.draw.rect(r4.x + 2, r4.y + 2, CELL_W - 4, CELL_H - 4, C.shadow, glow);
      game.draw.text(currentItem, r4.cx, r4.cy + 14, { size: 80, color: C.item, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.5), C.corHi, p.life);
    }

    // State message
    if (STATE === 'SHOW') {
      var barW = CELL_W * GRID_COLS * (1 - showTimer / SHOW_DURATION);
      game.draw.rect(GRID_X, GRID_Y + GRID_ROWS * CELL_H + 10, CELL_W * GRID_COLS, 10, C.ui, 0.3);
      game.draw.rect(GRID_X, GRID_Y + GRID_ROWS * CELL_H + 10, barW, 10, C.item, 0.9);
      game.draw.text('覚えろ！', W / 2, H * 0.9, { size: 56, color: C.item, bold: true });
    } else if (STATE === 'INPUT') {
      game.draw.text('どこにあった？', W / 2, H * 0.9, { size: 48, color: C.text, bold: true });
      game.draw.text(currentItem, W / 2, H * 0.13, { size: 60, color: C.item, bold: true });
    } else if (STATE === 'REVEAL') {
      var r5 = cellRect(currentPos);
      game.draw.rect(r5.x + 2, r5.y + 2, CELL_W - 4, CELL_H - 4, C.correct, 0.4);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.95, { size: 52, color: feedbackCol, bold: true });
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 28 + wi * 56, H * 0.185, 16, wi < wrongs ? C.wrong : C.ui, 0.8);
    }

    game.draw.text('ROUND ' + Math.min(round, TOTAL_ROUNDS) + ' / ' + TOTAL_ROUNDS, W / 2, 148, { size: 54, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    startRound();
  });
})(game);
