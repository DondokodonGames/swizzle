// 157-simon-flash.js
// サイモンフラッシュ — 光るパターンを記憶して同じ順に再現する、増えるたびに脳が焦る
// 操作: タップで色を選ぶ
// 成功: 8ラウンドクリア  失敗: 1回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06040e',
    ui:     '#334155',
    wrong:  '#ef4444',
    correct:'#22c55e'
  };

  var COLORS = [
    { base: '#ef4444', hi: '#fca5a5', name: '赤' },
    { base: '#3b82f6', hi: '#93c5fd', name: '青' },
    { base: '#22c55e', hi: '#86efac', name: '緑' },
    { base: '#f59e0b', hi: '#fde68a', name: '黄' }
  ];

  var BTN_SIZE = 260;
  var BTN_GAP = 20;
  var CX = W / 2;
  var CY = H * 0.52;

  var BUTTONS = [
    { x: CX - BTN_SIZE - BTN_GAP / 2, y: CY - BTN_SIZE - BTN_GAP / 2, idx: 0 }, // top-left
    { x: CX + BTN_GAP / 2,             y: CY - BTN_SIZE - BTN_GAP / 2, idx: 1 }, // top-right
    { x: CX - BTN_SIZE - BTN_GAP / 2, y: CY + BTN_GAP / 2,             idx: 2 }, // bottom-left
    { x: CX + BTN_GAP / 2,             y: CY + BTN_GAP / 2,             idx: 3 }  // bottom-right
  ];

  var sequence = [];
  var playerSeq = [];
  var round = 0;
  var needed = 8;
  var phase = 'showing'; // 'showing' | 'input'
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_ON = 0.5;
  var SHOW_OFF = 0.2;
  var showOn = false;
  var litBtn = -1;

  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var pressedBtn = -1;
  var pressTimer = 0;

  function addToSequence() {
    sequence.push(Math.floor(Math.random() * 4));
    round++;
  }

  function startShowing() {
    phase = 'showing';
    showIdx = 0;
    showTimer = 0.4; // initial pause
    showOn = false;
    litBtn = -1;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    for (var bi = 0; bi < BUTTONS.length; bi++) {
      var btn = BUTTONS[bi];
      if (tx >= btn.x && tx <= btn.x + BTN_SIZE && ty >= btn.y && ty <= btn.y + BTN_SIZE) {
        pressedBtn = bi;
        pressTimer = 0.2;
        playerSeq.push(bi);
        game.audio.play('se_tap', 0.5);

        if (playerSeq[playerSeq.length - 1] !== sequence[playerSeq.length - 1]) {
          // Wrong!
          feedbackOk = false; feedback = 0.5;
          game.audio.play('se_failure');
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }

        if (playerSeq.length === sequence.length) {
          // Correct complete!
          feedbackOk = true; feedback = 0.5;
          game.audio.play('se_success');
          if (round >= needed) {
            done = true;
            setTimeout(function() { game.end.success(round * 150 + Math.ceil(timeLeft) * 30); }, 500);
            return;
          }
          playerSeq = [];
          setTimeout(function() {
            addToSequence();
            startShowing();
          }, 600);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;
    if (pressTimer > 0) pressTimer -= dt;
    if (pressTimer <= 0) pressedBtn = -1;

    if (phase === 'showing') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (!showOn) {
          // Light up next
          litBtn = sequence[showIdx];
          showOn = true;
          showTimer = SHOW_ON;
          game.audio.play('se_tap', 0.4);
        } else {
          // Turn off
          litBtn = -1;
          showOn = false;
          showIdx++;
          if (showIdx >= sequence.length) {
            phase = 'input';
            playerSeq = [];
            litBtn = -1;
          } else {
            showTimer = SHOW_OFF;
          }
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Center divider
    game.draw.circle(CX, CY, 80, '#1e1b30', 0.9);
    game.draw.circle(CX, CY, 60, '#2d2850', 0.8);
    game.draw.text(round + '', CX, CY, { size: 52, color: '#64748b', bold: true });

    // Buttons
    for (var bi = 0; bi < BUTTONS.length; bi++) {
      var btn = BUTTONS[bi];
      var col = COLORS[btn.idx];
      var isLit = litBtn === bi || pressedBtn === bi;
      var alpha = isLit ? 0.95 : 0.35;
      var hiAlpha = isLit ? 0.6 : 0.15;
      game.draw.rect(btn.x - 8, btn.y - 8, BTN_SIZE + 16, BTN_SIZE + 16, isLit ? col.hi : col.base, 0.12);
      game.draw.rect(btn.x, btn.y, BTN_SIZE, BTN_SIZE, col.base, alpha);
      game.draw.rect(btn.x, btn.y, BTN_SIZE, 16, col.hi, hiAlpha);
      game.draw.rect(btn.x, btn.y + BTN_SIZE - 16, BTN_SIZE, 16, '#000', 0.3);
      if (isLit) {
        game.draw.circle(btn.x + BTN_SIZE / 2, btn.y + BTN_SIZE / 2, BTN_SIZE * 0.3, col.hi, 0.3);
      }
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.15);
    }

    // Phase indicator
    if (phase === 'showing') {
      game.draw.text('よく見て！', W / 2, H * 0.88, { size: 48, color: '#94a3b8' });
    } else {
      game.draw.text('同じ順に！ ' + playerSeq.length + '/' + sequence.length, W / 2, H * 0.88, { size: 44, color: C.correct });
    }

    game.draw.text('ラウンド ' + round + ' / ' + needed, W / 2, 148, { size: 56, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? COLORS[1].base : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    addToSequence();
    setTimeout(function() { startShowing(); }, 600);
  });
})(game);
