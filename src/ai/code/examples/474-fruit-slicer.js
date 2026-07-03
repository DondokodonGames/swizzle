// 474-fruit-slicer.js
// フルーツスライサー — スワイプで飛んでくるフルーツを切り、爆弾（黒）は切らずに避ける
// 操作: フルーツをスワイプでスライス（爆弾を切る or 取りこぼすとペナルティ）
// 成功: 8個 スライス  失敗: 爆弾3回 or 3個 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、屋台のフルーツ） ──
  var C = { bg:'#030a00', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUITS = [{ col: C.a, inn: C.g }, { col: C.f, inn: C.c }, { col: C.c, inn: C.g }, { col: C.b, inn: C.g }, { col: C.d, inn: C.g }];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRUIT SLICER';
  var HOW_TO_PLAY = 'SWIPE TO SLICE FRUIT · DO NOT CUT THE BLACK BOMBS';
  var MAX_TIME = 15;
  var NEEDED     = 8;        // 修正2: 30 → 8
  var MAX_BOMBS  = 3;
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var items, juice, slash, sliced, bombHits, escaped, timeLeft, done, nextSpawn, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#031a00');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnItem() {
    var isBomb = Math.random() < 0.2 + sliced * 0.005;
    items.push({ x: snap(160 + Math.random() * (W - 320)), y: H + 60, vx: (Math.random() - 0.5) * 200, vy: -(950 + Math.random() * 350), r: isBomb ? 52 : 58 + Math.random() * 16, bomb: isBomb, type: FRUITS[Math.floor(Math.random() * FRUITS.length)] });
  }

  function initGame() { items = []; juice = []; slash = []; sliced = 0; bombHits = 0; escaped = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.6; flash = 0; flashCol = C.b; spawnItem(); spawnItem(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sliced * 500 + Math.ceil(timeLeft) * 100) : sliced * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawItems() {
    for (var ii = 0; ii < items.length; ii++) {
      var it = items[ii];
      if (it.bomb) { pc(it.x, it.y, it.r, '#1a1917', 1.0); pc(it.x, it.y, it.r - 10, '#44403c', 0.4); game.draw.rect(snap(it.x) - 3, snap(it.y - it.r - 40), 6, 40, C.f, 0.8); pc(it.x + Math.sin(game.time.elapsed * 15) * 8, it.y - it.r - 44, 8, C.f, 0.9); }
      else { pc(it.x, it.y, it.r, it.type.col, 0.9); pc(it.x - it.r * 0.25, it.y - it.r * 0.25, it.r * 0.28, C.g, 0.3); }
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var it = items[ii];
      var lx = x2 - x1, ly = y2 - y1, len = Math.hypot(lx, ly); if (len < 1) continue;
      var nx = lx / len, ny = ly / len, proj = (it.x - x1) * nx + (it.y - y1) * ny, cx = x1 + proj * nx, cy = y1 + proj * ny;
      if (Math.hypot(it.x - cx, it.y - cy) < it.r - 8) {
        if (it.bomb) {
          bombHits++; flash = 0.8; flashCol = C.a; game.audio.play('se_failure', 0.6);
          for (var bi = 0; bi < 12; bi++) { var a = Math.random() * Math.PI * 2; juice.push({ x: it.x, y: it.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 100, life: 0.8, col: '#44403c', r: 16 }); }
          items.splice(ii, 1); if (bombHits >= MAX_BOMBS) { finish(false); return; }
        } else {
          sliced++; flash = 0.25; flashCol = C.c; game.audio.play('se_tap', 0.4);
          for (var ji = 0; ji < 10; ji++) { var a2 = Math.random() * Math.PI * 2; juice.push({ x: it.x, y: it.y, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250 - 50, life: 0.7, col: it.type.inn, r: 11 }); }
          items.splice(ii, 1); if (sliced >= NEEDED) { finish(true); return; }
        }
      }
    }
    for (var si = 0; si < 6; si++) { var t = si / 5; slash.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, life: 0.3, r: 8 }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 22, C.b);
      pc(W * 0.35, H * 0.52, 60, C.a, 0.9); pc(W * 0.5, H * 0.55, 52, C.b, 0.9); pc(W * 0.65, H * 0.52, 52, '#1a1917', 1.0);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.78, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SLICED UP!' : 'CHOPPED OUT', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnItem(); if (Math.random() < 0.3) spawnItem(); nextSpawn = 0.5 + Math.random() * 0.5; }
      for (var ii = items.length - 1; ii >= 0; ii--) { var it = items[ii]; it.vy += 700 * dt; it.x += it.vx * dt; it.y += it.vy * dt; if (it.y > H + 100 && it.vy > 0) { items.splice(ii, 1); if (!it.bomb) { escaped++; flash = 0.3; flashCol = C.a; if (escaped >= MAX_ESCAPE) { finish(false); return; } } } }
      for (var jp = juice.length - 1; jp >= 0; jp--) { var j = juice[jp]; j.x += j.vx * dt; j.y += j.vy * dt; j.vy += 500 * dt; j.life -= dt * 1.2; if (j.life <= 0) juice.splice(jp, 1); }
      for (var sp = slash.length - 1; sp >= 0; sp--) { slash[sp].life -= dt * 4; if (slash[sp].life <= 0) slash.splice(sp, 1); }
    }

    // ---- 描画 ----
    background(); drawItems();
    for (var jp2 = 0; jp2 < juice.length; jp2++) game.draw.rect(snap(juice[jp2].x) - juice[jp2].r / 2, snap(juice[jp2].y) - juice[jp2].r / 2, juice[jp2].r, juice[jp2].r, juice[jp2].col, juice[jp2].life);
    for (var sp2 = 0; sp2 < slash.length; sp2++) game.draw.rect(snap(slash[sp2].x) - 4, snap(slash[sp2].y) - 4, 8, 8, C.g, slash[sp2].life * 2);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sliced + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi2 = 0; bi2 < MAX_BOMBS; bi2++) game.draw.rect(snap(W * 0.22 + bi2 * 48) - 10, 224, 20, 20, bi2 < bombHits ? C.a : '#031a00');
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W * 0.62 + ei * 48) - 10, 224, 20, 20, ei < escaped ? C.f : '#031a00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
