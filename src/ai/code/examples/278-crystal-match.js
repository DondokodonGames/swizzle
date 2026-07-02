// 278-crystal-match.js
// クリスタルマッチ — 隣同士を入れ替えて同色3つ以上を並べて消す、宝石そろえパズル
// 操作: クリスタルをタップして隣と交換
// 成功: 6個消す  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宝石鉱山） ──
  var C = { bg:'#030210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEMS = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL MATCH';
  var HOW_TO_PLAY = 'TAP TWO NEIGHBORS TO SWAP · MATCH 3+';
  var MAX_TIME = 15;
  var NEEDED   = 6;           // 修正2: 100 → 6
  var COLS = 5, ROWS = 6, TOP = 260;
  var CW = snap((W - 80) / COLS), CH = snap((H * 0.5) / ROWS), OX = snap((W - COLS * CW) / 2), OY = TOP;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, selected, cleared, timeLeft, done, particles, settleTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.35) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0130');
  }

  function background() { game.draw.clear(C.bg); }

  function rnd() { return Math.floor(Math.random() * GEMS.length); }

  function initGrid() { grid = []; for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = rnd(); } var m = findMatches(); while (m.length) { for (var i = 0; i < m.length; i++) grid[m[i].r][m[i].c] = rnd(); m = findMatches(); } }

  function findMatches() {
    var out = [], seen = {};
    function mark(r, c) { var k = r + ',' + c; if (!seen[k]) { seen[k] = 1; out.push({ r: r, c: c }); } }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS - 2; c++) { var v = grid[r][c]; if (grid[r][c + 1] === v && grid[r][c + 2] === v) { mark(r, c); mark(r, c + 1); mark(r, c + 2); var k = 3; while (c + k < COLS && grid[r][c + k] === v) { mark(r, c + k); k++; } } }
    for (var r2 = 0; r2 < ROWS - 2; r2++) for (var c2 = 0; c2 < COLS; c2++) { var v2 = grid[r2][c2]; if (grid[r2 + 1][c2] === v2 && grid[r2 + 2][c2] === v2) { mark(r2, c2); mark(r2 + 1, c2); mark(r2 + 2, c2); var k2 = 3; while (r2 + k2 < ROWS && grid[r2 + k2][c2] === v2) { mark(r2 + k2, c2); k2++; } } }
    return out;
  }

  function clearMatches(m) {
    for (var i = 0; i < m.length; i++) { var r = m[i].r, c = m[i].c, x = OX + c * CW + CW / 2, y = OY + r * CH + CH / 2; for (var pk = 0; pk < 4; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: GEMS[grid[r][c]] }); } grid[r][c] = -1; }
    cleared += m.length;
    for (var cc = 0; cc < COLS; cc++) { var fill = []; for (var rr = ROWS - 1; rr >= 0; rr--) if (grid[rr][cc] !== -1) fill.push(grid[rr][cc]); while (fill.length < ROWS) fill.push(rnd()); for (var r4 = ROWS - 1; r4 >= 0; r4--) grid[r4][cc] = fill[ROWS - 1 - r4]; }
    settleTimer = 0.2; game.audio.play('se_success', 0.4);
  }

  function initGame() { initGrid(); selected = null; cleared = 0; timeLeft = MAX_TIME; done = false; particles = []; settleTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 200 + Math.ceil(timeLeft) * 60) : cleared * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var x = OX + c * CW + CW / 2, y = OY + r * CH + CH / 2, rr = Math.min(CW, CH) * 0.4, sel = selected && selected.c === c && selected.r === r; pc(x, y, rr, GEMS[grid[r][c]], 0.9); pc(x - rr * 0.3, y - rr * 0.3, rr * 0.2, C.g, 0.5); if (sel) ring(x, y, rr + 10, C.g, 0.5 + 0.3 * (Math.floor(game.time.elapsed * 8) % 2)); } }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || settleTimer > 0) return;
    var c = Math.floor((x - OX) / CW), r = Math.floor((y - OY) / CH);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { selected = null; return; }
    if (!selected) { selected = { c: c, r: r }; game.audio.play('se_tap', 0.2); }
    else {
      var dc = Math.abs(c - selected.c), dr = Math.abs(r - selected.r);
      if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
        var t = grid[selected.r][selected.c]; grid[selected.r][selected.c] = grid[r][c]; grid[r][c] = t;
        var m = findMatches(); if (m.length) clearMatches(m); else { var t2 = grid[selected.r][selected.c]; grid[selected.r][selected.c] = grid[r][c]; grid[r][c] = t2; game.audio.play('se_failure', 0.3); }
      }
      selected = null;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (settleTimer > 0) { settleTimer -= dt; if (settleTimer <= 0) { var m = findMatches(); if (m.length) clearMatches(m); } }
      if (cleared >= NEEDED) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
