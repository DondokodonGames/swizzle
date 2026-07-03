// 458-laser-mirror.js
// レーザーミラー — 盤上のミラーをタップで45度回し、レーザーを受信機まで導く
// 操作: ミラーをタップして「/」と「\」を切り替え、光路を受信機へ通す
// 成功: 2面 クリア  失敗: 30秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、光学実験室） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER MIRROR';
  var HOW_TO_PLAY = 'TAP MIRRORS TO ROTATE · GUIDE THE BEAM TO THE RECEIVER';
  var MAX_TIME = 30;
  var NEEDED   = 2;          // 修正2: 6 → 2
  var GRID = 7, CELL = 128;
  var OX = snap((W - GRID * CELL) / 2), OY = snap((H - GRID * CELL) / 2 - 20);

  var levels = [
    { source: { x: 0, y: 3, dir: 'right' }, receiver: { x: 6, y: 3 }, mirrors: [{ x: 2, y: 3, angle: 45 }, { x: 4, y: 1, angle: 135 }], walls: [] },
    { source: { x: 0, y: 1, dir: 'right' }, receiver: { x: 6, y: 5 }, mirrors: [{ x: 3, y: 1, angle: 45 }, { x: 3, y: 5, angle: 135 }, { x: 6, y: 1, angle: 45 }], walls: [{ x: 1, y: 3 }, { x: 5, y: 3 }] },
    { source: { x: 3, y: 0, dir: 'down' }, receiver: { x: 3, y: 6 }, mirrors: [{ x: 1, y: 2, angle: 45 }, { x: 5, y: 4, angle: 135 }, { x: 3, y: 3, angle: 135 }], walls: [] },
    { source: { x: 0, y: 0, dir: 'right' }, receiver: { x: 6, y: 6 }, mirrors: [{ x: 2, y: 0, angle: 45 }, { x: 2, y: 4, angle: 135 }, { x: 6, y: 4, angle: 45 }], walls: [{ x: 4, y: 2 }] }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentLevel, mirrors, source, receiver, walls, laserPath, solved, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function loadLevel(idx) {
    var lv = levels[idx % levels.length];
    source = { x: lv.source.x, y: lv.source.y, dir: lv.source.dir };
    receiver = { x: lv.receiver.x, y: lv.receiver.y };
    mirrors = lv.mirrors.map(function(m) { return { x: m.x, y: m.y, angle: m.angle }; });
    walls = (lv.walls || []).map(function(w) { return { x: w.x, y: w.y }; });
    computeLaser();
  }

  function computeLaser() {
    laserPath = [];
    var x = source.x, y = source.y;
    var dx = source.dir === 'right' ? 1 : source.dir === 'left' ? -1 : 0;
    var dy = source.dir === 'down' ? 1 : source.dir === 'up' ? -1 : 0;
    var steps = 50; laserPath.push({ x: x, y: y });
    while (steps-- > 0) {
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) break;
      if (walls.some(function(w) { return w.x === nx && w.y === ny; })) break;
      var mirror = null;
      for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].x === nx && mirrors[mi].y === ny) { mirror = mirrors[mi]; break; }
      if (mirror) {
        laserPath.push({ x: nx, y: ny });
        if (mirror.angle === 45) { if (dx === 1) { dx = 0; dy = -1; } else if (dx === -1) { dx = 0; dy = 1; } else if (dy === 1) { dx = -1; dy = 0; } else { dx = 1; dy = 0; } }
        else { if (dx === 1) { dx = 0; dy = 1; } else if (dx === -1) { dx = 0; dy = -1; } else if (dy === 1) { dx = 1; dy = 0; } else { dx = -1; dy = 0; } }
        x = nx; y = ny;
      } else { x = nx; y = ny; laserPath.push({ x: x, y: y }); if (x === receiver.x && y === receiver.y) break; }
    }
  }

  function isHitting() { var last = laserPath[laserPath.length - 1]; return last && last.x === receiver.x && last.y === receiver.y; }

  function initGame() { currentLevel = 0; solved = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; loadLevel(0); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 1000 + Math.ceil(timeLeft) * 100) : solved * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function cx(gx) { return snap(OX + gx * CELL + CELL / 2); }
  function cy(gy) { return snap(OY + gy * CELL + CELL / 2); }

  function drawBoard() {
    for (var ri = 0; ri < GRID; ri++) for (var ci = 0; ci < GRID; ci++) game.draw.rect(OX + ci * CELL + 4, OY + ri * CELL + 4, CELL - 8, CELL - 8, '#001a00', 0.5);
    for (var wi = 0; wi < walls.length; wi++) game.draw.rect(OX + walls[wi].x * CELL + 6, OY + walls[wi].y * CELL + 6, CELL - 12, CELL - 12, C.d, 0.8);
    // レーザー
    for (var li = 0; li < laserPath.length - 1; li++) pline(cx(laserPath[li].x), cy(laserPath[li].y), cx(laserPath[li + 1].x), cy(laserPath[li + 1].y), C.a, 0.9, 8);
    // ソース
    pc(cx(source.x), cy(source.y), 26, C.a, 0.9); pc(cx(source.x), cy(source.y), 12, C.g, 0.7);
    // 受信機
    var hit = isHitting(); pc(cx(receiver.x), cy(receiver.y), 30, hit ? C.b : '#204030', 0.9); pc(cx(receiver.x), cy(receiver.y), 16, hit ? C.g : '#305040', 0.7);
    // ミラー
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mx = cx(m.x), my = cy(m.y); if (m.angle === 45) pline(mx - 36, my + 36, mx + 36, my - 36, C.e, 0.9, 10); else pline(mx - 36, my - 36, mx + 36, my + 36, C.e, 0.9, 10); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    for (var mi = 0; mi < mirrors.length; mi++) {
      if (mirrors[mi].x === col && mirrors[mi].y === row) {
        mirrors[mi].angle = mirrors[mi].angle === 45 ? 135 : 45; game.audio.play('se_tap', 0.4); computeLaser();
        if (isHitting()) {
          solved++; flash = 0.8; game.audio.play('se_success', 0.7);
          var rx = cx(receiver.x), ry = cy(receiver.y);
          for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: rx, y: ry, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.6, col: C.b }); }
          if (solved >= NEEDED) { finish(true); return; }
          currentLevel++; setTimeout(function() { if (!done) loadLevel(currentLevel); }, 1000);
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BEAM CONNECTED!' : 'TIME UP', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('LEVEL ' + (currentLevel + 1), W / 2, snap(H * 0.90), 40, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
