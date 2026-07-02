// 342-pixel-paint.js
// ピクセルペイント — お手本の色ヒントに合わせて、6x6グリッドの各マスを正しい色で塗りドット絵を完成
// 操作: 下の色を選び、グリッドのマスをタップして塗る（同マス再タップで消す）
// 成功: 2枚 完成させる  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドット絵エディタ） ──
  var C = { bg:'#0a0a10', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PALETTE = [C.a, C.b, C.e, C.c];   // 1..4

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'PICK A COLOR · PAINT CELLS TO MATCH THE HINT';
  var MAX_TIME = 15;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var GN = 6, CELL = snap(W * 0.72 / GN), GX = snap((W - GN * CELL) / 2), GY = snap(H * 0.30);
  var PATTERNS = [
    [[0,1,0,0,1,0],[1,1,1,1,1,1],[1,1,1,1,1,1],[0,1,1,1,1,0],[0,0,1,1,0,0],[0,0,0,0,0,0]],
    [[0,0,3,3,0,0],[0,3,3,3,3,0],[3,3,3,3,3,3],[0,3,3,3,3,0],[0,0,3,3,0,0],[0,0,0,0,0,0]],
    [[0,2,2,2,2,0],[2,2,2,2,2,2],[2,4,2,2,4,2],[2,2,2,2,2,2],[0,2,2,2,2,0],[0,0,2,2,0,0]]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var patIdx, grid, target, selColor, done2, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a26');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() { target = PATTERNS[patIdx % PATTERNS.length]; grid = []; for (var r = 0; r < GN; r++) { grid[r] = []; for (var c = 0; c < GN; c++) grid[r][c] = 0; } }

  function complete() { for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) if (grid[r][c] !== target[r][c]) return false; return true; }

  function initGame() { patIdx = 0; selColor = 1; done2 = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; initGrid(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (done2 * 700 + Math.ceil(timeLeft) * 100) : done2 * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    game.draw.rect(GX - 4, GY - 4, GN * CELL + 8, GN * CELL + 8, '#1a1a26', 0.9);
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) {
      var x = GX + c * CELL, y = GY + r * CELL, tv = target[r][c], gv = grid[r][c];
      game.draw.rect(x + 2, y + 2, CELL - 4, CELL - 4, '#12121a', 0.9);
      if (tv > 0) game.draw.rect(x + 2, y + 2, CELL - 4, CELL - 4, PALETTE[tv - 1], 0.14);
      if (gv > 0) { game.draw.rect(x + 4, y + 4, CELL - 8, CELL - 8, PALETTE[gv - 1], gv === tv ? 0.95 : 0.55); if (gv !== tv) game.draw.rect(x + CELL - 20, y + 4, 14, 14, C.a, 0.9); }
    }
  }

  function palX(i) { return snap(W * 0.18 + i * W * 0.22); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var py = snap(H * 0.84);
    for (var pi = 0; pi < PALETTE.length; pi++) if (Math.hypot(x - palX(pi), y - py) < 48) { selColor = pi + 1; game.audio.play('se_tap', 0.2); return; }
    var c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    if (c >= 0 && c < GN && r >= 0 && r < GN) {
      grid[r][c] = grid[r][c] === selColor ? 0 : selColor; game.audio.play('se_tap', 0.2);
      if (complete()) {
        done2++; flash = 0.8; game.audio.play('se_success', 0.7);
        for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: GY + GN * CELL / 2, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.7, col: PALETTE[Math.floor(Math.random() * 4)] }); }
        if (done2 >= NEEDED) { finish(true); return; }
        patIdx++; setTimeout(function() { if (!done) initGrid(); }, 600);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'UNFINISHED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.2);
    drawGrid();
    for (var pi2 = 0; pi2 < PALETTE.length; pi2++) { var px = palX(pi2), py = snap(H * 0.84), on = selColor === pi2 + 1; pc(px, py, on ? 44 : 34, PALETTE[pi2], on ? 0.95 : 0.6); if (on) txt('v', px, py + 66, 30, PALETTE[pi2]); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(done2 + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
