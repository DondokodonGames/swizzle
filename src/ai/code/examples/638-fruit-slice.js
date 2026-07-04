// 638-fruit-slice.js
// フルーツスライス — 打ち上がる果物をスワイプで切る。爆弾を切ると失敗、落とすとミス
// 操作: スワイプで果物を斬る。黒い爆弾は切らずにやり過ごす。取りこぼしも失点
// 成功: 12個 スライス  失敗: 爆弾3切 or 3個 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、道場／果実色は保持） ──
  var C = { bg:'#030a02', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUIT_COLORS = ['#ff2079', '#ff6600', '#ffe600', '#00ff9f'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRUIT SLICE';
  var HOW_TO_PLAY = 'SWIPE TO SLICE THE FRUIT · DO NOT CUT THE BLACK BOMBS · DO NOT DROP FRUIT';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_DROP = 3;
  var MAX_BOMB = 3;
  var FRUIT_R = 60, BOMB_R = 56;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var items, sliced, dropped, bombHits, timeLeft, done, spawnTimer, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#030d02');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnItem() {
    var isBomb = timeLeft < MAX_TIME - 4 && Math.random() < 0.2, spd = 900 + (MAX_TIME - timeLeft) * 8 + Math.random() * 200;
    items.push({ x: 80 + Math.random() * (W - 160), y: H + 80, vx: (Math.random() - 0.5) * 300, vy: -spd, r: isBomb ? BOMB_R : FRUIT_R, isBomb: isBomb, typeIdx: Math.floor(Math.random() * 4), cut: false, cutTimer: 0 });
  }

  function initGame() { items = []; sliced = 0; dropped = 0; bombHits = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0; particles = []; flash = 0; flashCol = C.b; spawnItem(); spawnItem(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sliced * 400 + Math.ceil(timeLeft) * 100) : sliced * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ii = 0; ii < items.length; ii++) {
      var it = items[ii], al = it.cut ? (1 - it.cutTimer * 2) : 0.9; if (al <= 0) continue;
      if (it.isBomb) { pc(it.x, it.y, BOMB_R, '#1f2937', al); pc(it.x - 15, it.y - 15, BOMB_R * 0.25, '#374151', al * 0.5); game.draw.rect(snap(it.x) - 3, snap(it.y - BOMB_R * 0.9), 6, 16, C.a, al); }
      else { var fc = FRUIT_COLORS[it.typeIdx]; pc(it.x, it.y, FRUIT_R, fc, al); pc(it.x - 20, it.y - 20, FRUIT_R * 0.32, C.g, al * 0.6); if (it.cut) game.draw.line(it.x - FRUIT_R, it.y, it.x + FRUIT_R, it.y, C.g, 6); }
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var len = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)); if (len < 1) return;
    var dx = (x2 - x1) / len, dy = (y2 - y1) / len;
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var it = items[ii]; if (it.cut) continue;
      var fx = it.x - x1, fy = it.y - y1, proj = Math.max(0, Math.min(len, fx * dx + fy * dy));
      var cx = x1 + dx * proj, cy = y1 + dy * proj, dist = Math.sqrt((it.x - cx) * (it.x - cx) + (it.y - cy) * (it.y - cy));
      if (dist < it.r + 20) {
        it.cut = true;
        if (it.isBomb) {
          bombHits++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: it.x, y: it.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: '#374151' }); }
          if (bombHits >= MAX_BOMB) { finish(false); return; }
        } else {
          sliced++; flash = 0.15; flashCol = FRUIT_COLORS[it.typeIdx]; game.audio.play('se_success', 0.4);
          for (var p2 = 0; p2 < 5; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: it.x, y: it.y, vx: Math.cos(pa2) * 300, vy: Math.sin(pa2) * 300, life: 0.4, col: FRUIT_COLORS[it.typeIdx] }); }
          if (sliced >= NEEDED) { finish(true); return; }
        }
      }
    }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FRUIT NINJA!' : (bombHits >= MAX_BOMB ? 'BOOM!' : 'DROPPED'), W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      spawnTimer += dt; var rate = Math.max(0.4, 1.1 - (MAX_TIME - timeLeft) * 0.02);
      if (spawnTimer >= rate) { spawnTimer = 0; spawnItem(); if (timeLeft < MAX_TIME - 8 && Math.random() < 0.3) spawnItem(); }
      for (var ii = items.length - 1; ii >= 0; ii--) {
        var it = items[ii]; it.vy += 800 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.cut) { it.cutTimer += dt; if (it.cutTimer > 0.5) items.splice(ii, 1); continue; }
        if (it.y > H + it.r + 20) { if (!it.isBomb) { dropped++; flash = 0.2; flashCol = C.a; if (dropped >= MAX_DROP) { finish(false); return; } } items.splice(ii, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sliced + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(120 + di * 56) - 10, 224, 20, 20, di < dropped ? C.a : '#030d02');
    for (var bi = 0; bi < MAX_BOMB; bi++) game.draw.rect(snap(W - 120 - bi * 56) - 10, 224, 20, 20, bi < bombHits ? C.f : '#030d02');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
