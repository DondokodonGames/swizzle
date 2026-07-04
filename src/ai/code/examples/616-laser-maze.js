// 616-laser-maze.js
// レーザーメイズ — 点滅するレーザーの消える瞬間を狙い、タップで一歩ずつ進んでゴールへ
// 操作: 隣接マスをタップで移動。レーザー帯が光っている時に踏むと被弾
// 成功: ゴール到達  失敗: 3回 被弾 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、警備回廊） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER MAZE';
  var HOW_TO_PLAY = 'TAP AN ADJACENT CELL TO STEP · MOVE WHEN THE LASER BAND IS DARK';
  var MAX_TIME = 25;
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var COLS = 5, ROWS = 6, CELL_W = W / 5, CELL_H = snap(H * 0.58 / 6), GRID_OY = snap(H * 0.20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerC, playerR, goalC, goalR, lasers, hits, timeLeft, done, particles, flash, invincible, moveAnim, movingFrom, movingTo, gameElapsed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    playerC = 2; playerR = ROWS - 1; goalC = 2; goalR = 0;
    lasers = [];
    for (var r = 1; r < ROWS - 1; r++) { if (r === goalR) continue; if (Math.random() < 0.55) lasers.push({ type: 'row', pos: r, period: 1.2 + Math.random() * 1.4, phase: Math.random() * Math.PI * 2, onFraction: 0.35 + Math.random() * 0.15 }); }
    for (var c = 0; c < COLS; c++) { if (c === goalC) continue; if (Math.random() < 0.3) lasers.push({ type: 'col', pos: c, period: 1.4 + Math.random() * 1.8, phase: Math.random() * Math.PI * 2, onFraction: 0.3 + Math.random() * 0.15 }); }
    hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; invincible = 0; moveAnim = 0; movingFrom = null; movingTo = null; gameElapsed = 0;
  }

  function laserActive(l) { var t = (gameElapsed + l.phase) % l.period; return t < l.period * l.onFraction; }

  function cellDangerous(r, c) { for (var li = 0; li < lasers.length; li++) { var l = lasers[li]; if (!laserActive(l)) continue; if (l.type === 'row' && l.pos === r) return true; if (l.type === 'col' && l.pos === c) return true; } return false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((MAX_HITS - hits) * 800 + Math.ceil(timeLeft) * 150 + 1000) : hits * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      var cx = c2 * CELL_W, cy = GRID_OY + r2 * CELL_H, isGoal = r2 === goalR && c2 === goalC;
      game.draw.rect(cx + 4, cy + 4, CELL_W - 8, CELL_H - 8, isGoal ? C.d : '#0a1a0a', isGoal ? 0.4 : 0.5);
    }
    for (var li = 0; li < lasers.length; li++) {
      var l = lasers[li];
      if (l.type === 'row') { var ly = GRID_OY + l.pos * CELL_H + CELL_H / 2; if (laserActive(l)) game.draw.rect(0, snap(ly) - 3, W, 6, C.a, 0.85); pc(20, ly, 12, laserActive(l) ? C.a : C.b, 0.9); }
      else { var lx = l.pos * CELL_W + CELL_W / 2; if (laserActive(l)) game.draw.rect(snap(lx) - 3, GRID_OY, 6, ROWS * CELL_H, C.a, 0.85); pc(lx, GRID_OY - 20, 12, laserActive(l) ? C.a : C.b, 0.9); }
    }
    var gX = goalC * CELL_W + CELL_W / 2, gY = GRID_OY + goalR * CELL_H + CELL_H / 2;
    pc(gX, gY, CELL_W * 0.24, C.b, 0.4 + Math.sin(game.time.elapsed * 3) * 0.1); pc(gX, gY, CELL_W * 0.14, C.g, 0.9);
    var pX, pY;
    if (movingFrom && movingTo && moveAnim > 0) { var t = moveAnim; pX = (movingFrom.c * (1 - t) + movingTo.c * t) * CELL_W + CELL_W / 2; pY = GRID_OY + (movingFrom.r * (1 - t) + movingTo.r * t) * CELL_H + CELL_H / 2; }
    else { pX = playerC * CELL_W + CELL_W / 2; pY = GRID_OY + playerR * CELL_H + CELL_H / 2; }
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    pc(pX, pY, CELL_W * 0.24, C.e, pa); pc(pX - 8, pY - 8, CELL_W * 0.09, C.g, pa * 0.6);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || moveAnim > 0) return;
    var tc = Math.max(0, Math.min(COLS - 1, Math.floor(tx / CELL_W))), tr = Math.max(0, Math.min(ROWS - 1, Math.floor((ty - GRID_OY) / CELL_H)));
    var dc = tc - playerC, dr = tr - playerR;
    if (Math.abs(dc) + Math.abs(dr) !== 1) return;
    movingFrom = { r: playerR, c: playerC }; movingTo = { r: tr, c: tc }; moveAnim = 0.001; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lasers) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'FRIED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (invincible > 0) invincible -= dt;
      if (movingTo && moveAnim > 0) {
        moveAnim += dt * 6;
        if (moveAnim >= 1) {
          playerR = movingTo.r; playerC = movingTo.c; movingTo = null; movingFrom = null; moveAnim = 0;
          if (invincible <= 0 && cellDangerous(playerR, playerC)) {
            hits++; invincible = 0.6; flash = 0.4; game.audio.play('se_failure', 0.5);
            var pCX = CELL_W * playerC + CELL_W / 2, pCY = GRID_OY + CELL_H * playerR + CELL_H / 2;
            for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: pCX, y: pCY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
          if (playerR === goalR && playerC === goalC) {
            var gCX = CELL_W * goalC + CELL_W / 2, gCY = GRID_OY + CELL_H * goalR + CELL_H / 2;
            for (var p2 = 0; p2 < 12; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: gCX, y: gCY, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.6, col: C.b }); }
            finish(true); return;
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
