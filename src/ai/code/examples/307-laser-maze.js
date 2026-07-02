// 307-laser-maze.js
// レーザー迷路 — 盤上のミラーをタップで回転させ、光源からゴールへレーザーを導くパズル
// 操作: ミラーをタップして向き(/⟷\)を切り替える
// 成功: 3つのパズルを解く  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、光学盤） ──
  var C = { bg:'#020810', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#eaffea', board:'#061020' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER MAZE';
  var HOW_TO_PLAY = 'TAP MIRRORS TO ROTATE · GUIDE LASER TO GOAL';
  var MAX_TIME = 15;         // 修正2: 60 → 15（時間が制約）
  var NEEDED   = 3;          // 修正2: 8 → 3
  var GRID = 7, CELL = snap(W * 0.86 / GRID), OX = snap((W - CELL * GRID) / 2), OY = snap(H * 0.26);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var src, goal, mirrors, walls, laserPath, solved, timeLeft, done, particles, flash;

  var PUZZLES = [
    { source: { gx: 0, gy: 2, dir: 0 }, goal: { gx: 3, gy: 6 }, mirrors: [{ gx: 3, gy: 2, angle: 1 }], walls: [] },
    { source: { gx: 0, gy: 4, dir: 0 }, goal: { gx: 5, gy: 0 }, mirrors: [{ gx: 5, gy: 4, angle: 0 }], walls: [{ gx: 2, gy: 4 }, { gx: 3, gy: 4 }] },
    { source: { gx: 1, gy: 0, dir: 1 }, goal: { gx: 6, gy: 3 }, mirrors: [{ gx: 1, gy: 3, angle: 0 }], walls: [] },
    { source: { gx: 0, gy: 1, dir: 0 }, goal: { gx: 3, gy: 5 }, mirrors: [{ gx: 3, gy: 1, angle: 1 }, { gx: 3, gy: 3, angle: 0 }], walls: [] },
    { source: { gx: 6, gy: 2, dir: 2 }, goal: { gx: 2, gy: 6 }, mirrors: [{ gx: 2, gy: 2, angle: 1 }], walls: [] }
  ];

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(OX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, C.d, 0.4);
    game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, C.board, 0.95);
    for (var gi = 0; gi <= GRID; gi++) { game.draw.rect(OX + gi * CELL, OY, 2, GRID * CELL, '#0a2818', 0.6); game.draw.rect(OX, OY + gi * CELL, GRID * CELL, 2, '#0a2818', 0.6); }
  }

  function gp(gx, gy) { return { x: OX + gx * CELL + CELL / 2, y: OY + gy * CELL + CELL / 2 }; }

  function makePuzzle() { var p = PUZZLES[solved % PUZZLES.length]; src = { gx: p.source.gx, gy: p.source.gy, dir: p.source.dir }; goal = { gx: p.goal.gx, gy: p.goal.gy }; mirrors = p.mirrors.map(function(m) { return { gx: m.gx, gy: m.gy, angle: m.angle }; }); walls = p.walls.slice(); }

  function traceLaser() {
    laserPath = [];
    var x = src.gx, y = src.gy, dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]], dx = dirs[src.dir][0], dy = dirs[src.dir][1];
    var st = gp(x, y); laserPath.push(st);
    for (var step = 0; step < 60; step++) {
      x += dx; y += dy;
      if (x < 0 || x >= GRID || y < 0 || y >= GRID) { laserPath.push(gp(Math.max(0, Math.min(GRID - 1, x)), Math.max(0, Math.min(GRID - 1, y)))); break; }
      var hitWall = false; for (var wi = 0; wi < walls.length; wi++) if (walls[wi].gx === x && walls[wi].gy === y) { hitWall = true; break; }
      if (hitWall) { laserPath.push(gp(x - dx, y - dy)); break; }
      var mir = null; for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].gx === x && mirrors[mi].gy === y) { mir = mirrors[mi]; break; }
      laserPath.push(gp(x, y));
      if (mir) { if (mir.angle === 0) { var t = dx; dx = -dy; dy = -t; } else { var t2 = dx; dx = dy; dy = t2; } }
      if (x === goal.gx && y === goal.gy) return true;
    }
    return false;
  }

  function initGame() { solved = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; makePuzzle(); traceLaser(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 500 + Math.ceil(timeLeft) * 100) : solved * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard(hit) {
    for (var wi = 0; wi < walls.length; wi++) { var wp = gp(walls[wi].gx, walls[wi].gy); game.draw.rect(wp.x - CELL / 2 + 4, wp.y - CELL / 2 + 4, CELL - 8, CELL - 8, '#153020', 0.9); }
    var gpx = gp(goal.gx, goal.gy); game.draw.rect(gpx.x - CELL / 2 + 6, gpx.y - CELL / 2 + 6, CELL - 12, CELL - 12, C.b, hit ? 0.8 : 0.25); pc(gpx.x, gpx.y, CELL * 0.22, C.b, hit ? 0.9 : 0.4); txt('G', gpx.x, gpx.y + 10, 30, '#000');
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mp = gp(m.gx, m.gy), L = CELL * 0.4; if (m.angle === 0) pline(mp.x - L, mp.y + L, mp.x + L, mp.y - L, C.e, 0.95, 10); else pline(mp.x - L, mp.y - L, mp.x + L, mp.y + L, C.e, 0.95, 10); }
    var sp = gp(src.gx, src.gy); pc(sp.x, sp.y, CELL * 0.32, C.f, 0.95); pc(sp.x, sp.y, CELL * 0.16, C.c, 0.9);
    if (laserPath.length > 1) for (var li = 0; li < laserPath.length - 1; li++) pline(laserPath[li].x, laserPath[li].y, laserPath[li + 1].x, laserPath[li + 1].y, C.a, 0.9, 8);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi], mp = gp(m.gx, m.gy);
      if (Math.abs(x - mp.x) < CELL * 0.6 && Math.abs(y - mp.y) < CELL * 0.6) {
        m.angle = 1 - m.angle; game.audio.play('se_tap', 0.3);
        if (traceLaser()) {
          solved++; flash = 0.8; game.audio.play('se_success', 0.6);
          var gpx = gp(goal.gx, goal.gy);
          for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: gpx.x, y: gpx.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.7, col: C.b }); }
          if (solved >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (!done) { makePuzzle(); traceLaser(); } }, 700);
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawBoard(traceLaser());
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 24, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SOLVED!' : 'TIME OUT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
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
    var hit = traceLaser();
    background();
    if (flash > 0) game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, C.b, flash * 0.3);
    drawBoard(hit);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('TAP MIRRORS TO ROTATE', W / 2, snap(H * 0.88), 36, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
