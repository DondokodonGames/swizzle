// 113-color-cascade.js
// カラーカスケード — 降ってくる色の雫を同じ色の容器でタップして受ける振り分け
// 操作: スワイプ左右で容器を選び、タップで雫を受け取る
// 成功: 2個正確に振り分ける  失敗: 3回ミス or 45秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'COLOR CASCADE';
  var HOW_TO_PLAY = 'AIM THE BUCKET, CATCH THE DROP';
  var MAX_TIME = 45;
  var NEEDED = 2;           // 修正2: 25 → 2
  var MAX_MISS = 3;         // 修正2: 8 → 3
  var DROP_COLORS = [C.a, C.b, C.e];
  var NUM_BUCKETS = 3, BUCKET_W = 220, BUCKET_H = 200, BUCKET_Y = H * 0.74, DROP_R = 48, FALL_SPEED = 320, SPAWN_INTERVAL = 1.1;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var bucketXs, selected, drops, score, misses, timeLeft, done, spawnTimer, catchFlash, catchOk;

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

  bucketXs = []; for (var b = 0; b < NUM_BUCKETS; b++) bucketXs.push(W / 2 + (b - 1) * (BUCKET_W + 40));

  function spawnDrop() { drops.push({ x: 180 + Math.random() * (W - 360), y: -DROP_R, colorIdx: Math.floor(Math.random() * DROP_COLORS.length) }); }
  function initGame() { selected = 1; drops = []; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; catchFlash = 0; catchOk = false; spawnDrop(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; catchOk = false; catchFlash = 0.3; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) finish(false); }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') selected = Math.max(0, selected - 1);
    if (dir === 'right') selected = Math.min(NUM_BUCKETS - 1, selected + 1);
    game.audio.play('se_tap', 0.3);
  });
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      if (d.y > H * 0.5) {
        if (d.colorIdx === selected) { score++; catchOk = true; catchFlash = 0.35; game.audio.play('se_tap', 0.9); if (score >= NEEDED) { finish(true); return; } }
        else addMiss();
        drops.splice(i, 1); return;
      }
    }
  });

  // 世界観: 色の滝を仕分けるプラント。同色の容器に雫を落とし込む。
  function background() {
    game.draw.clear('#0a0018');
    if (catchFlash > 0) game.draw.rect(0, 0, W, H, catchOk ? C.b : C.a, catchFlash * 0.15);
    txt('CASCADE PLANT', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var di = 0; di < drops.length; di++) { var d = drops[di]; drawPixelCircle(d.x, d.y, DROP_R, DROP_COLORS[d.colorIdx], 1); game.draw.rect(snap(d.x) - 8, snap(d.y - DROP_R) - 8, 12, 12, DROP_COLORS[d.colorIdx], 0.6); }
    for (var bi = 0; bi < NUM_BUCKETS; bi++) {
      var bx = bucketXs[bi], sel = bi === selected, col = DROP_COLORS[bi];
      if (sel) game.draw.rect(snap(bx - BUCKET_W / 2) - 8, snap(BUCKET_Y) - 8, BUCKET_W + 16, BUCKET_H + 16, col, 0.25);
      game.draw.rect(snap(bx - BUCKET_W / 2), snap(BUCKET_Y), BUCKET_W, BUCKET_H, '#221040');
      game.draw.rect(snap(bx - BUCKET_W / 2), snap(BUCKET_Y), BUCKET_W, 14, col);
      drawPixelCircle(bx, BUCKET_Y + BUCKET_H / 2, 44, col, 1);
      if (sel) txt('^', bx, BUCKET_Y - 40, 44, col);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!drops) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.55, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.6, 40, '#888888');
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
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTimer = Math.max(0.6, SPAWN_INTERVAL - score * 0.05); spawnDrop(); }
      for (var i = drops.length - 1; i >= 0; i--) { drops[i].y += FALL_SPEED * dt; if (drops[i].y > H + DROP_R) { drops.splice(i, 1); addMiss(); if (done) return; } }
      if (catchFlash > 0) catchFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (catchFlash > 0) txt(catchOk ? 'CAUGHT!' : 'WRONG!', bucketXs[selected], BUCKET_Y - 100, 56, catchOk ? C.b : C.a);
    timeBar();
    txt('SORT ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
