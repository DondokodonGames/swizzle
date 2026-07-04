// 625-wire-volt.js
// ワイヤーボルト — 配線パーツをタップで回転させ、電源からゴールまで電気を通す
// 操作: タイルをタップで90度回転。電源(SRC)からゴールまで導線をつなぐと通電
// 成功: 3回路 完成  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、配電盤） ──
  var C = { bg:'#020610', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE VOLT';
  var HOW_TO_PLAY = 'TAP TILES TO ROTATE THEM · CONNECT THE WIRE FROM SRC TO THE GOAL';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var TILE_TYPES = [[0,1],[0,2],[1,2],[1,3],[0,1,2],[0,1,3],[0,2,3],[1,2,3]];
  var COLS = 5, ROWS = 5, CELL_SIZE = 168, PAD = 8;
  var GRID_W = COLS * (CELL_SIZE + PAD) - PAD, GRID_OX = snap((W - GRID_W) / 2), GRID_OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, sourcePos, goalPos, successes, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lock;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0f20');
  }

  function background() { game.draw.clear(C.bg); }

  function tileSides(typeIdx, rotation) { return TILE_TYPES[typeIdx].map(function(s) { return (s + rotation) % 4; }); }
  function hasConnection(typeIdx, rotation, side) { return tileSides(typeIdx, rotation).indexOf(side) >= 0; }
  function opposite(side) { return (side + 2) % 4; }

  function propagate() {
    for (var i = 0; i < tiles.length; i++) tiles[i].live = false;
    if (!sourcePos) return;
    var queue = [{ r: sourcePos.r, c: sourcePos.c }]; tiles[sourcePos.r * COLS + sourcePos.c].live = true;
    while (queue.length > 0) {
      var cur = queue.shift(), t = tiles[cur.r * COLS + cur.c], sides = tileSides(t.type, t.rotation);
      var nbs = [{ dr: -1, dc: 0, side: 0 }, { dr: 0, dc: 1, side: 1 }, { dr: 1, dc: 0, side: 2 }, { dr: 0, dc: -1, side: 3 }];
      for (var ni = 0; ni < nbs.length; ni++) {
        var nb = nbs[ni], nr2 = cur.r + nb.dr, nc2 = cur.c + nb.dc;
        if (nr2 < 0 || nr2 >= ROWS || nc2 < 0 || nc2 >= COLS) continue;
        if (tiles[nr2 * COLS + nc2].live) continue;
        if (sides.indexOf(nb.side) < 0) continue;
        var nt = tiles[nr2 * COLS + nc2]; if (!hasConnection(nt.type, nt.rotation, opposite(nb.side))) continue;
        tiles[nr2 * COLS + nc2].live = true; queue.push({ r: nr2, c: nc2 });
      }
    }
  }

  function checkGoal() { return goalPos && tiles[goalPos.r * COLS + goalPos.c].live; }

  function loadPuzzle() {
    tiles = [];
    for (var i = 0; i < COLS * ROWS; i++) tiles.push({ type: Math.floor(Math.random() * TILE_TYPES.length), rotation: Math.floor(Math.random() * 4), live: false });
    sourcePos = { r: ROWS - 1, c: Math.floor(Math.random() * COLS) };
    do { goalPos = { r: Math.floor(Math.random() * (ROWS - 2)), c: Math.floor(Math.random() * COLS) }; } while (goalPos.r === sourcePos.r && goalPos.c === sourcePos.c);
    tiles[sourcePos.r * COLS + sourcePos.c].type = 0; tiles[goalPos.r * COLS + goalPos.c].type = 0;
    propagate();
  }

  function initGame() { successes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lock = false; loadPuzzle(); }

  function cellPos(r, c) { return { x: GRID_OX + c * (CELL_SIZE + PAD), y: GRID_OY + r * (CELL_SIZE + PAD) }; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 900 + Math.ceil(timeLeft) * 120) : successes * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawWire(x, y, side, live) {
    var cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2, col = live ? C.e : '#1a3a5a', ex, ey;
    if (side === 0) { ex = cx; ey = y; } else if (side === 1) { ex = x + CELL_SIZE; ey = cy; } else if (side === 2) { ex = cx; ey = y + CELL_SIZE; } else { ex = x; ey = cy; }
    game.draw.line(cx, cy, ex, ey, col, live ? 10 : 5); if (live) game.draw.line(cx, cy, ex, ey, C.g, 3);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var pos = cellPos(r, c), t = tiles[r * COLS + c], isSrc = r === sourcePos.r && c === sourcePos.c, isGoal = r === goalPos.r && c === goalPos.c;
      game.draw.rect(pos.x, pos.y, CELL_SIZE, CELL_SIZE, isSrc ? C.f : (isGoal ? C.b : '#061020'), isSrc || isGoal ? 0.3 : 0.8);
      var sides = tileSides(t.type, t.rotation);
      for (var si = 0; si < sides.length; si++) drawWire(pos.x, pos.y, sides[si], t.live);
      pc(pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2, t.live ? 16 : 10, t.live ? C.g : '#1a3a5a', t.live ? 0.9 : 0.5);
      if (isSrc) txt('SRC', pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2 + 12, 30, C.g);
      if (isGoal) { pc(pos.x + CELL_SIZE / 2, pos.y + CELL_SIZE / 2, 22, C.b, 0.5 + Math.sin(game.time.elapsed * 4) * 0.1); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lock) return;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var pos = cellPos(r, c);
      if (tx >= pos.x && tx <= pos.x + CELL_SIZE && ty >= pos.y && ty <= pos.y + CELL_SIZE) {
        if (r === sourcePos.r && c === sourcePos.c) return; if (r === goalPos.r && c === goalPos.c) return;
        tiles[r * COLS + c].rotation = (tiles[r * COLS + c].rotation + 1) % 4; game.audio.play('se_tap', 0.2); propagate();
        if (checkGoal()) {
          successes++; flash = 0.35; flashCol = C.b; resultText = 'POWERED!'; resultTimer = 0.8; game.audio.play('se_success', 0.7);
          var gp = cellPos(goalPos.r, goalPos.c);
          for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: gp.x + CELL_SIZE / 2, y: gp.y + CELL_SIZE / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.c }); }
          if (successes >= NEEDED) { finish(true); return; }
          lock = true; setTimeout(function() { if (!done) { loadPuzzle(); lock = false; } }, 1000);
        }
        return;
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
      txt(resultSuccess ? 'ALL WIRED!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
