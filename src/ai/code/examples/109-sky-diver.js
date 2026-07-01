// 109-sky-diver.js
// スカイダイバー — 落下しながらスワイプで位置を合わせリングを通り抜ける
// 操作: スワイプ左右で落下位置を調整
// 成功: 2個のリングを通る  失敗: 3個外す or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'SKY DIVER';
  var HOW_TO_PLAY = 'SWIPE L/R TO THREAD THE RINGS';
  var MAX_TIME = 30;
  var NEEDED = 2;           // 修正2: 10 → 2
  var MAX_MISS = 3;
  var DIVER_Y = H * 0.24, DIVER_R = 32, RING_R = 120, RING_SPEED = 240, SPAWN_Y = H * 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var diverX, targetX, rings, score, misses, timeLeft, done, passFlash, missFlash, trail;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function drawPixelRing(px, py, r, color, alpha) {
    var step = 8, ro = r * r, ri = (r - 16) * (r - 16); px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step) { var d = xx * xx + yy * yy; if (d <= ro && d >= ri) game.draw.rect(px + xx, py + yy, step, step, color, alpha); }
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

  function spawnRing() { rings.push({ x: 140 + Math.random() * (W - 280), y: SPAWN_Y, passed: false, mf: 0 }); }
  function initGame() { diverX = W / 2; targetX = W / 2; rings = []; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; passFlash = 0; missFlash = 0; trail = []; spawnRing(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') targetX = Math.max(80, targetX - 200);
    if (dir === 'right') targetX = Math.min(W - 80, targetX + 200);
  });

  // 世界観: 上空のスカイダイブ。せり上がるリングに位置を合わせ通り抜ける。
  function background() {
    game.draw.clear('#0a0018');
    if (passFlash > 0) game.draw.rect(0, 0, W, H, C.b, passFlash * 0.2);
    if (missFlash > 0) game.draw.rect(0, 0, W, H, C.a, missFlash * 0.3);
    for (var i = 0; i < 6; i++) { var cx = snap((i * 211 - game.time.elapsed * 40) % (W + 200) - 100); game.draw.rect(cx, snap(H * 0.2 + i * 120), 160, 30, C.d, 0.15); }
    txt('SKY DIVE', W / 2, 300, 34, C.b);
  }

  function drawScene() {
    for (var tri = 0; tri < trail.length; tri++) { var t = trail[tri], tf = 1 - t.age / 0.4; drawPixelCircle(t.x, t.y, DIVER_R * tf * 0.6, C.d, tf * 0.3); }
    for (var ri = 0; ri < rings.length; ri++) {
      var r = rings[ri];
      if (!r.passed) { drawPixelRing(r.x, r.y, RING_R, C.e, 0.9); txt(r.x < diverX - 20 ? '<' : (r.x > diverX + 20 ? '>' : 'v'), r.x, r.y - RING_R - 30, 44, C.b); }
      else if (r.mf > 0) drawPixelRing(r.x, r.y, RING_R + r.mf * 30, C.a, r.mf);
    }
    // ダイバー（ドット絵）
    drawPixelCircle(diverX, DIVER_Y, DIVER_R, C.f, 1);
    game.draw.rect(snap(diverX) - 10, snap(DIVER_Y) - 10, 8, 8, C.g);
    game.draw.rect(snap(diverX) + 4, snap(DIVER_Y) - 10, 8, 8, C.g);
    game.draw.rect(snap(diverX) - 36, snap(DIVER_Y) - 40, 72, 12, C.c, 0.5);   // パラシュート示唆
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rings) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.85, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 46, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      diverX += (targetX - diverX) * Math.min(1, dt * 8);
      trail.push({ x: diverX, y: DIVER_Y, age: 0 });
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
      trail = trail.filter(function(t) { return t.age < 0.4; });
      for (var i = rings.length - 1; i >= 0; i--) {
        var r = rings[i]; r.y -= RING_SPEED * dt; if (r.mf > 0) r.mf -= dt;
        if (!r.passed && r.y < DIVER_Y) {
          r.passed = true;
          if (Math.abs(diverX - r.x) < RING_R - DIVER_R) { score++; passFlash = 0.3; game.audio.play('se_tap', 1.0); if (score >= NEEDED) { finish(true); return; } }
          else { misses++; r.mf = 0.4; missFlash = 0.3; game.audio.play('se_failure', 0.7); if (misses >= MAX_MISS) { finish(false); return; } }
        }
        if (r.y < -140) rings.splice(i, 1);
      }
      if (rings.length < 2) spawnRing();
      if (passFlash > 0) passFlash -= dt;
      if (missFlash > 0) missFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('RINGS ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt('SWIPE TO ALIGN!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
