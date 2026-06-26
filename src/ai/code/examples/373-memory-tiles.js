// 373-memory-tiles.js
// メモリータイル — 光ったタイルの順番を記憶してタップ再現
// 操作: タップでタイルを選ぶ
// 成功: レベル8クリア  失敗: 3回間違える or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a1e',
    tile:   '#1e1b4b',
    tileHi: '#312e81',
    tileLit:'#818cf8',
    tileLitHi:'#c7d2fe',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 4;
  var TILE_SIZE = 200;
  var GAP = 16;
  var OX = (W - (GRID * TILE_SIZE + (GRID - 1) * GAP)) / 2;
  var OY = H * 0.28;

  var level = 1;
  var MAX_LEVEL = 8;
  var sequence = [];
  var playerInput = [];
  var showing = false;
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_DURATION = 0.55;
  var litTile = -1;
  var inputEnabled = false;
  var mistakes = 0;
  var MAX_MISTAKES = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashTile = -1;
  var flashCol = C.correct;
  var flashTimer = 0;
  var particles = [];

  function generateSequence(len) {
    sequence = [];
    for (var i = 0; i < len; i++) {
      sequence.push(Math.floor(Math.random() * (GRID * GRID)));
    }
  }

  function startLevel() {
    var seqLen = level + 2;
    generateSequence(seqLen);
    playerInput = [];
    inputEnabled = false;
    showing = true;
    showIdx = 0;
    showTimer = SHOW_DURATION * 0.4;
    litTile = -1;
  }

  game.onTap(function(tx, ty) {
    if (done || !inputEnabled) return;
    var col = Math.floor((tx - OX) / (TILE_SIZE + GAP));
    var row = Math.floor((ty - OY) / (TILE_SIZE + GAP));
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = row * GRID + col;
    playerInput.push(idx);
    var expected = sequence[playerInput.length - 1];
    if (idx === expected) {
      game.audio.play('se_tap', 0.4);
      flashTile = idx;
      flashCol = C.correct;
      flashTimer = 0.35;
      if (playerInput.length === sequence.length) {
        // Level complete!
        inputEnabled = false;
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.7, col: C.tileLitHi });
        }
        game.audio.play('se_success', 0.6);
        level++;
        if (level > MAX_LEVEL && !done) {
          done = true;
          setTimeout(function() { game.end.success(level * 500 + Math.ceil(timeLeft) * 80); }, 1000);
        } else if (!done) {
          setTimeout(function() { startLevel(); }, 1200);
        }
      }
    } else {
      mistakes++;
      flashTile = idx;
      flashCol = C.wrong;
      flashTimer = 0.4;
      game.audio.play('se_failure', 0.4);
      // Show correct tile briefly
      setTimeout(function() {
        flashTile = expected;
        flashCol = C.tileLit;
        flashTimer = 0.5;
      }, 300);
      playerInput = [];
      if (mistakes >= MAX_MISTAKES && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      // Retry same level
      setTimeout(function() {
        if (!done) startLevel();
      }, 1000);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashTimer > 0) flashTimer -= dt * 2;

    // Show sequence animation
    if (showing) {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (litTile >= 0) {
          litTile = -1;
          showTimer = SHOW_DURATION * 0.3;
          showIdx++;
        } else if (showIdx < sequence.length) {
          litTile = sequence[showIdx];
          showTimer = SHOW_DURATION;
          game.audio.play('se_tap', 0.2);
        } else {
          showing = false;
          litTile = -1;
          inputEnabled = true;
        }
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

    // Level and progress
    game.draw.text('レベル ' + level + ' / ' + MAX_LEVEL, W / 2, 160, { size: 52, color: C.text, bold: true });
    game.draw.text(showing ? '覚えて...' : (inputEnabled ? '入力！ (' + (playerInput.length) + '/' + sequence.length + ')' : ''), W / 2, 230, { size: 38, color: showing ? C.tileLitHi : C.correct });

    // Tiles
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var idx = r * GRID + c;
        var tx = OX + c * (TILE_SIZE + GAP);
        var ty = OY + r * (TILE_SIZE + GAP);
        var isLit = litTile === idx;
        var isFlash = flashTile === idx && flashTimer > 0;
        var col;
        if (isFlash) {
          col = flashCol;
        } else if (isLit) {
          col = C.tileLit;
        } else {
          col = C.tile;
        }
        game.draw.rect(tx, ty, TILE_SIZE, TILE_SIZE, col, isLit || isFlash ? 0.95 : 0.8);
        if (isLit) {
          game.draw.rect(tx + 8, ty + 8, TILE_SIZE - 16, TILE_SIZE - 16, C.tileLitHi, 0.3);
        }
        // Tile number (subtle)
        game.draw.text((idx + 1) + '', tx + TILE_SIZE / 2, ty + TILE_SIZE / 2 + 12, { size: 36, color: isLit ? C.tileLitHi : C.tileHi });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Mistake dots
    for (var mi = 0; mi < MAX_MISTAKES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISTAKES - 1) * 32 + mi * 64, H * 0.93, 16, mi < mistakes ? C.wrong : C.tile, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tileLit : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    startLevel();
  });
})(game);
