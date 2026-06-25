// 323-tile-flip.js
// タイルフリップ — 記憶力ゲーム：同じ絵柄のタイルを2枚ずつ見つけ出す
// 操作: タップでタイルをめくる（2枚ずつ）
// 成功: 全ペア発見  失敗: 30回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0c1e',
    tile:   '#1e1b4b',
    tileHi: '#312e81',
    tileOpen:'#3730a3',
    match:  '#22c55e',
    matchHi:'#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // 4x4 grid = 16 tiles = 8 pairs
  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var TILE_W = 220;
  var TILE_H = 220;
  var GAP = 20;
  var GRID_LEFT = (W - GRID_COLS * TILE_W - (GRID_COLS - 1) * GAP) / 2;
  var GRID_TOP = H * 0.22;

  var SYMBOLS = ['★', '♥', '♦', '♣', '☀', '☽', '♪', '✦'];
  var SYMBOL_COLORS = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a78bfa', '#06b6d4', '#f472b6'];

  var tiles = [];
  var flipped = []; // indices of currently face-up unmatched tiles
  var matched = [];
  var mistakes = 0;
  var MAX_MISTAKES = 30;
  var totalPairs = GRID_COLS * GRID_ROWS / 2;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var lockTimer = 0; // lock input during flip-back animation
  var particles = [];

  function initTiles() {
    var pairs = [];
    for (var i = 0; i < totalPairs; i++) {
      pairs.push(i, i);
    }
    // Shuffle
    for (var s = pairs.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = pairs[s]; pairs[s] = pairs[j]; pairs[j] = t;
    }
    tiles = [];
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        var idx = r * GRID_COLS + c;
        tiles.push({
          x: GRID_LEFT + c * (TILE_W + GAP),
          y: GRID_TOP + r * (TILE_H + GAP),
          symbol: pairs[idx],
          faceUp: false,
          matched: false,
          flipAnim: 0 // 0=face-down, 1=face-up
        });
      }
    }
    flipped = [];
    matched = [];
  }

  game.onTap(function(tx, ty) {
    if (done || lockTimer > 0) return;

    // Find tapped tile
    for (var ti = 0; ti < tiles.length; ti++) {
      var t = tiles[ti];
      if (t.matched || t.faceUp) continue;
      if (tx >= t.x && tx <= t.x + TILE_W && ty >= t.y && ty <= t.y + TILE_H) {
        t.faceUp = true;
        t.flipAnim = 1;
        flipped.push(ti);
        game.audio.play('se_tap', 0.25);

        if (flipped.length === 2) {
          var a = tiles[flipped[0]];
          var b = tiles[flipped[1]];
          if (a.symbol === b.symbol) {
            // Match!
            a.matched = true;
            b.matched = true;
            matched.push(flipped[0], flipped[1]);
            game.audio.play('se_success', 0.5);
            for (var pi = 0; pi < 6; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: (a.x + b.x) / 2 + TILE_W / 2, y: (a.y + b.y) / 2 + TILE_H / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: SYMBOL_COLORS[a.symbol] });
            }
            flipped = [];
            if (matched.length === tiles.length && !done) {
              done = true;
              setTimeout(function() { game.end.success((totalPairs * 200) - mistakes * 30 + Math.ceil(timeLeft) * 100); }, 600);
            }
          } else {
            // No match
            mistakes++;
            game.audio.play('se_failure', 0.25);
            var savedFlipped = flipped.slice();
            flipped = [];
            lockTimer = 1.2;
            setTimeout(function() {
              tiles[savedFlipped[0]].faceUp = false;
              tiles[savedFlipped[1]].faceUp = false;
              if (mistakes >= MAX_MISTAKES && !done) {
                done = true;
                setTimeout(function() { game.end.failure(); }, 300);
              }
            }, 1000);
          }
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (lockTimer > 0) lockTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tiles
    for (var ti2 = 0; ti2 < tiles.length; ti2++) {
      var tile = tiles[ti2];
      var tx2 = tile.x, ty2 = tile.y;

      if (tile.matched) {
        game.draw.rect(tx2 + 4, ty2 + 4, TILE_W - 8, TILE_H - 8, C.match, 0.3);
        game.draw.rect(tx2, ty2, TILE_W, TILE_H, C.matchHi, 0.15);
        game.draw.text(SYMBOLS[tile.symbol], tx2 + TILE_W / 2, ty2 + TILE_H / 2 + 28, { size: 80, color: SYMBOL_COLORS[tile.symbol], bold: true });
      } else if (tile.faceUp || flipped.indexOf(ti2) >= 0) {
        game.draw.rect(tx2, ty2, TILE_W, TILE_H, C.tileOpen, 0.9);
        game.draw.rect(tx2 + 4, ty2 + 4, TILE_W - 8, TILE_H - 8, C.tileHi, 0.3);
        game.draw.text(SYMBOLS[tile.symbol], tx2 + TILE_W / 2, ty2 + TILE_H / 2 + 28, { size: 80, color: SYMBOL_COLORS[tile.symbol], bold: true });
      } else {
        game.draw.rect(tx2, ty2, TILE_W, TILE_H, C.tile, 0.9);
        game.draw.rect(tx2 + 4, ty2 + 4, TILE_W - 8, TILE_H - 8, C.tileHi, 0.2);
        game.draw.text('?', tx2 + TILE_W / 2, ty2 + TILE_H / 2 + 22, { size: 72, color: C.tileHi, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    var pairsLeft = totalPairs - matched.length / 2;
    game.draw.text('残り ' + pairsLeft + ' ペア', W / 2, H * 0.88, { size: 44, color: C.ui });
    game.draw.text('ミス: ' + mistakes, W / 2, H * 0.92, { size: 36, color: mistakes > 20 ? C.wrong : C.ui });

    game.draw.text(matched.length / 2 + ' / ' + totalPairs, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tileOpen : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initTiles();
  });
})(game);
