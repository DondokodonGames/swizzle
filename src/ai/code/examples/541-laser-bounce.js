// 541-laser-bounce.js
// レーザーバウンス — 盤上の鏡をタップで傾け、左から入るレーザーをターゲットへ導く
// 操作: 鏡（斜線）をタップして「＼」⇄「／」を切り替え、反射経路を作る
// 成功: ターゲット 4回 命中  失敗: 25秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、光学ラボ） ──
  var C = { bg:'#000510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER BOUNCE';
  var HOW_TO_PLAY = 'TAP MIRRORS TO ROTATE · GUIDE THE BEAM INTO THE TARGET';
  var MAX_TIME = 25;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var COLS = 5, ROWS = 8, CELL = 192, MAX_BOUNCES = 24;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.14), ENTRY_ROW = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrors, target, hits, timeLeft, done, particles, flash, laserPath, hitAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#00081a');
  }

  function background() { game.draw.clear(C.bg); }

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function initLevel() {
    mirrors = []; var placed = [], count = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) { var at = 0; while (at < 20) { var col = randInt(1, COLS - 2), row = randInt(1, ROWS - 2), key = col + ',' + row; if (placed.indexOf(key) === -1) { placed.push(key); mirrors.push({ col: col, row: row, angle: Math.random() < 0.5 ? 0 : 1 }); break; } at++; } }
    target = { col: COLS - 1, row: randInt(0, ROWS - 1) };
  }

  function traceLaser() {
    laserPath = []; var x = -1, y = ENTRY_ROW, dx = 1, dy = 0, path = [{ x: OX, y: OY + y * CELL + CELL / 2 }];
    for (var step = 0; step < MAX_BOUNCES; step++) {
      x += dx; y += dy;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) { path.push({ x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 }); break; }
      path.push({ x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 });
      if (target && x === target.col && y === target.row) { laserPath = path; return true; }
      var m = null; for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].col === x && mirrors[mi].row === y) { m = mirrors[mi]; break; }
      if (m) { if (m.angle === 0) { var t = dx; dx = dy; dy = t; } else { var t2 = dx; dx = -dy; dy = -t2; } }
    }
    laserPath = path; return false;
  }

  function initGame() { hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; hitAnim = 0; initLevel(); traceLaser(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 1000 + Math.ceil(timeLeft) * 100) : hits * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) game.draw.rect(OX + c * CELL + 4, OY + r * CELL + 4, CELL - 8, CELL - 8, '#00081a', 0.8);
    for (var li = 1; li < laserPath.length; li++) { var p1 = laserPath[li - 1], p2 = laserPath[li]; game.draw.line(p1.x, p1.y, p2.x, p2.y, C.a, 18); game.draw.line(p1.x, p1.y, p2.x, p2.y, C.f, 5); }
    if (target) { var tx3 = OX + target.col * CELL + CELL / 2, ty3 = OY + target.row * CELL + CELL / 2, pulse = 1 + Math.sin(game.time.elapsed * 5) * 0.12; pc(tx3, ty3, 44 * pulse, C.c, 0.2); pc(tx3, ty3, 34 * pulse, C.c, 0.9); pc(tx3, ty3, 14, C.g, 0.8); }
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mx = OX + m.col * CELL + CELL / 2, my = OY + m.row * CELL + CELL / 2, half = CELL * 0.36; if (m.angle === 0) game.draw.line(mx - half, my - half, mx + half, my + half, C.e, 12); else game.draw.line(mx - half, my + half, mx + half, my - half, C.e, 12); pc(mx, my, 18, C.g, 0.4); }
    // レーザー入射口
    var sy = OY + ENTRY_ROW * CELL + CELL / 2;
    game.draw.rect(0, sy - CELL * 0.4, OX, CELL * 0.8, C.f, 0.3);
    for (var ai = 0; ai < 5; ai++) game.draw.rect(OX / 2 - 20 + ai * 6, sy - (20 - ai * 4), 8, (20 - ai * 4) * 2, C.f, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi], mx = OX + m.col * CELL + CELL / 2, my = OY + m.row * CELL + CELL / 2;
      if (Math.abs(tx - mx) < CELL * 0.5 && Math.abs(ty - my) < CELL * 0.5) {
        m.angle = m.angle === 0 ? 1 : 0; game.audio.play('se_tap', 0.3);
        if (traceLaser()) {
          hits++; hitAnim = 0.6; flash = 0.3; game.audio.play('se_success', 0.8);
          var tx2 = OX + target.col * CELL + CELL / 2, ty2 = OY + target.row * CELL + CELL / 2;
          for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tx2, y: ty2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.c }); }
          if (hits >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (!done) { initLevel(); traceLaser(); } }, 600);
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.075, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.965, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DIRECT HIT!' : 'TIME UP', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (hitAnim > 0) hitAnim -= dt * 2;
      traceLaser();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
