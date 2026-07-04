// 602-river-flow.js
// リバーフロー — 水路のゲートをタップで切り替え、落とす水を正しいゴールへ導く
// 操作: 格子のゲートをタップで左右反転 → 上の開始ボタンをタップで水を流す
// 成功: 3回 正解ゴールへ誘導  失敗: 3回 外れゴール or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、水路管制） ──
  var C = { bg:'#000810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RIVER FLOW';
  var HOW_TO_PLAY = 'TAP GATES TO FLIP THEM · THEN DROP THE WATER INTO THE GREEN GOAL';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_FAIL = 3;          // 修正2: 5 → 3
  var COLS = 5, ROWS = 6;
  var COL_W = W / COLS;
  var GRID_OY = snap(H * 0.28);
  var ROW_H = snap((H * 0.50) / ROWS);
  var GOAL_H = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gates, waterCol, waterRow, waterY, waterActive, targetGoal, goals, successes, fails, timeLeft, done, particles, flash, flashCol, waitFor;
  var WATER_SPEED = 340;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; if (dir === 'left') game.draw.rect(cx - size / 2 + i, cy - w / 2, 8, w, color); else game.draw.rect(cx + size / 2 - i - 8, cy - w / 2, 8, w, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function initPuzzle() {
    gates = [];
    for (var r = 0; r < ROWS; r++) { gates.push([]); for (var c = 0; c < COLS; c++) gates[r].push(Math.random() < 0.5 ? 0 : 1); }
    targetGoal = Math.floor(Math.random() * COLS);
    goals = []; for (var i = 0; i < COLS; i++) goals.push(i === targetGoal ? 'good' : 'bad');
    waterCol = Math.floor(COLS / 2); waterRow = 0; waterY = GRID_OY; waterActive = false; waitFor = 0;
  }

  function initGame() { successes = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; initPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // grid + gates
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = c * COL_W, gy = GRID_OY + r * ROW_H;
      game.draw.rect(gx + 4, gy + 4, COL_W - 8, ROW_H - 8, '#0a1a2e', 0.85);
      var dir = gates[r][c], mx = gx + COL_W / 2, my = gy + ROW_H / 2;
      arrow(mx, my, 40, dir === 0 ? 'left' : 'right', C.f);
    }
    for (var dc = 1; dc < COLS; dc++) game.draw.rect(snap(dc * COL_W) - 1, GRID_OY, 2, ROWS * ROW_H, '#04101c', 0.9);

    // goals
    var goalY = GRID_OY + ROWS * ROW_H + 8;
    for (var gc = 0; gc < COLS; gc++) {
      var gx2 = gc * COL_W, good = goals[gc] === 'good';
      game.draw.rect(gx2 + 4, goalY, COL_W - 8, GOAL_H, good ? C.b : C.a, 0.85);
      txt(good ? 'IN' : 'NG', gx2 + COL_W / 2, goalY + GOAL_H / 2 + 12, 32, '#001018');
    }

    // start button
    if (!waterActive) {
      var sx = waterCol * COL_W + COL_W / 2, sy = GRID_OY - 44;
      pc(sx, sy, 28 + Math.sin(game.time.elapsed * 5) * 3, C.e, 0.85);
      arrow(sx, sy, 28, 'down', C.g);
    }

    // water droplet
    if (waterActive) {
      var wy = Math.min(waterY, GRID_OY + waterRow * ROW_H + ROW_H / 2);
      var wx = waterCol * COL_W + COL_W / 2;
      pc(wx, wy, 20, C.e, 0.9); pc(wx, wy, 30, C.d, 0.3);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waterActive || waitFor > 0) return;
    if (ty < GRID_OY) { waterActive = true; game.audio.play('se_tap', 0.3); return; }
    var col = Math.floor(tx / COL_W), row = Math.floor((ty - GRID_OY) / ROW_H);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      gates[row][col] = gates[row][col] === 0 ? 1 : 0;
      game.audio.play('se_tap', 0.2);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gates) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLOW MASTER!' : 'WRONG WAY', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      if (waitFor > 0) { waitFor -= dt; if (waitFor <= 0) initPuzzle(); }
      else if (waterActive) {
        waterY += WATER_SPEED * dt;
        var targetRowY = GRID_OY + waterRow * ROW_H + ROW_H;
        if (waterY >= targetRowY && waterRow < ROWS) {
          var dir = gates[waterRow][waterCol];
          if (dir === 0) waterCol = Math.max(0, waterCol - 1); else waterCol = Math.min(COLS - 1, waterCol + 1);
          waterRow++;
          var wx = waterCol * COL_W + COL_W / 2, wy = GRID_OY + waterRow * ROW_H;
          for (var pi = 0; pi < 3; pi++) particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 120, vy: -60, life: 0.3, col: C.e });
        }
        if (waterRow >= ROWS) {
          waterActive = false;
          if (goals[waterCol] === 'good') {
            successes++; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.8);
            var gx = waterCol * COL_W + COL_W / 2, gy2 = GRID_OY + ROWS * ROW_H;
            for (var pj = 0; pj < 12; pj++) { var a = Math.random() * Math.PI * 2; particles.push({ x: gx, y: gy2, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 - 100, life: 0.5, col: C.b }); }
            if (successes >= NEEDED) { finish(true); return; }
            waitFor = 1.0;
          } else {
            fails++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4);
            if (fails >= MAX_FAIL) { finish(false); return; }
            waitFor = 1.0;
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#0a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
