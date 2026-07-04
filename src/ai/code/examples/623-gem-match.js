// 623-gem-match.js
// ジェムマッチ — 隣り合う宝石をスワイプで入れ替え、3つ以上そろえて消すパズル
// 操作: 宝石をスワイプして隣と交換。同色が3つ以上並ぶと消えて得点、連鎖でボーナス
// 成功: 150点 到達  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宝石鉱／宝石色は保持） ──
  var C = { bg:'#050010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEM_COLORS = ['#ff2079', '#ff6600', '#00ff9f', '#00cfff', '#7700ff', '#ffe600'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GEM MATCH';
  var HOW_TO_PLAY = 'SWIPE A GEM TO SWAP WITH ITS NEIGHBOR · LINE UP 3+ TO CLEAR · CHAIN FOR BONUS';
  var MAX_TIME = 25;
  var NEEDED   = 150;        // 修正2: 500 → 150
  var COLS = 6, ROWS = 7, GEM_SIZE = 150, PAD = 8;
  var GRID_W = COLS * (GEM_SIZE + PAD) - PAD, GRID_OX = snap((W - GRID_W) / 2), GRID_OY = snap(H * 0.22);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, score, timeLeft, done, particles, flash, matchFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0020');
  }

  function background() { game.draw.clear(C.bg); }

  function randomGem() { return Math.floor(Math.random() * GEM_COLORS.length); }

  function gemXY(c, r) { return { x: GRID_OX + c * (GEM_SIZE + PAD) + GEM_SIZE / 2, y: GRID_OY + r * (GEM_SIZE + PAD) + GEM_SIZE / 2 }; }

  function checkAndClear() {
    var toRemove = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS - 2; c++) if (grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) { toRemove.push([r, c], [r, c + 1], [r, c + 2]); if (c + 3 < COLS && grid[r][c] === grid[r][c + 3]) toRemove.push([r, c + 3]); }
    for (var c2 = 0; c2 < COLS; c2++) for (var r2 = 0; r2 < ROWS - 2; r2++) if (grid[r2][c2] === grid[r2 + 1][c2] && grid[r2][c2] === grid[r2 + 2][c2]) { toRemove.push([r2, c2], [r2 + 1, c2], [r2 + 2, c2]); if (r2 + 3 < ROWS && grid[r2][c2] === grid[r2 + 3][c2]) toRemove.push([r2 + 3, c2]); }
    if (toRemove.length === 0) return false;
    var removed = {};
    for (var i = 0; i < toRemove.length; i++) { var key = toRemove[i][0] + ',' + toRemove[i][1]; if (!removed[key]) { removed[key] = true; grid[toRemove[i][0]][toRemove[i][1]] = -1; score += 10; var pos = gemXY(toRemove[i][1], toRemove[i][0]); matchFlash.push({ x: pos.x, y: pos.y, life: 0.4 }); } }
    for (var c3 = 0; c3 < COLS; c3++) { var filled = []; for (var r3 = ROWS - 1; r3 >= 0; r3--) if (grid[r3][c3] >= 0) filled.push(grid[r3][c3]); while (filled.length < ROWS) filled.push(randomGem()); for (var r4 = ROWS - 1; r4 >= 0; r4--) grid[r4][c3] = filled[ROWS - 1 - r4]; }
    return true;
  }

  function initGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(randomGem()); grid.push(row); }
    for (var i = 0; i < 20; i++) checkAndClear();
    score = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; matchFlash = [];
  }

  function hitCell(tx, ty) { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var pos = gemXY(c, r); if (Math.abs(tx - pos.x) < GEM_SIZE / 2 + 8 && Math.abs(ty - pos.y) < GEM_SIZE / 2 + 8) return [r, c]; } return null; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 80) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var pos = gemXY(c, r), gx = pos.x - GEM_SIZE / 2, gy = pos.y - GEM_SIZE / 2;
      game.draw.rect(gx, gy, GEM_SIZE, GEM_SIZE, '#0f0520', 0.7);
      if (grid[r][c] >= 0) { var col = GEM_COLORS[grid[r][c]]; pc(pos.x, pos.y, GEM_SIZE * 0.4, col, 0.9); pc(pos.x - GEM_SIZE * 0.15, pos.y - GEM_SIZE * 0.15, GEM_SIZE * 0.12, C.g, 0.5); }
    }
    for (var mf = 0; mf < matchFlash.length; mf++) { var m = matchFlash[mf]; pc(m.x, m.y, GEM_SIZE * 0.5, C.c, m.life * 0.6); }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1) {
    if (state !== S.PLAYING || done) return;
    var cell = hitCell(x1, y1); if (!cell) return;
    var r = cell[0], c = cell[1], nr = r, nc = c;
    if (dir === 'left' && c > 0) nc--; else if (dir === 'right' && c < COLS - 1) nc++; else if (dir === 'up' && r > 0) nr--; else if (dir === 'down' && r < ROWS - 1) nr++; else return;
    var tmp = grid[r][c]; grid[r][c] = grid[nr][nc]; grid[nr][nc] = tmp; game.audio.play('se_tap', 0.2);
    if (!checkAndClear()) { tmp = grid[r][c]; grid[r][c] = grid[nr][nc]; grid[nr][nc] = tmp; flash = 0.15; }
    else { var chains = 0; while (checkAndClear()) { chains++; score += chains * 20; } game.audio.play('se_success', 0.5); if (score >= NEEDED) { finish(true); return; } }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
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
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      for (var mf = matchFlash.length - 1; mf >= 0; mf--) { matchFlash[mf].life -= dt * 3; if (matchFlash[mf].life <= 0) matchFlash.splice(mf, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

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
