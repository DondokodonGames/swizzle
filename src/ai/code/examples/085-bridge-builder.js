// 085-bridge-builder.js
// 橋渡し — タップで棒を伸ばし、離すと倒れる。ちょうどよい長さで崖を渡る
// 操作: タップで伸ばし始め、もう一度タップで止めて倒す
// 成功: 1つの崖を渡る  失敗: 棒が短か/長すぎて落ちる or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  var GAME_TITLE  = 'BRIDGE BUILDER';
  var HOW_TO_PLAY = 'TAP TO GROW, TAP TO DROP';
  var MAX_TIME = 40;
  var NEEDED = 1;           // 修正2: 5 → 1
  var FLOOR_Y = H * 0.6, PLATFORM_H = 72, PSIZE = 60, GROW_SPEED = 340, WALK_SPEED = 360;
  var NUM_PLATS = 4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var platforms, stickAngle, stickLen, playerX, cameraX, phase, score, timeLeft, done, deathFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003b00');
  }

  function genPlatforms() {
    platforms = []; var x = 0, pw = 180;
    platforms.push({ x: x, w: pw });
    for (var i = 0; i < NUM_PLATS; i++) { var gap = 150 + Math.random() * 130; x += pw + gap; pw = 130 + Math.random() * 90; platforms.push({ x: x, w: pw }); }
    playerX = platforms[0].x + platforms[0].w - PSIZE / 2; cameraX = 0;
  }
  function curPlat() { for (var i = 0; i < platforms.length - 1; i++) { var p = platforms[i]; if (playerX >= p.x && playerX <= p.x + p.w) return i; } return -1; }

  function initGame() { genPlatforms(); stickAngle = 0; stickLen = 0; phase = 'idle'; score = 0; timeLeft = MAX_TIME; done = false; deathFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'idle') { phase = 'growing'; stickLen = 0; stickAngle = 0; game.audio.play('se_tap', 0.4); }
    else if (phase === 'growing') { phase = 'falling'; }
  });

  // 世界観: 深い谷。棒を丁度よい長さで倒し橋にして向こう岸へ渡る。
  function background() {
    game.draw.clear('#001100');
    game.draw.rect(0, 0, W, snap(FLOOR_Y), '#000800');
    for (var i = 0; i < 8; i++) { var mx = snap((i * 173 - cameraX * 0.3) % (W + 200) - 100); game.draw.rect(mx, FLOOR_Y - 120, 140, 120, '#002200', 0.6); }
    game.draw.rect(0, snap(FLOOR_Y) + PLATFORM_H, W, H - FLOOR_Y - PLATFORM_H, '#000400');
    txt('CANYON PASS', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i], px = p.x - cameraX;
      if (px + p.w < -100 || px > W + 100) continue;
      game.draw.rect(snap(px), snap(FLOOR_Y), snap(p.w), PLATFORM_H, C.d);
      game.draw.rect(snap(px), snap(FLOOR_Y), snap(p.w), 8, C.a);
    }
    var ci = curPlat();
    if (ci >= 0 && phase !== 'idle') {
      var cp = platforms[ci], bx = cp.x + cp.w - cameraX, by = FLOOR_Y;
      var tipX = bx + Math.sin(stickAngle) * stickLen, tipY = by - Math.cos(stickAngle) * stickLen;
      game.draw.line(bx, by, tipX, tipY, C.e, 12);
      if (phase === 'growing') txt(Math.round(stickLen) + '', bx + 30, by - stickLen / 2, 36, C.e);
    }
    // プレイヤー（ドット絵）
    var dpx = snap(playerX - cameraX);
    game.draw.rect(dpx - PSIZE / 2, snap(FLOOR_Y - PSIZE - 8), PSIZE, PSIZE, C.b);
    game.draw.rect(dpx - 16, snap(FLOOR_Y - PSIZE), 12, 12, '#000800');
    game.draw.rect(dpx + 4, snap(FLOOR_Y - PSIZE), 12, 12, '#000800');
    game.draw.rect(dpx - 12, snap(FLOOR_Y - PSIZE + 24), 24, 8, '#000800');
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.f, deathFlash * 0.4);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!platforms) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 66, C.e);
        txt('TAP TO START', W / 2, H * 0.85, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 40, '#448844');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'growing') { stickLen += GROW_SPEED * dt; if (stickLen > 700) stickLen = 700; }
      else if (phase === 'falling') {
        stickAngle += dt * 4;
        if (stickAngle >= Math.PI / 2) { stickAngle = Math.PI / 2; phase = 'walking'; }
      } else if (phase === 'walking') {
        playerX += WALK_SPEED * dt;
        var ci = curPlat();
        if (ci >= 0) {
          var cp = platforms[ci], np = platforms[ci + 1], tip = cp.x + cp.w + stickLen;
          if (playerX > cp.x + cp.w && (tip < np.x || tip > np.x + np.w)) { phase = 'dead'; deathFlash = 0.5; game.audio.play('se_failure'); }
          else if (playerX > np.x + 20) {
            score++; stickLen = 0; stickAngle = 0; phase = 'idle'; cameraX = np.x - W * 0.25; game.audio.play('se_tap', 0.9);
            if (score >= NEEDED) { finish(true); return; }
          }
        }
      } else if (phase === 'dead') { deathFlash -= dt; if (deathFlash <= 0) { finish(false); return; } }
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('CROSS ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    if (phase === 'idle') txt('TAP TO GROW!', W / 2, H - 90, 44, C.a);
    else if (phase === 'growing') txt('TAP TO DROP!', W / 2, H - 90, 48, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
