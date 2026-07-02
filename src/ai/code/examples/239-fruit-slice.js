// 239-fruit-slice.js
// フルーツスライス — 放り上がるフルーツをスワイプで斬る爽快感、爆弾だけは斬ってはいけない
// 操作: スワイプで斬る（爆弾は避ける）
// 成功: 5個斬る  失敗: 爆弾を斬る or フルーツを3個落とす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、屋台の果物斬り） ──
  var C = { bg:'#060208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUITS = [C.a, C.f, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRUIT SLICE';
  var HOW_TO_PLAY = 'SWIPE TO SLICE · NEVER SLICE THE BOMB';
  var MAX_TIME = 15;
  var NEEDED   = 5;           // 修正2: 20 → 5
  var MAX_DROP = 3;          // 修正2: 5 → 3
  var TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var items, effects, score, dropped, timeLeft, done, spawnTimer;

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
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a1a');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnItem() {
    var isBomb = Math.random() < 0.22, side = Math.random() < 0.5 ? -1 : 1;
    var x = side < 0 ? -50 : W + 50, y = snap(game.random(H * 0.45, H * 0.7)), speed = 400 + Math.random() * 180;
    items.push({ x: x, y: y, vx: side < 0 ? speed : -speed, vy: -(350 + Math.random() * 180), isBomb: isBomb, col: isBomb ? '#222' : FRUITS[Math.floor(Math.random() * FRUITS.length)], r: 46, sliced: false, st: 0 });
  }

  function drawItem(it) {
    if (it.isBomb) { pc(it.x, it.y, it.r, '#222', it.sliced ? it.st / 0.4 : 0.95); pc(it.x, it.y, it.r * 0.4, C.a, 0.5); game.draw.rect(snap(it.x) - 4, snap(it.y) - it.r - 12, 8, 12, C.f); }
    else { pc(it.x, it.y, it.r, it.col, it.sliced ? it.st / 0.4 : 0.95); pc(it.x - 14, it.y - 14, 8, C.g, 0.7); if (!it.sliced) game.draw.rect(snap(it.x) - 4, snap(it.y) - it.r - 8, 8, 10, C.b); }
  }

  function initGame() { items = []; effects = []; score = 0; dropped = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 50) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    if (x1 === undefined) return;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 1) return;
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var it = items[ii]; if (it.sliced) continue;
      var proj = ((it.x - x1) * dx + (it.y - y1) * dy) / len, perp = Math.abs((it.x - x1) * dy - (it.y - y1) * dx) / len;
      if (perp < it.r + 12 && proj >= 0 && proj <= len) {
        it.sliced = true; it.st = 0.4;
        if (it.isBomb) { effects.push({ x: it.x, y: it.y, life: 0.6, col: C.a, big: true }); finish(false); return; }
        score++; game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; effects.push({ x: it.x + Math.cos(a) * 20, y: it.y + Math.sin(a) * 20, life: 0.4, col: it.col, big: false }); }
        if (score >= NEEDED) { finish(true); return; }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); pc(W * 0.3, H * 0.45, 46, C.a, 0.9); pc(W * 0.55, H * 0.55, 46, C.b, 0.9); pc(W * 0.72, H * 0.4, 40, '#222', 0.9);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#665566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SLICED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnItem(); spawnTimer = 0.7 * (0.6 + Math.random() * 0.7); }
      for (var ii = items.length - 1; ii >= 0; ii--) {
        var it = items[ii]; it.x += it.vx * dt; it.y += it.vy * dt; it.vy += 500 * dt;
        if (it.sliced) { it.st -= dt; if (it.st <= 0) items.splice(ii, 1); }
        else if (it.y > H + 80) { if (!it.isBomb) { dropped++; if (dropped >= MAX_DROP) { finish(false); return; } } items.splice(ii, 1); }
      }
      for (var ei = effects.length - 1; ei >= 0; ei--) { effects[ei].life -= dt; if (effects[ei].life <= 0) effects.splice(ei, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ii2 = 0; ii2 < items.length; ii2++) drawItem(items[ii2]);
    for (var ei2 = 0; ei2 < effects.length; ei2++) { var ef = effects[ei2]; pc(ef.x, ef.y, (ef.big ? 70 : 26) * (1 + (0.5 - ef.life)), ef.col, ef.life * 1.4); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var dd = 0; dd < MAX_DROP; dd++) game.draw.rect(snap(W / 2 + (dd - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, dd < dropped ? C.a : '#1a0a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
