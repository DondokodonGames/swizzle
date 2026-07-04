// 615-word-chain.js
// ワードチェーン — 隣り合う文字マスをスワイプで連結し、タップで確定して得点を稼ぐ
// 操作: スワイプで隣接マスを繋ぐ → タップで確定。長く繋ぐほど倍率が上がる
// 成功: 120点 到達  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、文字盤） ──
  var C = { bg:'#060610', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD CHAIN';
  var HOW_TO_PLAY = 'SWIPE TO LINK ADJACENT LETTERS · TAP TO LOCK IN · LONGER CHAINS SCORE MORE';
  var MAX_TIME = 25;
  var NEEDED   = 120;        // 修正2: 300 → 120
  var COLS = 4, ROWS = 5, CELL_SIZE = 220, PAD = 12;
  var GRID_W = COLS * (CELL_SIZE + PAD) - PAD, GRID_OX = snap((W - GRID_W) / 2), GRID_OY = snap(H * 0.26);
  var VALUES = { A:1,E:1,I:1,O:1,U:1,R:1,S:1,T:1,L:1,N:1,B:3,C:3,D:2,F:4,G:2,H:4,J:8,K:5,M:3,P:3,Q:10,V:4,W:4,X:8,Y:4,Z:10 };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, selected, score, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lastSwipeIdx;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0f2a');
  }

  function background() { game.draw.clear(C.bg); }

  function randomLetter() { var pool = 'EEEEAAAIIIOOOUURRRSSSTTTTLLLNNNDDDGGBBCMPFHVWY'; return pool[Math.floor(Math.random() * pool.length)]; }

  function initGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var l = randomLetter(); grid.push({ r: r, c: c, letter: l, value: VALUES[l] || 1, sel: false, phase: Math.random() * Math.PI * 2 }); }
    selected = []; score = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lastSwipeIdx = -1;
  }

  function cellXY(r, c) { return { x: GRID_OX + c * (CELL_SIZE + PAD) + CELL_SIZE / 2, y: GRID_OY + r * (CELL_SIZE + PAD) + CELL_SIZE / 2 }; }

  function hitCell(tx, ty) { for (var i = 0; i < grid.length; i++) { var pos = cellXY(grid[i].r, grid[i].c); if (Math.abs(tx - pos.x) < CELL_SIZE / 2 + 8 && Math.abs(ty - pos.y) < CELL_SIZE / 2 + 8) return i; } return -1; }

  function isAdjacent(a, b) { return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 40) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function confirmWord() {
    if (selected.length < 2) { for (var i = 0; i < grid.length; i++) grid[i].sel = false; selected = []; lastSwipeIdx = -1; return; }
    var pts = 0; for (var i = 0; i < selected.length; i++) pts += grid[selected[i]].value; pts *= selected.length;
    score += pts; flash = 0.25; flashCol = C.b; resultText = '+' + pts; resultTimer = 0.6; game.audio.play('se_success', 0.5 + Math.min(pts * 0.02, 0.4));
    for (var j = 0; j < selected.length; j++) {
      var idx = selected[j], l = randomLetter(); grid[idx].letter = l; grid[idx].value = VALUES[l] || 1; grid[idx].sel = false;
      var pos = cellXY(grid[idx].r, grid[idx].c);
      for (var p = 0; p < 4; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); }
    }
    selected = []; lastSwipeIdx = -1;
    if (score >= NEEDED) { finish(true); return; }
  }

  function drawScene() {
    for (var si = 0; si < selected.length - 1; si++) { var a = cellXY(grid[selected[si]].r, grid[selected[si]].c), b2 = cellXY(grid[selected[si + 1]].r, grid[selected[si + 1]].c); game.draw.line(a.x, a.y, b2.x, b2.y, C.d, 10); }
    for (var gi = 0; gi < grid.length; gi++) {
      var cell = grid[gi], pos = cellXY(cell.r, cell.c), cx = pos.x - CELL_SIZE / 2, cy = pos.y - CELL_SIZE / 2;
      game.draw.rect(cx, cy, CELL_SIZE, CELL_SIZE, cell.sel ? C.d : '#0f1535', cell.sel ? 0.9 : 0.85);
      game.draw.rect(cx, cy, CELL_SIZE, 6, cell.sel ? C.e : '#1a2555', 0.6);
      txt(cell.letter, pos.x, pos.y + 24, 96, cell.sel ? C.g : '#e2e8f0');
      txt(cell.value + '', pos.x + CELL_SIZE * 0.3, pos.y + CELL_SIZE * 0.32, 34, cell.sel ? C.e : C.d);
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var startIdx = hitCell(x1, y1), endIdx = hitCell(x2, y2);
    if (startIdx < 0 && endIdx < 0) return;
    if (selected.length === 0 && startIdx >= 0) { grid[startIdx].sel = true; selected = [startIdx]; lastSwipeIdx = startIdx; }
    if (endIdx >= 0 && endIdx !== lastSwipeIdx && !grid[endIdx].sel && selected.length > 0) {
      var last = grid[selected[selected.length - 1]], next = grid[endIdx];
      if (isAdjacent(last, next)) { grid[endIdx].sel = true; selected.push(endIdx); lastSwipeIdx = endIdx; game.audio.play('se_tap', 0.1); }
    }
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (selected.length > 0) { confirmWord(); return; }
    var idx = hitCell(tx, ty); if (idx >= 0) { grid[idx].sel = true; selected = [idx]; lastSwipeIdx = idx; game.audio.play('se_tap', 0.15); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.13, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WORDSMITH!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var gi = 0; gi < grid.length; gi++) grid[gi].phase += dt * 1.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 60, C.c);
    else if (selected.length > 0) { var pv = 0; for (var si2 = 0; si2 < selected.length; si2++) pv += grid[selected[si2]].value; pv *= selected.length; txt('TAP TO LOCK  +' + pv, W / 2, snap(H * 0.90), 34, C.e); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
