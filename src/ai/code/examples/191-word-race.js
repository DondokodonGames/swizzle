// 191-word-race.js
// ワードレース — 落ちてくる文字パネルを正しい順にタップして単語を完成させる
// 操作: タップで文字を選択
// 成功: 1単語完成  失敗: 5回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、文字盤） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD RACE';
  var HOW_TO_PLAY = 'TAP LETTERS IN ORDER TO SPELL THE WORD';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_MISS = 5;
  var WORDS = ['ねこ', 'いぬ', 'とり', 'うま', 'くま', 'たこ', 'かに', 'いか'];
  var TILE_W = 200, TILE_H = 180, GAP = 24, FALL_SPEED = 70;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, current, tiles, score, misses, timeLeft, done, feedback, feedbackOk, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawTile(t, isNext) {
    game.draw.rect(t.x, t.y, TILE_W, TILE_H, isNext ? C.e : C.d, 0.9);
    game.draw.rect(t.x, t.y, TILE_W, 8, isNext ? C.g : C.a);
    txt(t.char, t.x + TILE_W / 2, t.y + TILE_H / 2 - 8, 84, C.g);
  }

  function spawnTiles() {
    target = WORDS[Math.floor(Math.random() * WORDS.length)]; current = '';
    var chars = target.split('');
    for (var i = chars.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp; }
    tiles = [];
    var n = chars.length, totalW = n * (TILE_W + GAP) - GAP, sx = snap((W - totalW) / 2);
    for (var ci = 0; ci < n; ci++) tiles.push({ char: chars[ci], x: snap(sx + ci * (TILE_W + GAP)), y: -TILE_H - ci * 60, vy: FALL_SPEED, hit: false });
  }

  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; particles = []; spawnTiles(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ti = 0; ti < tiles.length; ti++) {
      var t = tiles[ti];
      if (t.hit) continue;
      if (x > t.x && x < t.x + TILE_W && y > t.y && y < t.y + TILE_H) {
        if (t.char === target[current.length]) {
          t.hit = true; current += t.char; feedbackOk = true; feedback = 0.2;
          game.audio.play('se_tap', 0.5);
          if (current === target) {
            score++;
            for (var pi = 0; pi < 10; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: t.x + TILE_W / 2, y: t.y + TILE_H / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5 }); }
            if (score >= NEEDED) { finish(true); return; }
            spawnTiles();
          }
        } else {
          misses++; feedbackOk = false; feedback = 0.4; current = '';
          for (var ti2 = 0; ti2 < tiles.length; ti2++) tiles[ti2].hit = false;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawTile({ char: 'A', x: W / 2 - 100, y: H * 0.4 + Math.sin(game.time.elapsed * 2) * 40 }, true);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.80, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WORD DONE!' : 'GAME OVER', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var off = 0;
      for (var ti = 0; ti < tiles.length; ti++) { if (!tiles[ti].hit) { tiles[ti].y += tiles[ti].vy * dt; if (tiles[ti].y > H + 20) off++; } }
      if (off > 0) { misses++; game.audio.play('se_failure', 0.3); current = ''; if (misses >= MAX_MISS) { finish(false); return; } spawnTiles(); }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var ti3 = 0; ti3 < tiles.length; ti3++) if (!tiles[ti3].hit) drawTile(tiles[ti3], tiles[ti3].char === target[current.length]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    txt('SPELL:  ' + target, W / 2, H - 130, 56, C.c);
    if (current) txt(current, W / 2, H - 70, 44, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 168, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
