// 569-color-flood.js
// カラーフラッド — 左上から広がる連結領域を、パレット色で塗り替えて盤面を全同色にする
// 操作: 下のパレットをタップ（盤面のマスをタップしてその色を選んでもOK）で色を選ぶ
// 成功: 規定手数以内に全マス同色  失敗: 手数超過 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、塗り回路） ──
  var C = { bg:'#0a0a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = ['#ff2079', '#00cfff', '#00ff9f', '#ffe600', '#7700ff', '#ff6600'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR FLOOD';
  var HOW_TO_PLAY = 'PICK A COLOR TO FLOOD FROM TOP-LEFT · FILL THE BOARD IN TIME';
  var MAX_TIME  = 25;
  var GRID = 6, MAX_MOVES = 14;
  var CELL = Math.floor(W * 0.84 / GRID), OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.26);
  var BTN_Y = snap(H * 0.26) + GRID * Math.floor(W * 0.84 / GRID) + 60, BTN_H = 120;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, moves, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#141420');
  }

  function background() { game.draw.clear(C.bg); }

  function idx(r, c) { return r * GRID + c; }

  function randomGrid() { grid = []; for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) grid.push(Math.floor(Math.random() * COLORS.length)); }

  function floodFill(newColor) {
    var old = grid[0]; if (old === newColor) return false;
    var queue = [0], visited = { 0: true };
    while (queue.length > 0) { var cur = queue.shift(); grid[cur] = newColor; var cr = Math.floor(cur / GRID), cc = cur % GRID; var nb = []; if (cr > 0) nb.push(idx(cr - 1, cc)); if (cr < GRID - 1) nb.push(idx(cr + 1, cc)); if (cc > 0) nb.push(idx(cr, cc - 1)); if (cc < GRID - 1) nb.push(idx(cr, cc + 1)); for (var ni = 0; ni < nb.length; ni++) if (!visited[nb[ni]] && grid[nb[ni]] === old) { visited[nb[ni]] = true; queue.push(nb[ni]); } }
    return true;
  }

  function allSame() { for (var i = 1; i < grid.length; i++) if (grid[i] !== grid[0]) return false; return true; }

  function initGame() { moves = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; randomGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.max(0, MAX_MOVES - moves) * 500 + Math.ceil(timeLeft) * 100) : moves * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function pick(newColor) {
    if (done) return;
    if (!floodFill(newColor)) { game.audio.play('se_tap', 0.15); return; }
    moves++; game.audio.play('se_tap', 0.35);
    if (allSame()) { flash = 0.5; flashCol = C.b; for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.6, col: COLORS[newColor] }); } finish(true); return; }
    if (moves >= MAX_MOVES) { flash = 0.5; flashCol = C.a; finish(false); }
  }

  function drawScene() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var i = idx(r, c), gx = OX + c * CELL, gy = OY + r * CELL; game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, COLORS[grid[i]], 0.92); if (r === 0 && c === 0) { game.draw.rect(gx + 2, gy + 2, CELL - 4, 8, C.g, 0.5); game.draw.rect(gx + 2, gy + 2, 8, CELL - 4, C.g, 0.5); } }
    var bw = W * 0.84 / COLORS.length, bx0 = snap(W * 0.08);
    for (var ci = 0; ci < COLORS.length; ci++) { var bx = bx0 + ci * bw, cur = grid[0] === ci; game.draw.rect(bx + 6, BTN_Y, bw - 12, BTN_H, COLORS[ci], cur ? 0.5 : 0.9); if (cur) { game.draw.rect(bx + 6, BTN_Y, bw - 12, 8, C.g, 0.7); game.draw.rect(bx + 6, BTN_Y + BTN_H - 8, bw - 12, 8, C.g, 0.7); } }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var bw = W * 0.84 / COLORS.length, bx0 = snap(W * 0.08);
    if (ty >= BTN_Y && ty <= BTN_Y + BTN_H) { var ci = Math.floor((tx - bx0) / bw); if (ci >= 0 && ci < COLORS.length) pick(ci); return; }
    var gc = Math.floor((tx - OX) / CELL), gr = Math.floor((ty - OY) / CELL); if (gc >= 0 && gc < GRID && gr >= 0 && gr < GRID) pick(grid[idx(gr, gc)]);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.965, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLOODED!' : 'OUT OF MOVES', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 7, snap(particles[pp2].y) - 7, 14, 14, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    var ml = MAX_MOVES - moves, mc = ml <= 3 ? C.a : ml <= 6 ? C.f : C.b;
    txt('MOVES ' + ml, W / 2, 168, 48, mc);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
