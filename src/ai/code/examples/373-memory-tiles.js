// 373-memory-tiles.js
// メモリータイル — 光ったタイルの順番を記憶し、同じ順にタップして再現するサイモン式記憶ゲーム
// 操作: 光る順番を覚え、消えたら同じ順にタイルをタップ
// 成功: レベル3 クリア  失敗: 3回 間違える or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶パネル） ──
  var C = { bg:'#080618', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MEMORY TILES';
  var HOW_TO_PLAY = 'WATCH THE FLASHES · REPEAT THE ORDER';
  var MAX_TIME = 20;
  var MAX_LEVEL = 3;         // 修正2: 8 → 3
  var MAX_MISTAKES = 3;
  var GRID = 3, CELL = snap(W * 0.82 / GRID), OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.34);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var level, seq, input, showing, showIdx, showTimer, litTile, inputOn, mistakes, timeLeft, done, flashTile, flashCol, flashTimer, particles;
  var SHOW_DUR = 0.5;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function genSeq(len) { seq = []; for (var i = 0; i < len; i++) seq.push(Math.floor(Math.random() * (GRID * GRID))); }

  function startLevel() { genSeq(level + 1); input = []; inputOn = false; showing = true; showIdx = 0; showTimer = SHOW_DUR * 0.5; litTile = -1; }

  function initGame() { level = 1; mistakes = 0; timeLeft = MAX_TIME; done = false; flashTile = -1; flashCol = C.b; flashTimer = 0; particles = []; startLevel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (level * 600 + Math.ceil(timeLeft) * 100) : (level - 1) * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tileXY(idx) { return { x: OX + (idx % GRID) * CELL, y: OY + Math.floor(idx / GRID) * CELL }; }

  function drawTiles() {
    for (var idx = 0; idx < GRID * GRID; idx++) {
      var p = tileXY(idx), lit = litTile === idx, fl = flashTile === idx && flashTimer > 0;
      var col = fl ? flashCol : lit ? C.e : C.d;
      game.draw.rect(p.x + 6, p.y + 6, CELL - 12, CELL - 12, col, lit || fl ? 0.95 : 0.5);
      if (lit || fl) game.draw.rect(p.x + 14, p.y + 14, CELL - 28, 6, C.g, 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !inputOn) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
    var idx = r * GRID + c; input.push(idx);
    if (idx === seq[input.length - 1]) {
      game.audio.play('se_tap', 0.4); flashTile = idx; flashCol = C.b; flashTimer = 0.3;
      if (input.length === seq.length) {
        inputOn = false; game.audio.play('se_success', 0.6);
        for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, col: C.c }); }
        level++;
        if (level > MAX_LEVEL) { finish(true); return; }
        setTimeout(function() { if (!done && state === S.PLAYING) startLevel(); }, 1100);
      }
    } else {
      mistakes++; flashTile = idx; flashCol = C.a; flashTimer = 0.4; game.audio.play('se_failure', 0.4);
      input = [];
      if (mistakes >= MAX_MISTAKES) { finish(false); return; }
      setTimeout(function() { if (!done && state === S.PLAYING) startLevel(); }, 900);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); if (level === undefined) { level = 1; genSeq(2); litTile = -1; } drawTiles();
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RECALL!' : 'FORGOT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flashTimer > 0) flashTimer -= dt * 2;
      if (showing) {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (litTile >= 0) { litTile = -1; showTimer = SHOW_DUR * 0.3; showIdx++; }
          else if (showIdx < seq.length) { litTile = seq[showIdx]; showTimer = SHOW_DUR; game.audio.play('se_tap', 0.2); }
          else { showing = false; litTile = -1; inputOn = true; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTiles();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(showing ? 'WATCH...' : (inputOn ? 'REPEAT  ' + input.length + ' / ' + seq.length : 'GOOD!'), W / 2, snap(H * 0.74), 46, showing ? C.e : C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('LV ' + Math.min(level, MAX_LEVEL) + ' / ' + MAX_LEVEL, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISTAKES; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISTAKES - 1) / 2) * 56) - 10, 224, 20, 20, mi < mistakes ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
