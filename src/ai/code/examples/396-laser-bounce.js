// 396-laser-bounce.js
// レーザー反射 — 盤上の鏡をタップで45度ずつ回し、レーザーの向きを変えてターゲットに当て続ける
// 操作: 鏡をタップして回転（当たり続けると得点が入る）
// 成功: 3ヒット 決める  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、光学台） ──
  var C = { bg:'#010803', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER BOUNCE';
  var HOW_TO_PLAY = 'ROTATE MIRRORS TO STEER THE LASER INTO THE TARGET';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var COLS = 5, ROWS = 6, CELL = snap(W * 0.16);
  var GX = snap((W - COLS * CELL) / 2), GY = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrors, target, srcRow, hits, hold, timeLeft, done, particles, hitFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); for (var c = 0; c <= COLS; c++) game.draw.rect(GX + c * CELL, GY, 2, ROWS * CELL, C.d, 0.15); for (var r = 0; r <= ROWS; r++) game.draw.rect(GX, GY + r * CELL, COLS * CELL, 2, C.d, 0.15); }

  // steps: 0=\, 1=|, 2=/, 3=—
  function reflectDir(dx, dy, steps) {
    if (steps === 0) return { dx: dy, dy: dx };
    if (steps === 1) return { dx: -dx, dy: dy };
    if (steps === 2) return { dx: -dy, dy: -dx };
    return { dx: dx, dy: -dy };
  }

  function traceLaser() {
    var path = [], cx = -1, cy = srcRow, dx = 1, dy = 0, steps = 0, hit = false;
    path.push({ x: GX, y: GY + (cy + 0.5) * CELL });
    while (steps < 40) {
      cx += dx; cy += dy; steps++;
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;
      path.push({ x: GX + (cx + 0.5) * CELL, y: GY + (cy + 0.5) * CELL });
      for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].col === cx && mirrors[mi].row === cy) { var nd = reflectDir(dx, dy, mirrors[mi].steps); dx = nd.dx; dy = nd.dy; break; }
      if (cx === target.col && cy === target.row) { hit = true; break; }
    }
    return { path: path, hit: hit };
  }

  function initGame() {
    mirrors = [ { col: 1, row: 1, steps: 0 }, { col: 3, row: 2, steps: 1 }, { col: 2, row: 4, steps: 2 }, { col: 4, row: 3, steps: 3 } ];
    target = { col: 4, row: 5 }; srcRow = 1; hits = 0; hold = 0; timeLeft = MAX_TIME; done = false; particles = []; hitFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 700 + Math.ceil(timeLeft) * 100) : hits * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard(trace) {
    var tx = GX + (target.col + 0.5) * CELL, ty = GY + (target.row + 0.5) * CELL;
    pc(tx, ty, CELL * 0.32, trace.hit ? C.b : '#183018', 0.9); pc(tx, ty, CELL * 0.16, trace.hit ? C.c : '#204020', 0.9);
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mx = GX + (m.col + 0.5) * CELL, my = GY + (m.row + 0.5) * CELL, ang = m.steps * Math.PI / 4, co = Math.cos(ang), si = Math.sin(ang); game.draw.rect(mx - 40, my - 40, 80, 80, C.d, 0.15); pline(mx - co * 42, my - si * 42, mx + co * 42, my + si * 42, C.e, 0.95, 8); pc(mx, my, 8, C.g, 0.7); }
    pc(GX - 34, GY + (srcRow + 0.5) * CELL, 16, C.a, 0.9);
    for (var pi = 0; pi < trace.path.length - 1; pi++) pline(trace.path[pi].x, trace.path[pi].y, trace.path[pi + 1].x, trace.path[pi + 1].y, C.a, 0.9, 5);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], cx = GX + m.col * CELL, cy = GY + m.row * CELL; if (x > cx && x < cx + CELL && y > cy && y < cy + CELL) { m.steps = (m.steps + 1) % 4; game.audio.play('se_tap', 0.3); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    var trace = mirrors ? traceLaser() : { path: [], hit: false };
    if (state === S.ATTRACT) {
      if (!mirrors) { initGame(); trace = traceLaser(); } background(); drawBoard(trace);
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON TARGET!' : 'TIME OUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitFlash > 0) hitFlash -= dt * 2;
      if (trace.hit) {
        hold += dt; hitFlash = 0.3;
        if (hold >= 1.0) { hold = 0; hits++; game.audio.play('se_success', 0.4); var tx = GX + (target.col + 0.5) * CELL, ty = GY + (target.row + 0.5) * CELL; for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); } if (hits >= NEEDED) { finish(true); return; } }
      } else hold = Math.max(0, hold - dt);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard(trace);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.b, hitFlash * 0.06);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (trace.hit) { var bw = 300, bx = W / 2 - bw / 2, by = snap(H * 0.84); game.draw.rect(bx, by, bw, 16, '#0a1a0c', 0.8); game.draw.rect(bx, by, bw * hold, 16, C.b, 0.9); txt('HOLD ON TARGET', W / 2, by - 16, 30, C.b); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
