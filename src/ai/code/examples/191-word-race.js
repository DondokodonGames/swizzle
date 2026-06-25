// 191-word-race.js
// ワードレース — 落ちてくる文字パネルを正しい順番にタップして単語を完成させる
// 操作: タップで文字を選択
// 成功: 10単語完成  失敗: 5回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040c',
    tile:    '#1e1040',
    tileHi:  '#2d1860',
    correct: '#22c55e',
    wrong:   '#ef4444',
    active:  '#a855f7',
    activeHi:'#d8b4fe',
    ui:      '#334155'
  };

  var WORDS = ['ねこ', 'いぬ', 'とり', 'さかな', 'うま', 'きつね', 'くま', 'うし', 'ぶた', 'さる',
               'たこ', 'えび', 'かに', 'いか', 'くじら'];
  var TILE_W = 180;
  var TILE_H = 160;
  var GAP = 20;
  var FALL_SPEED = 90;

  var currentWord = '';
  var targetWord = '';
  var tiles = [];
  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 5;
  var done = false;
  var timeLeft = 45;
  var nextSpawnT = 0;
  var elapsed = 0;
  var particles = [];
  var feedback = 0;
  var feedbackOk = false;
  var shuffleTimer = 0;

  function pickWord() {
    var w = WORDS[Math.floor(Math.random() * WORDS.length)];
    return w;
  }

  function spawnWordTiles() {
    targetWord = pickWord();
    currentWord = '';
    var chars = targetWord.split('');
    // Shuffle
    var shuffled = chars.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    // Distribute in columns
    var numCols = Math.min(shuffled.length, 5);
    var totalW = numCols * (TILE_W + GAP) - GAP;
    var startX = (W - totalW) / 2;
    for (var ci = 0; ci < shuffled.length; ci++) {
      var col = ci % numCols;
      var startY = -TILE_H - ci * 40;
      tiles.push({
        char: shuffled[ci],
        x: startX + col * (TILE_W + GAP),
        y: startY,
        vx: 0,
        vy: FALL_SPEED,
        hit: false,
        correct: false
      });
    }
    shuffleTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var ti = 0; ti < tiles.length; ti++) {
      var t = tiles[ti];
      if (t.hit) continue;
      if (tx > t.x && tx < t.x + TILE_W && ty > t.y && ty < t.y + TILE_H) {
        var expectedChar = targetWord[currentWord.length];
        if (t.char === expectedChar) {
          t.hit = true;
          t.correct = true;
          currentWord += t.char;
          feedbackOk = true; feedback = 0.2;
          game.audio.play('se_tap', 0.5);
          if (currentWord === targetWord) {
            score++;
            game.audio.play('se_success', 0.8);
            for (var pi = 0; pi < 10; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: t.x + TILE_W / 2, y: t.y + TILE_H / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5 });
            }
            if (score >= needed && !done) {
              done = true;
              setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 30); }, 400);
            } else {
              tiles = [];
              setTimeout(spawnWordTiles, 400);
            }
          }
        } else {
          misses++;
          feedbackOk = false; feedback = 0.4;
          game.audio.play('se_failure', 0.4);
          currentWord = '';
          // Reset tile hit state
          for (var ti2 = 0; ti2 < tiles.length; ti2++) tiles[ti2].hit = false;
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
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
    if (feedback > 0) feedback -= dt;
    shuffleTimer += dt;

    // Move tiles
    var offScreen = 0;
    for (var ti3 = 0; ti3 < tiles.length; ti3++) {
      var t2 = tiles[ti3];
      if (!t2.hit) {
        t2.y += t2.vy * dt;
        if (t2.y > H + 20) offScreen++;
      }
    }
    if (offScreen > 0 && tiles.length > 0) {
      // Missed tiles — penalize and respawn
      misses++;
      game.audio.play('se_failure', 0.3);
      tiles = [];
      currentWord = '';
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      } else {
        spawnWordTiles();
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target word display
    game.draw.text(targetWord, W / 2, H * 0.88, { size: 72, color: C.activeHi, bold: true });
    game.draw.text('↑この順でタップ', W / 2, H * 0.93, { size: 36, color: C.ui });

    // Progress display
    if (currentWord.length > 0) {
      game.draw.text(currentWord, W / 2, H * 0.83, { size: 56, color: C.correct, bold: true });
    }

    // Tiles
    for (var ti4 = 0; ti4 < tiles.length; ti4++) {
      var t3 = tiles[ti4];
      if (t3.hit) continue;
      var expectedC = targetWord[currentWord.length];
      var isNext = t3.char === expectedC;

      game.draw.rect(t3.x, t3.y, TILE_W, TILE_H, isNext ? C.active : C.tile, 0.9);
      game.draw.rect(t3.x + 6, t3.y + 6, TILE_W - 12, 24, isNext ? C.activeHi : C.tileHi, 0.3);
      game.draw.text(t3.char, t3.x + TILE_W / 2, t3.y + TILE_H / 2, { size: 72, color: '#fff', bold: true });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 12 * part.life * 2, C.correct, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.1);
    }

    // Miss indicators
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 - (maxMisses - 1) * 30 + mi * 60, 180, 20, mi < misses ? C.wrong : '#1a1028');
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 56, color: '#f1f5f9', bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spawnWordTiles();
  });
})(game);
