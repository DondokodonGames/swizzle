// 323-tile-flip.js
// タイルフリップ — 裏返しのタイルを2枚めくり、同じ色マークのペアを記憶で揃える神経衰弱
// 操作: タップでタイルをめくる（2枚ずつ）
// 成功: 全4ペアを揃える  失敗: 4回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶盤） ──
  var C = { bg:'#0f0c1e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SYM = [C.a, C.e, C.b, C.c];   // 4ペア分の色マーク

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'FLIP TWO TILES · MATCH THE COLOR PAIRS';
  var MAX_TIME = 15;
  var MAX_MISS = 4;          // 修正2: 30 → 4
  var COLS = 4, ROWS = 2, PAIRS = COLS * ROWS / 2;
  var TW = snap((W - 100) / COLS) - 16, TH = TW, GAP = 16;
  var GX = snap((W - (COLS * TW + (COLS - 1) * GAP)) / 2), GY = snap(H * 0.34);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, flipped, matchedCount, misses, timeLeft, done, lockTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function initTiles() {
    var pool = []; for (var i = 0; i < PAIRS; i++) pool.push(i, i);
    for (var s = pool.length - 1; s > 0; s--) { var j = Math.floor(Math.random() * (s + 1)); var t = pool[s]; pool[s] = pool[j]; pool[j] = t; }
    tiles = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var idx = r * COLS + c; tiles.push({ x: GX + c * (TW + GAP), y: GY + r * (TH + GAP), sym: pool[idx], up: false, matched: false }); }
    flipped = []; matchedCount = 0;
  }

  function initGame() { initTiles(); misses = 0; timeLeft = MAX_TIME; done = false; lockTimer = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (PAIRS * 400 - misses * 100 + Math.ceil(timeLeft) * 100) : matchedCount * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(Math.max(0, finalScore)); else game.end.failure(); }, 1800);
  }

  function drawTile(t) {
    if (t.matched) { game.draw.rect(t.x, t.y, TW, TH, '#0a2018', 0.9); pc(t.x + TW / 2, t.y + TH / 2, TW * 0.28, SYM[t.sym], 0.9); }
    else if (t.up) { game.draw.rect(t.x, t.y, TW, TH, '#241a3a', 0.95); game.draw.rect(t.x + 4, t.y + 4, TW - 8, 8, C.g, 0.2); pc(t.x + TW / 2, t.y + TH / 2, TW * 0.28, SYM[t.sym], 0.95); }
    else { game.draw.rect(t.x, t.y, TW, TH, '#161028', 0.95); game.draw.rect(t.x + 4, t.y + 4, TW - 8, 8, C.d, 0.4); txt('?', t.x + TW / 2, t.y + TH / 2 + 24, 72, C.d); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lockTimer > 0) return;
    for (var ti = 0; ti < tiles.length; ti++) {
      var t = tiles[ti];
      if (t.matched || t.up) continue;
      if (x >= t.x && x <= t.x + TW && y >= t.y && y <= t.y + TH) {
        t.up = true; flipped.push(ti); game.audio.play('se_tap', 0.25);
        if (flipped.length === 2) {
          var a = tiles[flipped[0]], b = tiles[flipped[1]];
          if (a.sym === b.sym) {
            a.matched = true; b.matched = true; matchedCount++; game.audio.play('se_success', 0.5);
            for (var k = 0; k < 6; k++) { var an = Math.random() * Math.PI * 2; particles.push({ x: (a.x + b.x) / 2 + TW / 2, y: (a.y + b.y) / 2 + TH / 2, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, life: 0.6, col: SYM[a.sym] }); }
            flipped = []; if (matchedCount >= PAIRS) { finish(true); return; }
          } else {
            misses++; game.audio.play('se_failure', 0.25); var sv = flipped.slice(); flipped = []; lockTimer = 1.0;
            setTimeout(function() { tiles[sv[0]].up = false; tiles[sv[1]].up = false; }, 900);
            if (misses >= MAX_MISS) { setTimeout(function() { finish(false); }, 300); return; }
          }
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); for (var i = 0; i < tiles.length; i++) drawTile({ x: tiles[i].x, y: tiles[i].y, matched: false, up: false, sym: 0 });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
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
      txt(resultSuccess ? 'ALL MATCHED!' : 'FORGOTTEN', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(Math.max(0, finalScore)).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (lockTimer > 0) lockTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < tiles.length; ti2++) drawTile(tiles[ti2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(matchedCount + ' / ' + PAIRS, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
