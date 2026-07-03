// 439-ice-slide.js
// 氷上スライド — スワイプした方向へペンギンが滑り出し、壁にぶつかるまで止まらない。ゴールへ導く
// 操作: スワイプ（上下左右）でペンギンを滑らせる。壁で止まる特性を使ってゴールへ
// 成功: 2面 クリア  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷原） ──
  var C = { bg:'#020c18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'SWIPE TO SLIDE THE PENGUIN · IT STOPS AT WALLS · REACH THE GOAL';
  var MAX_TIME = 30;
  var NEEDED   = 2;          // 修正2: 10 → 2
  var GRID = 7, CELL = snap(W * 0.13), OX = snap((W - GRID * snap(W * 0.13)) / 2), OY = snap((H - GRID * snap(W * 0.13)) / 2);

  var levels = [
    { peng: [1, 1], goal: [5, 5], walls: [[3, 1], [3, 2], [3, 3], [1, 4]] },
    { peng: [0, 3], goal: [6, 3], walls: [[2, 3], [2, 2], [4, 3], [4, 4]] },
    { peng: [0, 0], goal: [6, 6], walls: [[2, 0], [2, 2], [4, 2], [4, 4], [6, 4]] }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var level, pengX, pengY, goalX, goalY, walls, moving, mvx, mvy, solved, timeLeft, done, flash, trail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.18) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); }

  function loadLevel(idx) { var lv = levels[idx % levels.length]; pengX = lv.peng[0]; pengY = lv.peng[1]; goalX = lv.goal[0]; goalY = lv.goal[1]; walls = lv.walls.map(function(w) { return { x: w[0], y: w[1] }; }); moving = false; trail = []; }

  function isWall(x, y) { if (x < 0 || x >= GRID || y < 0 || y >= GRID) return true; for (var i = 0; i < walls.length; i++) if (walls[i].x === x && walls[i].y === y) return true; return false; }

  function slide(dx, dy) { if (moving) return; if (isWall(pengX + dx, pengY + dy)) return; mvx = dx; mvy = dy; moving = true; game.audio.play('se_tap', 0.3); }

  function initGame() { level = 0; solved = 0; timeLeft = MAX_TIME; done = false; flash = 0; loadLevel(0); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 700 + Math.ceil(timeLeft) * 100) : solved * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var cx = OX + c * CELL, cy = OY + r * CELL; if (isWall(c, r) && c >= 0 && c < GRID && r >= 0 && r < GRID) { game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.d, 0.9); game.draw.rect(cx + 2, cy + 2, CELL - 4, 8, C.e, 0.4); } else { game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.e, 0.12); if ((c + r) % 2 === 0) game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.g, 0.05); } }
    for (var ti = 0; ti < trail.length; ti++) pc(OX + trail[ti].x * CELL + CELL / 2, OY + trail[ti].y * CELL + CELL / 2, 14 * (ti / trail.length), C.e, ti / trail.length * 0.4);
    var gx = OX + goalX * CELL + CELL / 2, gy = OY + goalY * CELL + CELL / 2; ring(gx, gy, CELL * 0.32, C.b, 0.5); pc(gx, gy, CELL * 0.16, C.b, 0.8); txt('G', gx, gy + 12, 34, '#000');
    var px = OX + pengX * CELL + CELL / 2, py = OY + pengY * CELL + CELL / 2;
    pc(px, py, 34, '#1a2838', 0.95); pc(px, py + 6, 22, C.g, 0.85); pc(px - 10, py - 14, 6, C.g, 0.9); pc(px + 10, py - 14, 6, C.g, 0.9); pc(px, py - 2, 8, C.f, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || moving) return;
    if (d === 'up') slide(0, -1); else if (d === 'down') slide(0, 1); else if (d === 'left') slide(-1, 0); else if (d === 'right') slide(1, 0);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!walls) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SLID HOME!' : 'TIME OUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (moving) {
        var nx = pengX + mvx, ny = pengY + mvy;
        if (isWall(nx, ny)) { moving = false; mvx = 0; mvy = 0; if (pengX === goalX && pengY === goalY) { solved++; flash = 0.8; game.audio.play('se_success', 0.7); if (solved >= NEEDED) { finish(true); return; } level++; setTimeout(function() { if (!done && state === S.PLAYING) loadLevel(level); }, 800); } }
        else { trail.push({ x: pengX, y: pengY }); if (trail.length > 8) trail.shift(); pengX = nx; pengY = ny; }
      }
    }

    // ---- 描画 ----
    background(); drawBoard();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);
    txt('LEVEL ' + (level + 1) + ' / ' + NEEDED, W / 2, snap(H * 0.88), 40, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
