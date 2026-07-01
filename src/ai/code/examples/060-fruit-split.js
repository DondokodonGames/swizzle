// 060-fruit-split.js
// フルーツスプリット — 宙に浮く果物を素早くスワイプで切り裂く爽快感
// 操作: スワイプ/タップで果物を切る（爆弾は切らない）
// 成功: 2個の果物を切る  失敗: 爆弾を3回切る or 果物3個を逃す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };
  var FRUITS = [C.e, C.f, C.d, C.g, C.b];

  var GAME_TITLE  = 'FRUIT SPLIT';
  var HOW_TO_PLAY = 'SLICE FRUIT, AVOID BOMBS';
  var MAX_TIME = 20;
  var NEEDED = 2;           // 修正2: 20 → 2
  var MAX_BOMB = 3, MAX_MISS = 3, ITEM_R = 64, GRAVITY = 1400, SPAWN_INTERVAL = 0.65;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var items, slices, spawnTimer, score, bombCuts, missed, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function spawnItem() { items.push({ x: 140 + Math.random() * (W - 280), y: H + ITEM_R, vx: (Math.random() - 0.5) * 200, vy: -(1000 + Math.random() * 400), isBomb: Math.random() < 0.2, fruitIdx: Math.floor(Math.random() * FRUITS.length), cut: false, r: ITEM_R }); }
  function initGame() { items = []; slices = []; spawnTimer = 0.3; score = 0; bombCuts = 0; missed = 0; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function cutItem(i) {
    var it = items[i]; it.cut = true;
    if (it.isBomb) { bombCuts++; for (var p = 0; p < 8; p++) { var a = p / 8 * Math.PI * 2; slices.push({ x: it.x, y: it.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, col: C.f, life: 0.5 }); } game.audio.play('se_failure', 0.8); if (bombCuts >= MAX_BOMB) finish(false); }
    else { score++; for (var q = 0; q < 6; q++) { var a2 = q / 6 * Math.PI * 2; slices.push({ x: it.x, y: it.y, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, col: FRUITS[it.fruitIdx], life: 0.45 }); } game.audio.play('se_tap', 0.8); if (score >= NEEDED) finish(true); }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    for (var i = items.length - 1; i >= 0; i--) if (!items[i].cut && items[i].y < H * 0.9 && items[i].y > H * 0.08) cutItem(i);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = items.length - 1; i >= 0; i--) { var it = items[i]; if (it.cut) continue; var dx = x - it.x, dy = y - it.y; if (Math.sqrt(dx * dx + dy * dy) < it.r + 24) { cutItem(i); break; } }
  });

  // 世界観: 空中に舞う果実を刃で斬るフルーツ道場。爆弾は斬るな。
  function background() { game.draw.clear('#000011'); for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.2 + i * 200, W, 2, C.a, 0.15); }

  function drawFruit(it) {
    if (it.cut) return;
    if (it.isBomb) { drawPixelCircle(it.x, it.y, it.r, '#333355', 1); game.draw.rect(snap(it.x) - 6, snap(it.y - it.r - 24), 12, 28, C.d); if (Math.floor(game.time.elapsed * 12) % 2 === 0) drawPixelCircle(it.x, it.y - it.r - 28, 12, C.e, 1); txt('!', it.x, it.y, 52, C.e); }
    else { drawPixelCircle(it.x, it.y, it.r, FRUITS[it.fruitIdx], 1); drawPixelCircle(it.x - it.r * 0.3, it.y - it.r * 0.3, 12, C.g, 0.6); game.draw.rect(snap(it.x), snap(it.y - it.r - 16), 12, 16, C.f); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame();
      background();
      drawFruit({ x: W / 2, y: H * 0.45, isBomb: false, fruitIdx: 0, r: ITEM_R, cut: false });
      txt(GAME_TITLE,  W / 2, H * 0.2, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.7, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.77, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.85, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnItem(); spawnTimer = Math.max(0.4, SPAWN_INTERVAL - (MAX_TIME - timeLeft) * 0.01); }
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i]; it.vy += GRAVITY * dt; it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.y > H + ITEM_R + 40) { if (!it.cut && !it.isBomb) { missed++; if (missed >= MAX_MISS) { finish(false); return; } } items.splice(i, 1); }
      }
      for (var s = slices.length - 1; s >= 0; s--) { slices[s].x += slices[s].vx * dt; slices[s].y += slices[s].vy * dt; slices[s].vy += 600 * dt; slices[s].life -= dt; if (slices[s].life <= 0) slices.splice(s, 1); }
    }

    // ---- draw ----
    background();
    for (var sl = 0; sl < slices.length; sl++) { var p = slices[sl]; game.draw.rect(snap(p.x) - 8, snap(p.y) - 8, 16, 16, p.col, p.life / 0.45); }
    for (var j = 0; j < items.length; j++) drawFruit(items[j]);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 150, 40, C.f);
    for (var b = 0; b < MAX_BOMB; b++) game.draw.rect(W * 0.32 + b * 56, 200, 36, 36, b < bombCuts ? C.e : '#330000');
    for (var mf = 0; mf < MAX_MISS; mf++) game.draw.rect(W * 0.58 + mf * 56, 200, 36, 36, mf < missed ? C.e : '#330000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
