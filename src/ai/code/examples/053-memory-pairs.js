// 053-memory-pairs.js
// メモリーペア — カードをめくってペアを見つける集中力と記憶のゲーム
// 操作: タップでカードをめくる
// 成功: 全8ペアを制限時間内に揃える  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080c14',
    cardBg:  '#0f1a2e',
    cardHi:  '#1e3a5f',
    back:    '#1d4ed8',
    backHi:  '#3b82f6',
    matched: '#166534',
    matchHi: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  // 8 pairs = 16 cards, 4×4 grid
  var COLS = 4;
  var ROWS = 4;
  var CARD_W = 200;
  var CARD_H = 220;
  var GAP = 16;
  var GRID_X = (W - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
  var GRID_Y = H * 0.22;

  // 8 distinct symbols (using colored shapes)
  var SYMBOLS = [
    { color: '#ef4444', shape: 'circle' },
    { color: '#f97316', shape: 'square' },
    { color: '#eab308', shape: 'diamond' },
    { color: '#22c55e', shape: 'circle' },
    { color: '#3b82f6', shape: 'square' },
    { color: '#8b5cf6', shape: 'diamond' },
    { color: '#ec4899', shape: 'circle' },
    { color: '#06b6d4', shape: 'square' }
  ];

  var cards = [];
  var flipped = []; // indices of currently face-up unmatched cards
  var matched = []; // set of matched indices
  var lockTimer = 0;
  var timeLeft = 45;
  var done = false;
  var flipAnimations = {}; // cardIndex -> {t, toFront}

  function initCards() {
    var pairs = [];
    for (var i = 0; i < 8; i++) { pairs.push(i); pairs.push(i); }
    // Shuffle
    for (var s = pairs.length - 1; s > 0; s--) {
      var r = Math.floor(Math.random() * (s + 1));
      var tmp = pairs[s]; pairs[s] = pairs[r]; pairs[r] = tmp;
    }
    cards = pairs;
    flipped = [];
    matched = [];
    flipAnimations = {};
  }

  function cardRect(idx) {
    var col = idx % COLS;
    var row = Math.floor(idx / COLS);
    return {
      x: GRID_X + col * (CARD_W + GAP),
      y: GRID_Y + row * (CARD_H + GAP)
    };
  }

  game.onTap(function(x, y) {
    if (done || lockTimer > 0) return;

    // Find tapped card
    for (var i = 0; i < cards.length; i++) {
      if (matched.indexOf(i) >= 0) continue;
      if (flipped.indexOf(i) >= 0) continue;
      var r = cardRect(i);
      if (x >= r.x && x <= r.x + CARD_W && y >= r.y && y <= r.y + CARD_H) {
        flipped.push(i);
        flipAnimations[i] = { t: 0, toFront: true };
        game.audio.play('se_tap', 0.5);

        if (flipped.length === 2) {
          var a = flipped[0], b = flipped[1];
          if (cards[a] === cards[b]) {
            // Match!
            lockTimer = 0.5;
            setTimeout(function() {
              var fa = flipped[0], fb = flipped[1];
              matched.push(fa);
              matched.push(fb);
              flipped = [];
              game.audio.play('se_tap', 0.9);
              if (matched.length === 16 && !done) {
                done = true;
                game.audio.play('se_success');
                setTimeout(function() {
                  game.end.success(300 + Math.ceil(timeLeft) * 5);
                }, 400);
              }
            }, 500);
          } else {
            // No match
            lockTimer = 0.8;
            setTimeout(function() {
              flipped = [];
            }, 800);
          }
        }
        break;
      }
    }
  });

  function drawSymbol(sym, cx, cy) {
    if (sym.shape === 'circle') {
      game.draw.circle(cx, cy, 52, sym.color);
      game.draw.circle(cx - 14, cy - 14, 20, '#fff', 0.3);
    } else if (sym.shape === 'square') {
      game.draw.rect(cx - 52, cy - 52, 104, 104, sym.color);
      game.draw.rect(cx - 40, cy - 40, 48, 20, '#fff', 0.25);
    } else { // diamond
      for (var row = 0; row < 52; row++) {
        var rw = (1 - Math.abs(row - 26) / 26) * 104;
        game.draw.rect(cx - rw / 2, cy - 52 + row * 2, rw, 2, sym.color, 1.0);
      }
      game.draw.circle(cx - 16, cy - 16, 12, '#fff', 0.3);
    }
  }

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

    if (lockTimer > 0) lockTimer -= dt;

    // Update flip animations
    for (var k in flipAnimations) {
      flipAnimations[k].t += dt * 4;
      if (flipAnimations[k].t > 1) {
        flipAnimations[k].t = 1;
        delete flipAnimations[k];
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Cards
    for (var i = 0; i < 16; i++) {
      var r = cardRect(i);
      var isMatched = matched.indexOf(i) >= 0;
      var isFlipped = flipped.indexOf(i) >= 0;
      var anim = flipAnimations[i];

      var scaleX = 1;
      if (anim) {
        scaleX = anim.toFront ? Math.abs(Math.cos(anim.t * Math.PI / 2)) : Math.abs(Math.cos((1 - anim.t) * Math.PI / 2));
      }

      var cx = r.x + CARD_W / 2;
      var cy = r.y + CARD_H / 2;
      var effectiveW = CARD_W * (scaleX > 0.05 ? scaleX : 0.05);

      if (isMatched) {
        // Matched: show symbol with green tint
        game.draw.rect(cx - effectiveW / 2, r.y, effectiveW, CARD_H, C.matched, 0.9);
        game.draw.rect(cx - effectiveW / 2 + 8, r.y + 8, effectiveW - 16, 16, C.matchHi, 0.3);
        drawSymbol(SYMBOLS[cards[i]], cx, cy);
        game.draw.circle(cx - CARD_W / 2 + 24, r.y + 20, 12, C.matchHi, 0.8);
      } else if (isFlipped || anim) {
        // Face up
        var showFront = isFlipped || (anim && anim.t > 0.5);
        if (showFront) {
          game.draw.rect(cx - effectiveW / 2, r.y, effectiveW, CARD_H, C.cardHi, 1.0);
          game.draw.rect(cx - effectiveW / 2 + 8, r.y + 8, effectiveW - 16, 16, '#fff', 0.08);
          if (effectiveW > CARD_W * 0.4) {
            drawSymbol(SYMBOLS[cards[i]], cx, cy);
          }
        } else {
          game.draw.rect(cx - effectiveW / 2, r.y, effectiveW, CARD_H, C.back, 1.0);
          game.draw.rect(cx - effectiveW / 2 + 8, r.y + 8, effectiveW - 16, 16, C.backHi, 0.3);
        }
      } else {
        // Face down
        game.draw.rect(r.x, r.y, CARD_W, CARD_H, C.back, 1.0);
        game.draw.rect(r.x + 8, r.y + 8, CARD_W - 16, 16, C.backHi, 0.3);
        // Pattern on back
        game.draw.circle(r.x + CARD_W / 2, r.y + CARD_H / 2, 40, C.backHi, 0.15);
        game.draw.circle(r.x + CARD_W / 2, r.y + CARD_H / 2, 24, C.backHi, 0.1);
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, '#080c14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.35 ? C.back : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Progress
    var pairsFound = matched.length / 2;
    game.draw.text(pairsFound + ' / 8 ペア', W / 2, 140, { size: 52, color: C.matchHi, bold: true });

    // Guide
    game.draw.text('タップでカードをめくれ！', W / 2, H - 200, { size: 50, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initCards();
  });
})(game);
