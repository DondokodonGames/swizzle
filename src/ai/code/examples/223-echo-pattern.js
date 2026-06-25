// 223-echo-pattern.js
// エコーパターン — 光ったパネルの順番を記憶して同じ順番でタップするシモンゲーム
// 操作: タップでパネルを押す
// 成功: 10ラウンドクリア  失敗: 間違えると即失敗

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:   '#060408',
    p0:   '#ef4444', p0hi: '#fca5a5', // red
    p1:   '#22c55e', p1hi: '#86efac', // green
    p2:   '#3b82f6', p2hi: '#93c5fd', // blue
    p3:   '#f59e0b', p3hi: '#fde68a', // yellow
    ui:   '#334155'
  };

  var COLORS = [
    { base: '#ef4444', hi: '#fca5a5' },
    { base: '#22c55e', hi: '#86efac' },
    { base: '#3b82f6', hi: '#93c5fd' },
    { base: '#f59e0b', hi: '#fde68a' }
  ];

  var PAD_SIZE = W / 2 - 20;
  var PADS = [
    { x: 10,            y: H * 0.15,          w: PAD_SIZE, h: PAD_SIZE, colorIdx: 0 },
    { x: W / 2 + 10,   y: H * 0.15,          w: PAD_SIZE, h: PAD_SIZE, colorIdx: 1 },
    { x: 10,            y: H * 0.15 + PAD_SIZE + 20, w: PAD_SIZE, h: PAD_SIZE, colorIdx: 2 },
    { x: W / 2 + 10,   y: H * 0.15 + PAD_SIZE + 20, w: PAD_SIZE, h: PAD_SIZE, colorIdx: 3 }
  ];

  var sequence = [];
  var playerSeq = [];
  var round = 0;
  var NEEDED = 10;
  var phase = 'showing'; // 'showing' | 'player' | 'transition'
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_ON = 0.5;
  var SHOW_OFF = 0.2;
  var showOn = true;
  var litPad = -1;
  var done = false;
  var elapsed = 0;
  var transTimer = 0;
  var feedback = 0;
  var feedbackOk = false;

  function nextRound() {
    sequence.push(Math.floor(Math.random() * 4));
    playerSeq = [];
    round++;
    phase = 'showing';
    showIdx = 0;
    showOn = true;
    showTimer = 0.4; // brief pause before first flash
    litPad = -1;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'player') return;
    for (var pi = 0; pi < PADS.length; pi++) {
      var p = PADS[pi];
      if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) {
        playerSeq.push(pi);
        litPad = pi;
        setTimeout(function() { litPad = -1; }, 200);

        var idx = playerSeq.length - 1;
        if (playerSeq[idx] !== sequence[idx]) {
          // Wrong!
          done = true;
          feedbackOk = false; feedback = 0.5;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
        game.audio.play('se_tap', 0.5);

        if (playerSeq.length === sequence.length) {
          // Round complete
          feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success', 0.6);
          if (round >= NEEDED) {
            done = true;
            setTimeout(function() { game.end.success(round * 200 + 500); }, 500);
          } else {
            phase = 'transition';
            transTimer = 0.8;
          }
        }
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    elapsed += dt;
    if (feedback > 0) feedback -= dt;

    if (phase === 'showing') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (showOn) {
          litPad = sequence[showIdx];
          game.audio.play('se_tap', 0.4);
          showOn = false;
          showTimer = SHOW_ON;
        } else {
          litPad = -1;
          showIdx++;
          if (showIdx >= sequence.length) {
            phase = 'player';
            litPad = -1;
          } else {
            showOn = true;
            showTimer = SHOW_OFF;
          }
        }
      }
    } else if (phase === 'transition') {
      transTimer -= dt;
      if (transTimer <= 0) {
        nextRound();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Pads
    for (var pi = 0; pi < PADS.length; pi++) {
      var p = PADS[pi];
      var col = COLORS[p.colorIdx];
      var isLit = pi === litPad;
      var alpha = isLit ? 0.95 : 0.25;
      game.draw.rect(p.x, p.y, p.w, p.h, col.base, alpha);
      if (isLit) {
        game.draw.rect(p.x, p.y, p.w, 12, col.hi, 0.6);
      }
    }

    // Phase indicator
    var statusY = H * 0.15 + PAD_SIZE * 2 + 60;
    if (phase === 'showing') {
      game.draw.text('覚えて！', W / 2, statusY, { size: 52, color: '#f1f5f9', bold: true });
    } else if (phase === 'player') {
      game.draw.text('繰り返せ！ ' + playerSeq.length + '/' + sequence.length, W / 2, statusY, { size: 48, color: '#22c55e', bold: true });
    } else if (phase === 'transition') {
      game.draw.text('正解！', W / 2, statusY, { size: 56, color: '#22c55e', bold: true });
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : '#ef4444', feedback * 0.12);
    }

    // Round progress dots
    for (var ri = 0; ri < NEEDED; ri++) {
      var dotX = W / 2 - (NEEDED - 1) * 22 + ri * 44;
      var dotY = statusY + 100;
      game.draw.circle(dotX, dotY, 16, ri < round ? '#22c55e' : '#1e293b');
    }

    game.draw.text('ラウンド ' + round + ' / ' + NEEDED, W / 2, 148, { size: 56, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.text('エコーパターン', W / 2, 36, { size: 44, color: C.ui, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    setTimeout(nextRound, 800);
  });
})(game);
