// 609-tile-flip.js
// タイルフリップ — 裏返ったタイルを2枚めくり、同じ絵柄のペアを揃える神経衰弱
// 操作: タップで1枚めくる。2枚が同じ絵柄なら成立、違えば裏へ戻る
// 成功: 4ペア 全成立  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶盤） ──
  var C = { bg:'#0d1117', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE FLIP';
  var HOW_TO_PLAY = 'FLIP TWO TILES TO FIND MATCHING SYMBOLS · CLEAR ALL 4 PAIRS';
  var MAX_TIME = 25;
  var PAIRS = 4;             // 修正2: 8 → 4

  // 4ペア = 8タイル。色+形の組合せをシンボルに
  var SYMBOLS = [
    { col: C.a, shape: 'circle' },
    { col: C.d, shape: 'square' },
    { col: C.e, shape: 'triangle' },
    { col: C.c, shape: 'diamond' }
  ];
  var COLS_COUNT = 2, ROWS_COUNT = 4, TILE_W = 380, TILE_H = 300, PAD = 24;
  var START_X = snap((W - (TILE_W + PAD) * COLS_COUNT + PAD) / 2);
  var START_Y = snap(H * 0.26);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, flipped, matched, moves, timeLeft, done, flipLock, flash, flashCol, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a0f1a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    var deck = [];
    for (var i = 0; i < PAIRS; i++) deck.push(i, i);
    for (var j = deck.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = deck[j]; deck[j] = deck[k]; deck[k] = t; }
    tiles = [];
    for (var r = 0; r < ROWS_COUNT; r++) for (var c = 0; c < COLS_COUNT; c++) {
      var idx = r * COLS_COUNT + c;
      tiles.push({ x: START_X + c * (TILE_W + PAD), y: START_Y + r * (TILE_H + PAD), sym: deck[idx], faceUp: false, matched: false, phase: Math.random() * Math.PI * 2 });
    }
    flipped = []; matched = 0; moves = 0; timeLeft = MAX_TIME; done = false; flipLock = false; flash = 0; flashCol = C.b; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (matched * 800 + Math.ceil(timeLeft) * 120 - moves * 20) : matched * 200;
    if (finalScore < 0) finalScore = 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawShape(sym, cx, cy, size) {
    var s = SYMBOLS[sym];
    if (s.shape === 'circle') { pc(cx, cy, size * 0.34, s.col, 0.95); pc(cx - size * 0.12, cy - size * 0.12, size * 0.1, C.g, 0.5); }
    else if (s.shape === 'square') { var h = size * 0.3; game.draw.rect(snap(cx - h), snap(cy - h), h * 2, h * 2, s.col, 0.95); game.draw.rect(snap(cx - h * 0.5), snap(cy - h * 0.7), h * 0.4, h * 0.4, C.g, 0.5); }
    else if (s.shape === 'triangle') { var r = size * 0.36; for (var yy = -r; yy <= r; yy += 8) { var wr = (yy + r) / (2 * r); game.draw.rect(snap(cx - wr * r), snap(cy + yy - 4), wr * r * 2, 8, s.col, 0.95); } }
    else if (s.shape === 'diamond') { var d = size * 0.36; for (var yy2 = -d; yy2 <= d; yy2 += 8) { var wd = (1 - Math.abs(yy2) / d) * d; game.draw.rect(snap(cx - wd), snap(cy + yy2 - 4), wd * 2, 8, s.col, 0.95); } }
  }

  function drawScene() {
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i], cx = t.x + TILE_W / 2, cy = t.y + TILE_H / 2;
      if (t.matched) { game.draw.rect(t.x, t.y, TILE_W, TILE_H, C.b, 0.15); game.draw.rect(t.x, t.y, TILE_W, 6, C.b, 0.6); drawShape(t.sym, cx, cy, TILE_H); }
      else if (t.faceUp) { game.draw.rect(t.x, t.y, TILE_W, TILE_H, '#2a5080', 0.9); game.draw.rect(t.x, t.y, TILE_W, 6, C.c, 0.7); drawShape(t.sym, cx, cy, TILE_H); }
      else { game.draw.rect(t.x, t.y, TILE_W, TILE_H, '#0a2040', 0.9); game.draw.rect(t.x + 6, t.y + 6, TILE_W - 12, TILE_H - 12, '#1e3a5f', 0.4); pc(cx, cy, TILE_H * 0.16, C.d, 0.25); txt('?', cx, cy + 16, 60, C.d); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || flipLock || flipped.length >= 2) return;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i]; if (t.matched || t.faceUp) continue;
      if (tx >= t.x && tx <= t.x + TILE_W && ty >= t.y && ty <= t.y + TILE_H) {
        t.faceUp = true; flipped.push(i); game.audio.play('se_tap', 0.25);
        if (flipped.length === 2) {
          moves++; var t1 = tiles[flipped[0]], t2 = tiles[flipped[1]];
          if (t1.sym === t2.sym) {
            matched++; t1.matched = true; t2.matched = true; flipped = []; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.6);
            var cx = (t1.x + t2.x) / 2 + TILE_W / 2, cy = (t1.y + t2.y) / 2 + TILE_H / 2;
            for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.c }); }
            if (matched >= PAIRS) { finish(true); return; }
          } else {
            flash = 0.2; flashCol = C.a; flipLock = true; var f0 = flipped[0], f1 = flipped[1];
            setTimeout(function() { tiles[f0].faceUp = false; tiles[f1].faceUp = false; flipped = []; flipLock = false; }, 800);
          }
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL MATCHED!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      for (var ti = 0; ti < tiles.length; ti++) tiles[ti].phase += dt * 1.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(matched + ' / ' + PAIRS, W / 2, 168, 48, C.b);
    txt('MOVES ' + moves, W / 2, 224, 30, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
