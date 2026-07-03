// 448-wire-connect.js
// 配線パズル — 回路の断線（「!」マーク）をタップで繋ぎ、電源から出口まで電流を通す
// 操作: 断線したタイル（!）をすべてタップして回路を復旧（通常タイルを叩くとミス）
// 成功: 2回路 復旧  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、電気工事） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE CONNECT';
  var HOW_TO_PLAY = 'TAP THE BROKEN TILES (!) TO RESTORE THE CIRCUIT';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var GRID = 6, CELL = 128;
  var OX = snap((W - GRID * CELL) / 2), OY = snap((H - GRID * CELL) / 2 - 20);

  // タイル接続定義: 0=空, 1=横, 2=縦, 3=TL角, 4=TR角, 5=BR角, 6=BL角
  var CONNS = [ {}, { left:1, right:1 }, { up:1, down:1 }, { down:1, right:1 }, { down:1, left:1 }, { up:1, left:1 }, { up:1, right:1 } ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, broken, particles, completed, misses, timeLeft, done, flash, flashCol, flow, resultTimer, iphase;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

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

  function generateCircuit() {
    tiles = [];
    for (var i = 0; i < GRID * GRID; i++) tiles.push(0);

    // 左端から右端へ 1 本の経路を生成
    var path = [], px = 0, py = Math.floor(GRID / 2);
    path.push({ x: px, y: py });
    while (px < GRID - 1) {
      var dirs = [{ dx: 1, dy: 0 }];
      if (py < GRID - 2 && Math.random() < 0.3) dirs.push({ dx: 0, dy: 1 });
      if (py > 1 && Math.random() < 0.3) dirs.push({ dx: 0, dy: -1 });
      var dir = dirs[Math.floor(Math.random() * dirs.length)];
      px += dir.dx; py += dir.dy;
      if (py < 0) py = 0; if (py >= GRID) py = GRID - 1;
      path.push({ x: px, y: py });
    }

    // 経路にタイル種別を割り当て
    for (var pi2 = 0; pi2 < path.length; pi2++) {
      var p = path[pi2], prev = pi2 > 0 ? path[pi2 - 1] : null, next = pi2 < path.length - 1 ? path[pi2 + 1] : null;
      var up = false, dn = false, lf = false, rt = false;
      if (prev) { if (prev.x < p.x) lf = true; if (prev.x > p.x) rt = true; if (prev.y < p.y) up = true; if (prev.y > p.y) dn = true; }
      if (next) { if (next.x > p.x) rt = true; if (next.x < p.x) lf = true; if (next.y > p.y) dn = true; if (next.y < p.y) up = true; }
      var tt = 1;
      if (lf && rt && !up && !dn) tt = 1;
      else if (up && dn && !lf && !rt) tt = 2;
      else if (dn && rt && !up && !lf) tt = 3;
      else if (dn && lf && !up && !rt) tt = 4;
      else if (up && lf && !dn && !rt) tt = 5;
      else if (up && rt && !dn && !lf) tt = 6;
      tiles[p.y * GRID + p.x] = { type: tt, on: true };
    }

    // 断線を 2 箇所だけ作る（修正2: 減らして易しく）
    broken = [];
    var inner = path.slice(1, path.length - 1);
    for (var s2 = inner.length - 1; s2 > 0; s2--) { var jj = Math.floor(Math.random() * (s2 + 1)); var tp = inner[s2]; inner[s2] = inner[jj]; inner[jj] = tp; }
    var breakCount = Math.min(2, inner.length);
    for (var br = 0; br < breakCount; br++) {
      var bp = inner[br];
      broken.push({ x: bp.x, y: bp.y, fixed: false });
      if (tiles[bp.y * GRID + bp.x]) tiles[bp.y * GRID + bp.x].on = false;
    }
    flow = 0; iphase = 'fix';
  }

  function initGame() { particles = []; completed = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; flow = 0; generateCircuit(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 800 + Math.ceil(timeLeft) * 100) : completed * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(OX - 12, OY - 12, GRID * CELL + 24, GRID * CELL + 24, '#001a00', 0.8);
    for (var ri = 0; ri < GRID; ri++) for (var ci = 0; ci < GRID; ci++) {
      var tile = tiles[ri * GRID + ci];
      var cx = snap(OX + ci * CELL + CELL / 2), cy = snap(OY + ri * CELL + CELL / 2);
      game.draw.rect(OX + ci * CELL + 4, OY + ri * CELL + 4, CELL - 8, CELL - 8, '#002200', 0.4);
      if (!tile || tile.type === 0) continue;
      var conn = CONNS[tile.type], col = tile.on ? C.b : C.wire || '#204020', al = tile.on ? 0.9 : 0.4;
      col = tile.on ? C.b : '#205020';
      if (conn.left) game.draw.rect(cx - CELL / 2, cy - 8, CELL / 2, 16, col, al);
      if (conn.right) game.draw.rect(cx, cy - 8, CELL / 2, 16, col, al);
      if (conn.up) game.draw.rect(cx - 8, cy - CELL / 2, 16, CELL / 2, col, al);
      if (conn.down) game.draw.rect(cx - 8, cy, 16, CELL / 2, col, al);
      pc(cx, cy, 18, tile.on ? C.c : '#304030', 0.9);
      if (tile.on) pc(cx, cy, 8, C.g, 0.8);
    }
    // 断線ハイライト
    for (var bi = 0; bi < broken.length; bi++) {
      var b = broken[bi]; if (b.fixed) continue;
      var bx = snap(OX + b.x * CELL + CELL / 2), by = snap(OY + b.y * CELL + CELL / 2);
      var pulse = Math.floor(game.time.elapsed * 8) % 2 === 0 ? 0.9 : 0.4;
      ring(bx, by, 42, C.a, 0.4 * pulse); pc(bx, by, 26, C.a, 0.5 * pulse);
      txt('!', bx, by + 16, 48, C.g);
    }
    // 電源とゴール
    pc(OX - 36, snap(OY + GRID / 2 * CELL), 22, C.f, 0.9); pc(OX - 36, snap(OY + GRID / 2 * CELL), 10, C.g, 0.7);
    pc(OX + GRID * CELL + 36, snap(OY + GRID / 2 * CELL), 22, C.c, 0.9); pc(OX + GRID * CELL + 36, snap(OY + GRID / 2 * CELL), 10, C.g, 0.7);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'fix') return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = -1;
    for (var bi = 0; bi < broken.length; bi++) if (broken[bi].x === col && broken[bi].y === row && !broken[bi].fixed) { idx = bi; break; }
    if (idx >= 0) {
      broken[idx].fixed = true;
      if (tiles[row * GRID + col]) tiles[row * GRID + col].on = true;
      var cx = OX + col * CELL + CELL / 2, cy = OY + row * CELL + CELL / 2;
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.5, col: C.b }); }
      if (broken.every(function(bb) { return bb.fixed; })) {
        completed++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7);
        iphase = 'result'; resultTimer = 0;
        if (completed >= NEEDED) { finish(true); return; }
      } else game.audio.play('se_tap', 0.4);
    } else {
      misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
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
      txt(resultSuccess ? 'CIRCUIT LIVE!' : 'SHORT CIRCUIT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      flow += dt * 3;
      if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.0) generateCircuit(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'fix') txt('FIX THE BREAKS', W / 2, snap(H * 0.90), 40, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
