// 104-orbit-catch.js
// 軌道キャッチ — 円軌道を回るキャッチャーで落下する隕石を受け止める
// 操作: タップで周回方向を時計回り/反時計回りに切り替える
// 成功: 2個キャッチ  失敗: 3個落とす or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP TO REVERSE ORBIT DIRECTION';
  var MAX_TIME = 30;
  var NEEDED = 2;           // 修正2: 15 → 2
  var MAX_DROP = 3;         // 修正2: 5 → 3
  var CX = W / 2, CY = H * 0.46, ORBIT_R = 260, ARC = 0.32, CATCHER_W = 28, CATCH_SPEED = 2.2;
  var SPAWN_INTERVAL = 1.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var catcherAngle, catcherDir, meteors, spawnTimer, score, drops, timeLeft, done, catchFlash, dropFlash, bgStars;

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

  function spawnMeteor() { meteors.push({ angle: Math.random() * Math.PI * 2, r: ORBIT_R + 180 + Math.random() * 100, fall: 90 + score * 10 }); }
  function initGame() {
    catcherAngle = 0; catcherDir = 1; meteors = []; spawnTimer = 0.6; score = 0; drops = 0; timeLeft = MAX_TIME; done = false; catchFlash = 0; dropFlash = 0;
    bgStars = []; for (var i = 0; i < 40; i++) bgStars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), ph: Math.floor(Math.random() * 4) });
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    catcherDir = -catcherDir; game.audio.play('se_tap', 0.3);
  });

  // 世界観: 宇宙ステーション。軌道上のキャッチャーで降ってくる隕石を回収する。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < bgStars.length; i++) { var b = bgStars[i], a = Math.floor(game.time.elapsed * 2 + b.ph) % 2 === 0 ? 0.6 : 0.2; game.draw.rect(b.x, b.y, 8, 8, C.c, a); }
    if (dropFlash > 0) game.draw.rect(0, 0, W, H, C.e, dropFlash * 0.3);
    txt('SPACE STATION', W / 2, 250, 34, C.b);
  }

  function drawCatcher(color, wid) {
    var steps = 14;
    for (var s = 0; s < steps; s++) {
      var a1 = catcherAngle - ARC + (s / steps) * (2 * ARC), a2 = catcherAngle - ARC + ((s + 1) / steps) * (2 * ARC);
      game.draw.line(CX + Math.cos(a1) * ORBIT_R, CY + Math.sin(a1) * ORBIT_R, CX + Math.cos(a2) * ORBIT_R, CY + Math.sin(a2) * ORBIT_R, color, wid);
    }
  }

  function drawScene() {
    drawPixelCircle(CX, CY, ORBIT_R, C.a, 0.05);
    for (var mi = 0; mi < meteors.length; mi++) { var m = meteors[mi], mx = CX + Math.cos(m.angle) * m.r, my = CY + Math.sin(m.angle) * m.r; drawPixelCircle(mx, my, 22, C.f, 1); drawPixelCircle(mx, my, 10, C.d, 1); }
    drawCatcher(C.b, CATCHER_W);
    if (catchFlash > 0) drawCatcher(C.g, CATCHER_W + catchFlash * 30);
    drawPixelCircle(CX, CY, 40, '#001133', 1); txt(catcherDir > 0 ? 'CW' : 'CCW', CX, CY, 34, C.b);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!meteors) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
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
      catcherAngle += catcherDir * CATCH_SPEED * dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = Math.max(0.7, SPAWN_INTERVAL - score * 0.1); spawnMeteor(); }
      for (var i = meteors.length - 1; i >= 0; i--) {
        var m = meteors[i]; m.r -= m.fall * dt;
        if (m.r <= ORBIT_R) {
          var ma = ((m.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), ca = ((catcherAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), diff = Math.abs(ma - ca);
          diff = Math.min(diff, Math.PI * 2 - diff);
          if (diff < ARC) { score++; catchFlash = 0.25; game.audio.play('se_tap', 0.9); if (score >= NEEDED) { finish(true); return; } }
          else { drops++; dropFlash = 0.2; game.audio.play('se_failure', 0.5); if (drops >= MAX_DROP) { finish(false); return; } }
          meteors.splice(i, 1);
        }
      }
      if (catchFlash > 0) catchFlash -= dt;
      if (dropFlash > 0) dropFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('CAUGHT ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var d = 0; d < MAX_DROP; d++) game.draw.rect(W / 2 + (d - 1) * 64 - 20, 150, 40, 40, d < drops ? C.e : '#000833');
    txt('TAP TO REVERSE!', W / 2, H - 90, 42, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
