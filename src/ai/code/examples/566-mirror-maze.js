// 566-mirror-maze.js
// ミラーメイズ — 入口から入るレーザーが鏡（斜線）で反射する経路を読み、出口マスを当てる
// 操作: レーザーがどのマスから出るか予想して、そのマスをタップ（正解で経路が光る）
// 成功: 3問 正解  失敗: 3問 不正解 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、光学迷路） ──
  var C = { bg:'#04060c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR MAZE';
  var HOW_TO_PLAY = 'READ THE MIRRORS · TAP THE CELL WHERE THE LASER EXITS';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_WRONG = 3;         // 修正2: 6 → 3
  var GRID = 5, CELL = 168;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrors, laserStart, laserPath, goalCell, selectedCell, correctCount, wrongCount, timeLeft, done, particles, flash, flashCol, resultTimer, showPath;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) {
    cx = snap(cx); cy = snap(cy); var s = 8;
    for (var i = 0; i < size / s; i++) { var w = (size / s - i) * s;
      if (dir === 'up') game.draw.rect(cx - w / 2, cy - size / 2 + i * s, w, s, color, 0.9);
      else if (dir === 'down') game.draw.rect(cx - w / 2, cy + size / 2 - i * s - s, w, s, color, 0.9);
      else if (dir === 'left') game.draw.rect(cx - size / 2 + i * s, cy - w / 2, s, w, color, 0.9);
      else game.draw.rect(cx + size / 2 - i * s - s, cy - w / 2, s, w, color, 0.9);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function traceLaser() {
    var path = [], r = laserStart.r, c = laserStart.c, dr = 0, dc = 0;
    if (laserStart.dir === 'right') dc = 1; else if (laserStart.dir === 'down') dr = 1; else if (laserStart.dir === 'left') dc = -1; else dr = -1;
    var steps = 0;
    while (steps < GRID * GRID * 4) {
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) break;
      path.push({ r: r, c: c }); var mir = null;
      for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].r === r && mirrors[mi].c === c) { mir = mirrors[mi]; break; }
      if (mir) { if (mir.dir === '/') { var t = dr; dr = -dc; dc = -t; } else { var t2 = dr; dr = dc; dc = t2; } }
      r += dr; c += dc; steps++;
    }
    return path;
  }

  function generatePuzzle() {
    mirrors = []; var cells = []; for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) cells.push({ r: r, c: c });
    for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    var nm = 3 + Math.floor(Math.random() * 3); for (var mi = 0; mi < nm; mi++) mirrors.push({ r: cells[mi].r, c: cells[mi].c, dir: Math.random() < 0.5 ? '/' : '\\' });
    var side = Math.floor(Math.random() * 4);
    if (side === 0) { var cc = Math.floor(Math.random() * GRID); laserStart = { r: 0, c: cc, dir: 'down', entryR: -1, entryC: cc }; }
    else if (side === 1) { var rr = Math.floor(Math.random() * GRID); laserStart = { r: rr, c: GRID - 1, dir: 'left', entryR: rr, entryC: GRID }; }
    else if (side === 2) { var cc2 = Math.floor(Math.random() * GRID); laserStart = { r: GRID - 1, c: cc2, dir: 'up', entryR: GRID, entryC: cc2 }; }
    else { var rr2 = Math.floor(Math.random() * GRID); laserStart = { r: rr2, c: 0, dir: 'right', entryR: rr2, entryC: -1 }; }
    laserPath = traceLaser();
    if (laserPath.length > 0) { var last = laserPath[laserPath.length - 1]; goalCell = { r: last.r, c: last.c }; }
    selectedCell = -1; showPath = false;
  }

  function initGame() { correctCount = 0; wrongCount = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultTimer = 0; generatePuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correctCount * 1200 + Math.ceil(timeLeft) * 100) : correctCount * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var cx = OX + c * CELL, cy = OY + r * CELL; game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, '#0a1020', 0.9); game.draw.rect(cx, cy, CELL, 2, '#223344', 0.6); game.draw.rect(cx, cy, 2, CELL, '#223344', 0.6); }
    if (showPath) for (var lp = 0; lp < laserPath.length; lp++) { var lc = laserPath[lp].c, lr = laserPath[lp].r; game.draw.rect(OX + lc * CELL + 8, OY + lr * CELL + 8, CELL - 16, CELL - 16, C.f, 0.15 + (lp / laserPath.length) * 0.2); if (lp > 0) { var pr = laserPath[lp - 1]; game.draw.line(OX + pr.c * CELL + CELL / 2, OY + pr.r * CELL + CELL / 2, OX + lc * CELL + CELL / 2, OY + lr * CELL + CELL / 2, C.f, 6); } }
    var adir = laserStart.dir; arrow(OX + laserStart.entryC * CELL + CELL / 2, OY + laserStart.entryR * CELL + CELL / 2, 44, adir, C.f);
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mcx = OX + m.c * CELL, mcy = OY + m.r * CELL; if (m.dir === '/') game.draw.line(mcx + 24, mcy + CELL - 24, mcx + CELL - 24, mcy + 24, C.e, 8); else game.draw.line(mcx + 24, mcy + 24, mcx + CELL - 24, mcy + CELL - 24, C.e, 8); }
    if (selectedCell >= 0 && resultTimer > 0) { var sc = selectedCell % GRID, sr = Math.floor(selectedCell / GRID); game.draw.rect(OX + sc * CELL + 2, OY + sr * CELL + 2, CELL - 4, CELL - 4, (sr === goalCell.r && sc === goalCell.c) ? C.b : C.a, 0.4); }
    if (showPath) pc(OX + goalCell.c * CELL + CELL / 2, OY + goalCell.r * CELL + CELL / 2, 34, C.b, 0.8);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || resultTimer > 0) return;
    var c = Math.floor((tx - OX) / CELL), r = Math.floor((ty - OY) / CELL); if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
    selectedCell = r * GRID + c; showPath = true;
    if (r === goalCell.r && c === goalCell.c) {
      correctCount++; flash = 0.4; flashCol = C.b; resultTimer = 1.0; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + goalCell.c * CELL + CELL / 2, y: OY + goalCell.r * CELL + CELL / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
      if (correctCount >= NEEDED) { done = true; game.audio.play('se_success', 0.9); state = S.RESULT; resultSuccess = true; finalScore = correctCount * 1200 + Math.ceil(timeLeft) * 100; setTimeout(function() { game.end.success(finalScore); }, 1800); return; }
      setTimeout(function() { if (!done) generatePuzzle(); }, 1000);
    } else { wrongCount++; flash = 0.4; flashCol = C.a; resultTimer = 1.0; game.audio.play('se_failure', 0.4); if (wrongCount >= MAX_WRONG) { done = true; state = S.RESULT; resultSuccess = false; finalScore = correctCount * 300; game.audio.play('se_failure'); setTimeout(function() { game.end.failure(); }, 1800); return; } setTimeout(function() { if (!done) generatePuzzle(); }, 1000); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
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
      txt(resultSuccess ? 'ALL SOLVED!' : 'WRONG EXIT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
    if (!showPath) txt('WHERE DOES IT EXIT?', W / 2, OY - 40, 36, C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correctCount + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrongCount ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
