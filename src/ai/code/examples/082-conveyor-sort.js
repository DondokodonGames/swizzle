// 082-conveyor-sort.js
// コンベアソート — 流れてくるアイテムを正しいシュートに振り分ける仕分け工場
// 操作: スワイプ左右で振り分け先を切り替え、タップで排出
// 成功: 2個正しく仕分け  失敗: 3回ミス or 35秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'CONVEYOR SORT';
  var HOW_TO_PLAY = 'SWIPE TO AIM, TAP TO EJECT';
  var MAX_TIME = 35;
  var NEEDED = 2;           // 修正2: 20 → 2
  var MAX_MISS = 3;         // 修正2: 5 → 3
  var BELT_Y = H * 0.4, BELT_SPEED = 190, LAND_Y = H * 0.78;
  var SPAWN_INTERVAL = 1.8;

  var TYPES = [
    { id: 0, color: C.a, sym: 'O' },
    { id: 1, color: C.e, sym: 'S' },
    { id: 2, color: C.b, sym: 'T' }
  ];
  var BIN_X = [W * 0.2, W * 0.5, W * 0.8];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var items, selectedBin, score, misses, timeLeft, done, spawnTimer, feedback, feedbackOk;

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

  function spawnItem() { items.push({ x: -60, y: BELT_Y, type: TYPES[Math.floor(Math.random() * TYPES.length)], launched: false, vx: 0, vy: 0, targetBin: 0 }); }
  function initGame() { items = []; selectedBin = 1; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.6; feedback = 0; feedbackOk = false; spawnItem(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; feedbackOk = false; feedback = 0.35; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) finish(false); }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') selectedBin = Math.max(0, selectedBin - 1);
    if (dir === 'right') selectedBin = Math.min(2, selectedBin + 1);
    game.audio.play('se_tap', 0.3);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var cand = items.filter(function(it) { return !it.launched && it.x > 40 && it.x < W * 0.75; });
    if (!cand.length) return;
    cand.sort(function(a, b) { return b.x - a.x; });
    var item = cand[0], tx = BIN_X[selectedBin], t = 0.5;
    item.vx = (tx - item.x) / t; item.vy = (LAND_Y - BELT_Y) / t - 0.5 * 900 * t;
    item.launched = true; item.targetBin = selectedBin;
    game.audio.play('se_tap', 0.6);
  });

  // 世界観: 自動仕分け工場。ベルトの部品を形ごとに正しいシュートへ落とす。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(0, snap(BELT_Y) - 48, W, 96, '#221040');
    game.draw.rect(0, snap(BELT_Y) - 48, W, 8, C.d);
    game.draw.rect(0, snap(BELT_Y) + 40, W, 8, C.d);
    var off = (game.time.elapsed * BELT_SPEED) % 80;
    for (var s = -80; s < W + 80; s += 80) { var bx = snap((s + off)); game.draw.rect(bx, snap(BELT_Y) - 40, 6, 80, C.d, 0.4); }
    txt('SORTING FACTORY', W / 2, 250, 34, C.b);
  }

  function drawItem(it) {
    var col = it.type.color;
    if (it.type.id === 0) drawPixelCircle(it.x, it.y, 36, col, 1);
    else if (it.type.id === 1) game.draw.rect(snap(it.x) - 32, snap(it.y) - 32, 64, 64, col);
    else { game.draw.rect(snap(it.x) - 8, snap(it.y) - 32, 16, 16, col); game.draw.rect(snap(it.x) - 24, snap(it.y) - 16, 48, 16, col); game.draw.rect(snap(it.x) - 40, snap(it.y), 80, 16, col); }
  }

  function drawBins() {
    for (var b = 0; b < 3; b++) {
      var bx = BIN_X[b], sel = b === selectedBin, col = TYPES[b].color;
      game.draw.rect(snap(bx) - 80, snap(LAND_Y) + 20, 160, 130, sel ? col : '#221040');
      game.draw.rect(snap(bx) - 88, snap(LAND_Y), 176, 16, sel ? col : '#332255');
      txt(TYPES[b].sym, bx, LAND_Y + 90, 60, sel ? C.g : col);
      if (sel) txt('▼', bx, LAND_Y - 30, 44, col);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame();
      background();
      drawBins();
      drawItem({ x: W / 2, y: BELT_Y, type: TYPES[Math.floor(game.time.elapsed) % 3] });
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.215, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.6, 66, C.a);
        txt('TAP TO START', W / 2, H * 0.65, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.7, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = Math.max(1.2, SPAWN_INTERVAL - score * 0.1); spawnItem(); }
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        if (!it.launched) {
          it.x += BELT_SPEED * dt;
          if (it.x > W + 60) { items.splice(i, 1); addMiss(); }
        } else {
          it.vy += 900 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
          if (it.y > LAND_Y) {
            items.splice(i, 1);
            if (it.targetBin === it.type.id) { score++; feedbackOk = true; feedback = 0.3; game.audio.play('se_tap', 0.9); if (score >= NEEDED) { finish(true); return; } }
            else addMiss();
          }
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawBins();
    for (var k = 0; k < items.length; k++) drawItem(items[k]);
    if (feedback > 0) txt(feedbackOk ? 'SORTED!' : 'WRONG!', W / 2, H * 0.32, 72, feedbackOk ? C.b : C.a);
    timeBar();
    txt('SORT ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt('◄ SWIPE ►  TAP TO DROP', W / 2, H - 90, 40, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
