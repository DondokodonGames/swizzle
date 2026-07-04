// 680-number-tap.js
// ナンバータップ — 盤面に散らばった数字を、1から順にできるだけ速くタップする
// 操作: 光っている次の数字（NEXT）を探してタップ。順番を間違えると軽いペナルティ
// 成功: 1〜16 を全押し  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、数字盤） ──
  var C = { bg:'#040312', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER TAP';
  var HOW_TO_PLAY = 'TAP THE NUMBERS 1 TO 16 IN ORDER AS FAST AS YOU CAN';
  var MAX_TIME = 20;
  var GRID_COLS = 4, GRID_ROWS = 4, TOTAL = 16, CELL = 210, GAP = 14;
  var GRID_W = GRID_COLS * CELL + (GRID_COLS - 1) * GAP, GRID_H = GRID_ROWS * CELL + (GRID_ROWS - 1) * GAP;
  var GRID_X = snap((W - GRID_W) / 2), GRID_Y = snap((H - GRID_H) / 2 + 60);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var positions, cellDone, nextNum, timeLeft, done, flash, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#060412');
  }

  function background() { game.draw.clear(C.bg); }

  function cellX(col) { return GRID_X + col * (CELL + GAP); }
  function cellY(row) { return GRID_Y + row * (CELL + GAP); }

  function initGame() {
    var cells = []; for (var r = 0; r < GRID_ROWS; r++) for (var c = 0; c < GRID_COLS; c++) cells.push({ row: r, col: c });
    for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    positions = cells; cellDone = []; for (var k = 0; k < TOTAL; k++) cellDone.push(false);
    nextNum = 1; timeLeft = MAX_TIME; done = false; flash = 0; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 200 + 3000) : (nextNum - 1) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ni = 0; ni < TOTAL; ni++) {
      var pos = positions[ni], cx = cellX(pos.col), cy = cellY(pos.row), num = ni + 1, isDone = cellDone[ni], isNext = num === nextNum;
      if (isDone) { game.draw.rect(cx, cy, CELL, CELL, '#1e1b4b', 0.85); txt('' + num, cx + CELL / 2, cy + CELL / 2 + 14, 44, '#312e81'); }
      else if (isNext) { var pu = 0.75 + 0.25 * Math.sin(game.time.elapsed * 7); game.draw.rect(cx, cy, CELL, CELL, C.d, pu); game.draw.rect(cx, cy, CELL, 8, C.g, 0.7); txt('' + num, cx + CELL / 2, cy + CELL / 2 + 18, 68, C.g); }
      else { game.draw.rect(cx, cy, CELL, CELL, '#0e0c2a', 0.85); game.draw.rect(cx, cy, CELL, 6, C.e, 0.3); txt('' + num, cx + CELL / 2, cy + CELL / 2 + 16, 56, C.g); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    if ((tx - GRID_X) - col * (CELL + GAP) > CELL || (ty - GRID_Y) - row * (CELL + GAP) > CELL) return;
    var tn = -1; for (var i = 0; i < TOTAL; i++) if (positions[i].row === row && positions[i].col === col) { tn = i + 1; break; }
    if (tn < 0) return;
    if (tn === nextNum) {
      cellDone[tn - 1] = true; var pos = positions[tn - 1];
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: cellX(pos.col) + CELL / 2, y: cellY(pos.row) + CELL / 2, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.c }); }
      game.audio.play('se_tap', 0.1); nextNum++; if (nextNum > TOTAL) { finish(true); return; }
    } else { flash = 0.18; game.audio.play('se_failure', 0.12); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!positions) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL TAPPED!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.06);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('NEXT ' + nextNum + '   ' + (nextNum - 1) + ' / ' + TOTAL, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
