// 609-tile-flip.js
// タイルフリップ — 裏返ったタイルをすべて表に戻す記憶と速度の勝負
// 操作: タップで2枚めくって同じ絵柄を探す
// 成功: 8ペア全完成  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0d1117',
    card:    '#1e3a5f',
    cardHi:  '#2a5080',
    back:    '#0a2040',
    match:   '#22c55e',
    matchHi: '#86efac',
    flip:    '#f59e0b',
    text:    '#f1f5f9',
    ui:      '#0a0f1a',
    miss:    '#ef4444'
  };

  // 8 pairs = 16 tiles, using color+shape combos as "symbols"
  var SYMBOLS = [
    { col: '#ff6347', shape: 'circle' },
    { col: '#7b68ee', shape: 'square' },
    { col: '#00ced1', shape: 'triangle' },
    { col: '#ffd700', shape: 'diamond' },
    { col: '#ff69b4', shape: 'circle' },
    { col: '#32cd32', shape: 'square' },
    { col: '#ff8c00', shape: 'triangle' },
    { col: '#9370db', shape: 'diamond' }
  ];

  var COLS_COUNT = 4;
  var ROWS_COUNT = 4;
  var TILE_W = 220;
  var TILE_H = 220;
  var PAD = 20;
  var START_X = (W - (TILE_W + PAD) * COLS_COUNT + PAD) / 2;
  var START_Y = H * 0.22;

  var tiles = [];
  var flipped = []; // indices of currently face-up tiles (not matched)
  var matched = 0;
  var moves = 0;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flipLock = false;
  var flashAnim = 0, flashCol = C.match;
  var particles = [];

  function initTiles() {
    var deck = [];
    for (var i = 0; i < SYMBOLS.length; i++) {
      deck.push(i, i); // pair
    }
    // Shuffle
    for (var j = deck.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = deck[j]; deck[j] = deck[k]; deck[k] = tmp;
    }
    tiles = [];
    for (var r = 0; r < ROWS_COUNT; r++) {
      for (var c = 0; c < COLS_COUNT; c++) {
        var idx = r * COLS_COUNT + c;
        tiles.push({
          x: START_X + c * (TILE_W + PAD),
          y: START_Y + r * (TILE_H + PAD),
          sym: deck[idx],
          faceUp: false,
          matched: false,
          flipAnim: 0, // 0=face down, 1=face up
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || flipLock) return;
    if (flipped.length >= 2) return;

    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t.matched || t.faceUp) continue;
      if (tx >= t.x && tx <= t.x + TILE_W && ty >= t.y && ty <= t.y + TILE_H) {
        t.faceUp = true;
        flipped.push(i);
        game.audio.play('se_tap', 0.25);

        if (flipped.length === 2) {
          moves++;
          var t1 = tiles[flipped[0]], t2 = tiles[flipped[1]];
          if (t1.sym === t2.sym) {
            // Match!
            matched++;
            t1.matched = true;
            t2.matched = true;
            flipped = [];
            flashCol = C.match;
            flashAnim = 0.3;
            game.audio.play('se_success', 0.6);
            var cx = (t1.x + t2.x) / 2 + TILE_W / 2;
            var cy = (t1.y + t2.y) / 2 + TILE_H / 2;
            for (var p = 0; p < 8; p++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.matchHi });
            }
            if (matched >= 8 && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(matched * 500 + Math.ceil(timeLeft) * 100 - moves * 20); }, 800);
            }
          } else {
            // No match
            flashCol = C.miss;
            flashAnim = 0.2;
            flipLock = true;
            var f0 = flipped[0], f1 = flipped[1];
            setTimeout(function() {
              tiles[f0].faceUp = false;
              tiles[f1].faceUp = false;
              flipped = [];
              flipLock = false;
            }, 800);
          }
        }
        break;
      }
    }
  });

  function drawShape(sym, cx, cy, size) {
    var s = SYMBOLS[sym];
    if (s.shape === 'circle') {
      game.draw.circle(cx, cy, size * 0.4, s.col, 0.9);
      game.draw.circle(cx - size * 0.12, cy - size * 0.12, size * 0.12, '#fff', 0.5);
    } else if (s.shape === 'square') {
      var h = size * 0.38;
      game.draw.rect(cx - h, cy - h, h * 2, h * 2, s.col, 0.9);
      game.draw.rect(cx - h * 0.5, cy - h * 0.8, h * 0.3, h * 0.3, '#fff', 0.5);
    } else if (s.shape === 'triangle') {
      var r = size * 0.4;
      game.draw.line(cx, cy - r, cx + r * 0.87, cy + r * 0.5, s.col, 6);
      game.draw.line(cx + r * 0.87, cy + r * 0.5, cx - r * 0.87, cy + r * 0.5, s.col, 6);
      game.draw.line(cx - r * 0.87, cy + r * 0.5, cx, cy - r, s.col, 6);
      game.draw.circle(cx, cy - r * 0.5, r * 0.12, '#fff', 0.5);
    } else if (s.shape === 'diamond') {
      var d = size * 0.42;
      game.draw.line(cx, cy - d, cx + d * 0.6, cy, s.col, 6);
      game.draw.line(cx + d * 0.6, cy, cx, cy + d, s.col, 6);
      game.draw.line(cx, cy + d, cx - d * 0.6, cy, s.col, 6);
      game.draw.line(cx - d * 0.6, cy, cx, cy - d, s.col, 6);
    }
  }

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

    for (var ti = 0; ti < tiles.length; ti++) {
      tiles[ti].phase += dt * 1.5;
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var cx = t.x + TILE_W / 2;
      var cy = t.y + TILE_H / 2;
      var pulse = 1 + Math.sin(t.phase) * 0.02;

      if (t.matched) {
        game.draw.rect(t.x, t.y, TILE_W, TILE_H, C.match, 0.15);
        game.draw.rect(t.x + 4, t.y + 4, TILE_W - 8, TILE_H - 8, C.matchHi, 0.08);
        drawShape(t.sym, cx, cy, TILE_W * pulse);
        game.draw.rect(t.x, t.y, TILE_W, 4, C.matchHi, 0.5);
      } else if (t.faceUp) {
        game.draw.rect(t.x, t.y, TILE_W, TILE_H, C.cardHi, 0.9);
        game.draw.rect(t.x + 4, t.y + 4, TILE_W - 8, TILE_H - 8, C.card, 0.3);
        drawShape(t.sym, cx, cy, TILE_W);
        game.draw.rect(t.x, t.y, TILE_W, 4, C.flip, 0.7);
      } else {
        game.draw.rect(t.x, t.y, TILE_W, TILE_H, C.back, 0.9);
        game.draw.rect(t.x + 4, t.y + 4, TILE_W - 8, TILE_H - 8, C.card, 0.4);
        // Back pattern
        game.draw.circle(cx, cy, TILE_W * 0.3, C.cardHi, 0.12);
        game.draw.circle(cx, cy, TILE_W * 0.15, C.cardHi, 0.1);
        game.draw.rect(t.x, t.y, TILE_W, 4, C.card, 0.5);
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    game.draw.text(matched + ' / 8ペア', W / 2, 148, { size: 56, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.flip : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('手数: ' + moves, W / 2, H * 0.94, { size: 36, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    initTiles();
  });
})(game);
