// 346-laser-reflect.js
// レーザーリフレクト — 盤上の斜め鏡をタップで回転させ、左からのレーザーをターゲットに当てる光学パズル
// 操作: 鏡をタップして向き(/⟷\)を切り替え、レーザーの反射でターゲットを撃つ
// 成功: 3個のターゲットを撃破  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、光学盤） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#eaffea', grid:'#0a2818' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER REFLECT';
  var HOW_TO_PLAY = 'TAP MIRRORS TO ROTATE · REFLECT THE LASER INTO TARGETS';
  var MAX_TIME = 15;         // 修正2: 40 → 15（時間が制約）
  var NEEDED   = 3;          // 修正2: 8 → 3
  var COLS = 5, ROWS = 6, CELL = snap(W * 0.86 / COLS), OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirrors, targets, hit, downCount, timeLeft, done, laserPath, flashes, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

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
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, C.d, 0.4);
    game.draw.rect(OX, OY, COLS * CELL, ROWS * CELL, '#061810', 0.9);
    for (var r = 0; r <= ROWS; r++) game.draw.rect(OX, OY + r * CELL, COLS * CELL, 2, C.grid, 0.6);
    for (var c = 0; c <= COLS; c++) game.draw.rect(OX + c * CELL, OY, 2, ROWS * CELL, C.grid, 0.6);
  }

  function cx(c) { return OX + c * CELL + CELL / 2; }
  function cy(r) { return OY + r * CELL + CELL / 2; }

  function setup() {
    mirrors = [{ r: 0, c: 1, t: '/' }, { r: 2, c: 3, t: '\\' }, { r: 3, c: 1, t: '/' }, { r: 4, c: 4, t: '\\' }, { r: 1, c: 4, t: '/' }, { r: 5, c: 2, t: '\\' }];
    targets = [{ r: 0, c: 4 }, { r: 3, c: 4 }, { r: 5, c: 0 }, { r: 5, c: 3 }];
    hit = [false, false, false, false];
  }

  function mirrorAt(r, c) { for (var i = 0; i < mirrors.length; i++) if (mirrors[i].r === r && mirrors[i].c === c) return mirrors[i]; return null; }
  function targetAt(r, c) { for (var i = 0; i < targets.length; i++) if (targets[i].r === r && targets[i].c === c) return i; return -1; }

  function trace() {
    laserPath = []; var r = 0, c = -1, dr = 0, dc = 1;
    for (var step = 0; step < 40; step++) {
      r += dr; c += dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      laserPath.push({ r: r, c: c });
      var m = mirrorAt(r, c); if (m) { if (m.t === '/') { var t = dr; dr = -dc; dc = -t; } else { var t2 = dr; dr = dc; dc = t2; } }
      var ti = targetAt(r, c); if (ti >= 0) hit[ti] = true;
    }
  }

  function countHit() { var n = 0; for (var i = 0; i < hit.length; i++) if (hit[i]) n++; return n; }

  function initGame() { setup(); downCount = 0; timeLeft = MAX_TIME; done = false; flashes = []; particles = []; trace(); downCount = countHit(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (downCount * 500 + Math.ceil(timeLeft) * 100) : downCount * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    pc(OX - 40, cy(0), 22, C.f, 0.9); txt('>', OX - 20, cy(0) + 12, 30, C.c);
    for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti], tx = cx(t.c), ty = cy(t.r); if (hit[ti]) { ring(tx, ty, 40, C.a, 0.6); txt('X', tx, ty + 12, 40, C.a); } else { ring(tx, ty, 40, C.b, 0.8); pc(tx, ty, 20, C.b, 0.5); } }
    if (laserPath.length) { pline(OX - 40, cy(0), cx(laserPath[0].c), cy(laserPath[0].r), C.f, 0.9, 6); for (var lp = 1; lp < laserPath.length; lp++) pline(cx(laserPath[lp - 1].c), cy(laserPath[lp - 1].r), cx(laserPath[lp].c), cy(laserPath[lp].r), C.f, 0.9, 6); }
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mx = cx(m.c), my = cy(m.r), L = CELL * 0.4; if (m.t === '/') pline(mx - L, my + L, mx + L, my - L, C.e, 0.95, 10); else pline(mx - L, my - L, mx + L, my + L, C.e, 0.95, 10); }
    for (var fa = 0; fa < flashes.length; fa++) ring(cx(flashes[fa].c), cy(flashes[fa].r), 60 * (1 - flashes[fa].life), C.b, flashes[fa].life);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var m = mirrorAt(r, c);
    if (m) {
      m.t = m.t === '/' ? '\\' : '/'; game.audio.play('se_tap', 0.3);
      for (var i = 0; i < hit.length; i++) hit[i] = false; trace(); var hc = countHit();
      if (hc > downCount) { for (var ti = 0; ti < targets.length; ti++) if (hit[ti]) flashes.push({ r: targets[ti].r, c: targets[ti].c, life: 1.0 }); game.audio.play('se_success', 0.5); }
      downCount = hc;
      if (downCount >= NEEDED) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 68, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 22, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawBoard();
      txt(resultSuccess ? 'ALL DOWN!' : 'TIME OUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var fa = flashes.length - 1; fa >= 0; fa--) { flashes[fa].life -= dt * 2; if (flashes[fa].life <= 0) flashes.splice(fa, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    txt('TAP MIRRORS TO ROTATE', W / 2, snap(H * 0.88), 34, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(downCount + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
