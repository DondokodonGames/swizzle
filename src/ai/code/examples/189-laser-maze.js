// 189-laser-maze.js
// レーザー迷路 — ミラーを回転させてレーザーをゴールに当てる光学パズル
// 操作: タップでミラーの角度を90度回転
// 成功: レーザーがゴールに到達  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、光学ラボ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER MAZE';
  var HOW_TO_PLAY = 'TAP MIRRORS TO ROTATE · HIT THE ★';
  var MAX_TIME = 20;             // 修正2: 60 → 20
  var COLS = 7, ROWS = 9, CELL = 140;
  var GX = snap((W - COLS * CELL) / 2), GY = snap(260);
  var SOURCE = { col: 0, row: 2 }, GOAL = { col: 6, row: 6 };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrors, laserPath, timeLeft, done, elapsed;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) { var t = i / steps; game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 1); }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function key(c, r) { return c + ',' + r; }

  function initMirrors() {
    mirrors = {};
    var list = [{ c: 1, r: 2 }, { c: 3, r: 2 }, { c: 5, r: 2 }, { c: 2, r: 5 }, { c: 4, r: 6 }];
    for (var i = 0; i < list.length; i++) mirrors[key(list[i].c, list[i].r)] = 45;
  }

  function trace() {
    var path = [], x = SOURCE.col, y = SOURCE.row, dx = 1, dy = 0, steps = 200;
    while (steps-- > 0) {
      path.push({ x: x, y: y });
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
      var mk = key(nx, ny);
      if (mirrors[mk] !== undefined) {
        var a = mirrors[mk];
        if (a === 45) { if (dx === 1) { dx = 0; dy = -1; } else if (dx === -1) { dx = 0; dy = 1; } else if (dy === -1) { dx = 1; dy = 0; } else { dx = -1; dy = 0; } }
        else { if (dx === 1) { dx = 0; dy = 1; } else if (dx === -1) { dx = 0; dy = -1; } else if (dy === 1) { dx = 1; dy = 0; } else { dx = -1; dy = 0; } }
        path.push({ x: nx, y: ny }); x = nx; y = ny;
      } else { x = nx; y = ny; }
    }
    return path;
  }

  function won() { var l = laserPath[laserPath.length - 1]; return l && l.x === GOAL.col && l.y === GOAL.row; }

  function background() {
    game.draw.clear(C.bg);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) game.draw.rect(GX + c * CELL + 2, GY + r * CELL + 2, CELL - 4, CELL - 4, '#0a0018', 0.7);
  }

  function drawScene() {
    // レーザー
    for (var li = 1; li < laserPath.length; li++) {
      var a = laserPath[li - 1], b = laserPath[li];
      pl(GX + a.x * CELL + CELL / 2, GY + a.y * CELL + CELL / 2, GX + b.x * CELL + CELL / 2, GY + b.y * CELL + CELL / 2, C.a, 8);
    }
    // ミラー
    for (var mk in mirrors) {
      var p = mk.split(','), mc = parseInt(p[0]), mr = parseInt(p[1]);
      var mx = GX + mc * CELL + CELL / 2, my = GY + mr * CELL + CELL / 2, half = CELL * 0.36;
      if (mirrors[mk] === 45) pl(mx - half, my + half, mx + half, my - half, C.e, 10);
      else pl(mx - half, my - half, mx + half, my + half, C.e, 10);
    }
    // ソース
    var sx = GX + SOURCE.col * CELL + CELL / 2, sy = GY + SOURCE.row * CELL + CELL / 2;
    pc(sx, sy, 24, C.a, 1); txt('>', sx, sy - 8, 32, C.g);
    // ゴール
    var gx = GX + GOAL.col * CELL + CELL / 2, gy = GY + GOAL.row * CELL + CELL / 2;
    var on = Math.floor(elapsed * 8) % 2 === 0;
    pc(gx, gy, 30, C.b, on ? 0.9 : 0.6); txt('★', gx, gy - 8, 36, C.g);
  }

  function initGame() { initMirrors(); laserPath = trace(); timeLeft = MAX_TIME; done = false; elapsed = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 60 + 500) : 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((x - GX) / CELL), row = Math.floor((y - GY) / CELL);
    var mk = key(col, row);
    if (mirrors[mk] !== undefined) {
      mirrors[mk] = mirrors[mk] === 45 ? 135 : 45;
      game.audio.play('se_tap', 0.4);
      laserPath = trace();
      if (won()) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    elapsed += dt;
    if (state === S.ATTRACT) {
      background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.90, 30, C.b);
      if (Math.floor(elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.95, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LASER LOCKED!' : 'TIME OUT', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }

    background(); drawScene();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('TAP MIRRORS', W / 2, H - 110, 40, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
