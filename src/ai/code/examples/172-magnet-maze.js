// 172-magnet-maze.js
// 磁石迷路 — 磁力で引き寄せられる玉を壁で弾きながらゴールへ導く吸いつき感
// 操作: タップした位置に磁石を置き、N/S極を切り替え
// 成功: ゴール到達  失敗: 20秒以内に着かない

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電磁ラボ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET MAZE';
  var HOW_TO_PLAY = 'TAP TO PLACE MAGNET · GUIDE BALL TO G';
  var MAX_TIME = 20;             // 修正2: 30 → 20
  var CELL = 120, COLS = 8, ROWS = 12;
  var MAZE_X = snap((W - COLS * CELL) / 2), MAZE_Y = snap(260);
  var BALL_R = 30, FRICTION = 0.88, MAG_FORCE = 800, MAG_DIST = 360;

  // 修正2: 壁を減らしたやさしい迷路
  var MAZE = [
    [0,0,0,0,0,0,0,0],
    [0,1,0,1,0,1,0,0],
    [0,0,0,0,0,0,0,0],
    [0,1,0,1,1,0,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,0,1,0,0,0],
    [0,1,0,0,0,0,1,0],
    [0,0,0,1,0,0,0,0],
    [0,1,0,0,0,1,0,0],
    [0,0,0,1,0,0,0,0],
    [0,1,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, by, bvx, bvy, magX, magY, magPole, goalX, goalY, trail, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var mr = 0; mr < ROWS; mr++) for (var mc = 0; mc < COLS; mc++) {
      var wx = MAZE_X + mc * CELL, wy = MAZE_Y + mr * CELL;
      if (MAZE[mr][mc] === 1) { game.draw.rect(wx, wy, CELL, CELL, C.d, 0.9); game.draw.rect(wx, wy, CELL, 8, C.a); }
      else game.draw.rect(wx, wy, CELL, CELL, '#0a0018', 0.4);
    }
  }

  function initGame() {
    bx = MAZE_X + CELL * 0.5; by = MAZE_Y + CELL * 0.5; bvx = 0; bvy = 0;
    magX = W / 2; magY = H / 2; magPole = 1;
    goalX = MAZE_X + CELL * (COLS - 0.5); goalY = MAZE_Y + CELL * (ROWS - 0.5);
    trail = []; timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 80 + 500) : 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    magPole *= -1; magX = x; magY = y;
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      pc(goalX, goalY, 36, C.b, 0.8); txt('G', goalX, goalY - 8, 36, C.g);
      pc(MAZE_X + CELL * 0.5, MAZE_Y + CELL * 0.5, BALL_R, C.e, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 58, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'REACHED G!' : 'TIME OUT', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var dx = magX - bx, dy = magY - by, dist = Math.hypot(dx, dy);
      if (dist < MAG_DIST && dist > 10) { var force = MAG_FORCE * magPole * (1 - dist / MAG_DIST); bvx += (dx / dist) * force * dt; bvy += (dy / dist) * force * dt; }
      bvx *= Math.pow(FRICTION, dt * 60); bvy *= Math.pow(FRICTION, dt * 60);
      var nbx = bx + bvx * dt, nby = by + bvy * dt;
      // 壁は弾く（即死しない＝易化）
      var col = Math.floor((nbx - MAZE_X) / CELL), row = Math.floor((nby - MAZE_Y) / CELL);
      var hit = false;
      for (var r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) for (var c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
        if (MAZE[r] && MAZE[r][c] === 1) {
          var wx = MAZE_X + c * CELL, wy = MAZE_Y + r * CELL;
          var cx2 = Math.max(wx, Math.min(wx + CELL, nbx)), cy2 = Math.max(wy, Math.min(wy + CELL, nby));
          if (Math.hypot(nbx - cx2, nby - cy2) < BALL_R) { hit = true; break; }
        }
      }
      if (hit) { bvx *= -0.5; bvy *= -0.5; nbx = bx; nby = by; game.audio.play('se_tap', 0.15); }
      bx = Math.max(MAZE_X + BALL_R, Math.min(MAZE_X + COLS * CELL - BALL_R, nbx));
      by = Math.max(MAZE_Y + BALL_R, Math.min(MAZE_Y + ROWS * CELL - BALL_R, nby));
      trail.push({ x: bx, y: by, life: 0.4 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      if (Math.hypot(bx - goalX, by - goalY) < BALL_R + 40) { finish(true); return; }
    }

    // ---- 描画 ----
    background();
    pc(goalX, goalY, 36, C.b, Math.floor(game.time.elapsed * 8) % 2 === 0 ? 0.9 : 0.6); txt('G', goalX, goalY - 8, 36, C.g);
    for (var ti2 = 0; ti2 < trail.length; ti2++) pc(trail[ti2].x, trail[ti2].y, BALL_R * trail[ti2].life * 1.5, C.e, trail[ti2].life * 0.4);
    // 磁石
    var mcol = magPole > 0 ? C.a : C.e;
    pc(magX, magY, 36, mcol, 0.8); txt(magPole > 0 ? 'N' : 'S', magX, magY - 8, 40, C.g);
    for (var fi = 0; fi < 8; fi++) { var fa = fi * Math.PI / 4; game.draw.rect(snap(magX + Math.cos(fa) * 80) - 4, snap(magY + Math.sin(fa) * 80) - 4, 8, 8, mcol, 0.4); }
    // 玉
    pc(bx, by, BALL_R, C.e, 1); pc(bx - 10, by - 10, 8, C.g, 0.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(magPole > 0 ? 'N: PULL' : 'S: PUSH', W / 2, 168, 44, mcol);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
