// 492-gem-match.js
// 宝石マッチ — 隣り合う宝石をスワイプ/タップで入れ替え、同色3つ以上を揃えて消す
// 操作: 宝石を2つ続けてタップ、または宝石をスワイプで隣と交換
// 成功: 15個 消す  失敗: 20秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宝石鉱山） ──
  var C = { bg:'#050215', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEM_COLS = [C.a, C.e, C.b, C.c, C.d, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GEM MATCH';
  var HOW_TO_PLAY = 'SWAP ADJACENT GEMS · LINE UP 3 OR MORE OF A COLOR';
  var MAX_TIME = 20;
  var NEEDED   = 15;         // 修正2: 50 → 15
  var GRID = 6, CELL = 148;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, selected, cleared, timeLeft, done, particles, flash, clearing;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0525');
  }

  function background() { game.draw.clear(C.bg); }

  function randGem() { return Math.floor(Math.random() * GEM_COLS.length); }

  function matchAt(r, c, gd) { var v = gd[r][c]; var h = 1, cc = c - 1; while (cc >= 0 && gd[r][cc] === v) { h++; cc--; } cc = c + 1; while (cc < GRID && gd[r][cc] === v) { h++; cc++; } if (h >= 3) return true; var vc = 1, rr = r - 1; while (rr >= 0 && gd[rr][c] === v) { vc++; rr--; } rr = r + 1; while (rr < GRID && gd[rr][c] === v) { vc++; rr++; } return vc >= 3; }

  function initGrid() { grid = []; for (var r = 0; r < GRID; r++) { grid.push([]); for (var c = 0; c < GRID; c++) grid[r].push(randGem()); } for (var r2 = 0; r2 < GRID; r2++) for (var c2 = 0; c2 < GRID; c2++) { var at = 0; while (matchAt(r2, c2, grid) && at < 20) { grid[r2][c2] = randGem(); at++; } } }

  function findMatches() { var m = {}; for (var r = 0; r < GRID; r++) { var c = 0; while (c < GRID) { var v = grid[r][c], cnt = 1; while (c + cnt < GRID && grid[r][c + cnt] === v) cnt++; if (cnt >= 3) for (var i = 0; i < cnt; i++) m[r + ',' + (c + i)] = true; c += cnt; } } for (var c3 = 0; c3 < GRID; c3++) { var r3 = 0; while (r3 < GRID) { var v2 = grid[r3][c3], cnt2 = 1; while (r3 + cnt2 < GRID && grid[r3 + cnt2][c3] === v2) cnt2++; if (cnt2 >= 3) for (var i2 = 0; i2 < cnt2; i2++) m[(r3 + i2) + ',' + c3] = true; r3 += cnt2; } } return m; }

  function processMatches() {
    var m = findMatches(), keys = Object.keys(m); if (keys.length === 0) return false;
    for (var ki = 0; ki < keys.length; ki++) { var p = keys[ki].split(','), r = +p[0], c = +p[1], col = GEM_COLS[grid[r][c]]; clearing.push({ row: r, col: c, life: 0.5, col: col }); for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: col }); } grid[r][c] = -1; cleared++; }
    flash = 0.3; game.audio.play('se_tap', 0.5);
    for (var c4 = 0; c4 < GRID; c4++) { var wr = GRID - 1; for (var r4 = GRID - 1; r4 >= 0; r4--) if (grid[r4][c4] >= 0) { grid[wr][c4] = grid[r4][c4]; if (wr !== r4) grid[r4][c4] = -1; wr--; } while (wr >= 0) { grid[wr][c4] = randGem(); wr--; } }
    return true;
  }

  function trySwap(r1, c1, r2, c2) {
    if (r2 < 0 || r2 >= GRID || c2 < 0 || c2 >= GRID) return;
    var t = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t;
    if (Object.keys(findMatches()).length > 0) { processMatches(); selected = null; }
    else { t = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t; selected = null; game.audio.play('se_failure', 0.2); }
  }

  function initGame() { selected = null; cleared = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; clearing = []; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 200 + Math.ceil(timeLeft) * 100) : cleared * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(OX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, '#0a0525', 0.9);
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var v = grid[r][c]; if (v < 0) continue;
      var gx = OX + c * CELL + CELL / 2, gy = OY + r * CELL + CELL / 2, sel = selected && selected.row === r && selected.col === c;
      pc(gx, gy, CELL * 0.36, GEM_COLS[v], 0.9); pc(gx - CELL * 0.1, gy - CELL * 0.1, CELL * 0.1, C.g, 0.3);
      if (sel) ring(gx, gy, CELL * 0.42, C.g, 0.7);
    }
    for (var ci = 0; ci < clearing.length; ci++) { var cc = clearing[ci]; pc(OX + cc.col * CELL + CELL / 2, OY + cc.row * CELL + CELL / 2, CELL * 0.5 * cc.life, cc.col, cc.life * 0.9); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) { selected = null; return; }
    if (selected) { var dr = Math.abs(row - selected.row), dc = Math.abs(col - selected.col); if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) trySwap(selected.row, selected.col, row, col); else selected = { row: row, col: col }; }
    else selected = { row: row, col: col };
  });

  game.onSwipe(function(dir, x1, y1) {
    if (state !== S.PLAYING || done) return;
    var col = Math.floor((x1 - OX) / CELL), row = Math.floor((y1 - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    trySwap(row, col, row + dr, col + dc);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GEM MASTER!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (cleared >= NEEDED) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      for (var ci = clearing.length - 1; ci >= 0; ci--) { clearing[ci].life -= dt * 3; if (clearing[ci].life <= 0) clearing.splice(ci, 1); }
      if (clearing.length === 0 && Object.keys(findMatches()).length > 0) processMatches();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
