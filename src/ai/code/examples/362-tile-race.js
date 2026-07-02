// 362-tile-race.js
// タイルレース — 崩れ落ちる床タイルを一段ずつ上へ跳んで進み、崩れる前にゴール列へ渡り切る
// 操作: 上/斜めの隣タイルをタップ（またはスワイプ）で跳ぶ。踏んだタイルは崩れ始める
// 成功: 3回ゴールに渡る  失敗: 3回落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、崩壊フロア） ──
  var C = { bg:'#0a0a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', water:'#0a2a70' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE RACE';
  var HOW_TO_PLAY = 'HOP UP THE TILES TO THE GOAL BEFORE THEY FALL';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var MAX_FALL = 3;          // 修正2: 4 → 3
  var COLS = 4, ROWS = 6, TW = snap((W - 80) / COLS), TH = snap((H * 0.5) / ROWS), OX = snap(40), OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, pr, pcol, reached, falls, timeLeft, done, particles, jumping, fbText, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a1a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(OX, OY, COLS * TW, ROWS * TH, C.water, 0.3); }

  function tileC(r, c) { return { x: OX + c * TW + TW / 2, y: OY + r * TH + TH / 2 }; }

  function setupTiles() { tiles = []; for (var r = 0; r < ROWS; r++) { tiles[r] = []; for (var c = 0; c < COLS; c++) { var type = r === 0 ? 'safe' : Math.random() < 0.78 ? 'safe' : 'falling'; tiles[r][c] = { type: type, timer: type === 'falling' ? 1.2 + Math.random() : 0 }; } } }

  function initGame() { setupTiles(); pr = ROWS - 1; pcol = Math.floor(COLS / 2); reached = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; jumping = false; fbText = ''; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (reached * 500 + Math.ceil(timeLeft) * 100) : reached * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function jumpTo(tr, tc) {
    if (jumping || done) return; if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return; if (tiles[tr][tc].type === 'gone') return;
    jumping = true; game.audio.play('se_tap', 0.3);
    setTimeout(function() {
      jumping = false; pr = tr; pcol = tc; var tile = tiles[pr][pcol];
      if (tile.type === 'falling' && tile.timer < 0.3) { falls++; game.audio.play('se_failure', 0.5); if (falls >= MAX_FALL) { finish(false); return; } pr = ROWS - 1; pcol = Math.floor(Math.random() * COLS); setupTiles(); return; }
      if (tile.type === 'safe') tile.type = 'falling'; if (tile.type !== 'gone') tile.timer = Math.min(tile.timer || 0.9, 0.9);
      if (pr === 0) { reached++; fbText = 'CROSSED!'; fbTimer = 0.7; game.audio.play('se_success', 0.6); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; var gc = tileC(0, pcol); particles.push({ x: gc.x, y: gc.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); } if (reached >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) { pr = ROWS - 1; pcol = Math.floor(Math.random() * COLS); setupTiles(); } }, 600); }
    }, 200);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || jumping) return;
    var c = Math.floor((x - OX) / TW), r = Math.floor((y - OY) / TH); if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    if (r === pr - 1) jumpTo(r, c);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || jumping) return;
    if (d === 'up') jumpTo(pr - 1, pcol); else if (d === 'left' && pcol > 0) jumpTo(pr, pcol - 1); else if (d === 'right' && pcol < COLS - 1) jumpTo(pr, pcol + 1);
  });

  // ── 更新 & 描画 ──
  function drawTiles() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var t = tiles[r][c], x = OX + c * TW + 4, y = OY + r * TH + 4, tw = TW - 8, th = TH - 8; if (t.type === 'gone') continue;
      if (r === 0) { game.draw.rect(x, y, tw, th, C.c, 0.8); txt('GOAL', OX + c * TW + TW / 2, OY + TH / 2 + 12, 30, '#000'); }
      else if (t.type === 'safe') game.draw.rect(x, y, tw, th, C.b, 0.7);
      else { var warn = 1 - t.timer / 1.2; game.draw.rect(x, y, tw, th, warn > 0.7 ? C.a : C.f, 0.7 - warn * 0.3); if (warn > 0.4) game.draw.rect(x + tw / 2 - 3, y, 6, th, C.a, 0.6); }
    }
    if (!jumping) { var p = tileC(pr, pcol); pc(p.x, p.y - 24, 28, C.d, 0.95); pc(p.x, p.y - 46, 16, C.g, 0.9); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); drawTiles();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MADE IT!' : 'SPLASH', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var t = tiles[r][c]; if (t.type === 'falling') { t.timer -= dt; if (t.timer <= 0) { t.type = 'gone'; if (r === pr && c === pcol && !jumping) { falls++; game.audio.play('se_failure', 0.5); if (falls >= MAX_FALL) { finish(false); return; } pr = ROWS - 1; pcol = Math.floor(Math.random() * COLS); setupTiles(); } } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTiles();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.80), 56, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(reached + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#0a0a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
