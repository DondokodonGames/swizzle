// 086-beat-slice.js
// ビートスライス — リズムに合わせて流れるブロックを指定方向にスワイプで斬る
// 操作: ブロックの矢印方向にスワイプ
// 成功: 2ブロック斬る  失敗: 3回ミス or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BEAT SLICE';
  var HOW_TO_PLAY = 'SWIPE THE ARROW DIRECTION';
  var MAX_TIME = 30;
  var NEEDED = 2;           // 修正2: 16 → 2
  var MAX_MISS = 3;         // 修正2: 4 → 3
  var BPM = 120, BEAT = 60 / BPM, HIT_Y = H * 0.62;
  var LANES = [W * 0.28, W * 0.5, W * 0.72];
  var DIRS = ['up', 'down', 'left', 'right'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var blocks, score, misses, timeLeft, done, feedback, feedbackOk, beatTimer, beatCount, beatFlash, slashes;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks2 = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks2);
    for (var i = 0; i < blocks2; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function drawArrow(cx, cy, dir, color) {
    cx = snap(cx); cy = snap(cy);
    var parts;
    if (dir === 'up')    parts = [[-24, -8, 48, 8], [-16, -16, 32, 8], [-8, -24, 16, 8], [-8, 0, 16, 32]];
    if (dir === 'down')  parts = [[-24, 8, 48, 8], [-16, 16, 32, 8], [-8, 24, 16, 8], [-8, -32, 16, 32]];
    if (dir === 'left')  parts = [[-8, -24, 8, 48], [-16, -16, 8, 32], [-24, -8, 8, 16], [0, -8, 32, 16]];
    if (dir === 'right') parts = [[0, -24, 8, 48], [8, -16, 8, 32], [16, -8, 8, 16], [-32, -8, 32, 16]];
    for (var i = 0; i < parts.length; i++) game.draw.rect(cx + parts[i][0], cy + parts[i][1], parts[i][2], parts[i][3], color);
  }

  function spawnBlock() {
    blocks.push({ x: LANES[Math.floor(Math.random() * 3)], y: -80, dir: DIRS[Math.floor(Math.random() * 4)], color: Math.random() > 0.5 ? C.a : C.e, speed: 460, hit: false, hitTimer: 0 });
  }
  function initGame() { blocks = []; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; beatTimer = BEAT * 2; beatCount = 0; beatFlash = 0; slashes = []; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; feedbackOk = false; feedback = 0.35; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.hit) continue;
      if (b.y > H * 0.42 && b.y < H * 0.82) {
        if (b.dir === dir) {
          b.hit = true; b.hitTimer = 0.3; score++; feedbackOk = true; feedback = 0.25; game.audio.play('se_tap', 1.0);
          slashes.push({ x: b.x, y: b.y, dir: dir, life: 0.3, color: b.color });
          if (score >= NEEDED) finish(true);
        } else addMiss();
        return;
      }
    }
  });

  // 世界観: ネオンの斬撃道場。流れるブロックを矢印通りに斬る。
  function background() {
    game.draw.clear('#0a0018');
    if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.d, beatFlash / 0.1 * 0.08);
    for (var l = 0; l < LANES.length; l++) game.draw.rect(snap(LANES[l]) - 2, 300, 4, H - 500, C.d, 0.25);
    game.draw.rect(0, snap(HIT_Y) - 4, W, 8, C.b, 0.6);
    txt('SLICE ZONE', W / 2, HIT_Y - 40, 32, C.b);
    txt('BEAT DOJO', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var bi = 0; bi < blocks.length; bi++) {
      var b = blocks[bi];
      if (b.hit) { var fr = b.hitTimer / 0.3; game.draw.rect(snap(b.x) - 56, snap(b.y) - 56, 112, 112, b.color, fr * 0.5); }
      else { game.draw.rect(snap(b.x) - 56, snap(b.y) - 56, 112, 112, b.color); game.draw.rect(snap(b.x) - 44, snap(b.y) - 44, 88, 88, '#000000', 0.25); drawArrow(b.x, b.y, b.dir, C.g); }
    }
    for (var si = 0; si < slashes.length; si++) {
      var s = slashes[si], fr = s.life / 0.3, horiz = s.dir === 'left' || s.dir === 'right';
      if (horiz) game.draw.rect(snap(s.x) - 120, snap(s.y) - 6, 240, 12, C.g, fr);
      else game.draw.rect(snap(s.x) - 6, snap(s.y) - 120, 12, 240, C.g, fr);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!blocks) initGame();
      background();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      drawArrow(W / 2, H * 0.42, DIRS[Math.floor(game.time.elapsed) % 4], C.c);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 66, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      beatTimer -= dt;
      if (beatTimer <= 0) { beatTimer = BEAT; beatCount++; beatFlash = 0.1; if (beatCount % 2 === 0) spawnBlock(); }
      if (beatFlash > 0) beatFlash -= dt;
      for (var i = blocks.length - 1; i >= 0; i--) {
        var b = blocks[i];
        if (!b.hit) { b.y += b.speed * dt; if (b.y > H * 0.85) { blocks.splice(i, 1); addMiss(); } }
        else { b.hitTimer -= dt; if (b.hitTimer <= 0) blocks.splice(i, 1); }
      }
      for (var k = slashes.length - 1; k >= 0; k--) { slashes[k].life -= dt; if (slashes[k].life <= 0) slashes.splice(k, 1); }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'SLICE!' : 'MISS!', W / 2, H * 0.3, 72, feedbackOk ? C.b : C.a);
    timeBar();
    txt('SLICE ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(W / 2 + (mi - 1) * 64 - 20, 150, 40, 40, mi < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
