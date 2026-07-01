// 114-pendulum-swing.js
// 振り子の弧 — 完璧なタイミングで手を離して的の足場に飛び込む空中ブランコ
// 操作: タップで手を離してジャンプ
// 成功: 1回的に着地  失敗: 3回外す or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PENDULUM SWING';
  var HOW_TO_PLAY = 'TAP TO RELEASE AND LAND';
  var MAX_TIME = 40;
  var NEEDED = 1;           // 修正2: 8 → 1
  var MAX_MISS = 3;         // 修正2: 5 → 3
  var PIVOT_X = W / 2, PIVOT_Y = H * 0.14, ROPE_L = 480, TARGET_R = 90, PERSON_R = 32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var angle, angVel, swinging, released, projX, projY, projVX, projVY, target, score, misses, timeLeft, done, feedback, feedbackOk;

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

  function placeTarget() { var side = Math.random() > 0.5 ? 1 : -1; target = { x: W / 2 + side * (200 + Math.random() * 200), y: H * 0.6 + Math.random() * H * 0.15, r: TARGET_R }; }
  function resetSwing() { if (state !== S.PLAYING || done) return; angle = (Math.random() > 0.5 ? -1 : 1) * (Math.PI / 4 + Math.random() * Math.PI / 6); angVel = 0; swinging = true; released = false; }
  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; placeTarget(); angle = -Math.PI / 3; angVel = 0; swinging = true; released = false; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, 600);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !swinging) return;
    swinging = false; released = true;
    projX = PIVOT_X + Math.sin(angle) * ROPE_L; projY = PIVOT_Y + Math.cos(angle) * ROPE_L;
    projVX = angVel * ROPE_L * Math.cos(angle); projVY = angVel * ROPE_L * -Math.sin(angle);
    game.audio.play('se_tap', 0.7);
  });

  // 世界観: 空中ブランコのサーカス。振り子の勢いで的の足場へ飛び移る。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(0, snap(H * 0.9), W, H * 0.1, '#221040');
    txt('TRAPEZE SHOW', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    var lit = Math.floor(game.time.elapsed * 4) % 2 === 0;
    drawPixelCircle(target.x, target.y, target.r, C.b, lit ? 0.4 : 0.25);
    drawPixelCircle(target.x, target.y, target.r * 0.5, C.b, 0.8);
    if (swinging) {
      var sx = PIVOT_X + Math.sin(angle) * ROPE_L, sy = PIVOT_Y + Math.cos(angle) * ROPE_L;
      game.draw.line(PIVOT_X, PIVOT_Y, sx, sy, '#556', 6);
      drawPixelCircle(PIVOT_X, PIVOT_Y, 18, C.d, 1);
      drawPixelCircle(sx, sy, PERSON_R, C.f, 1);
      game.draw.rect(snap(sx) - 10, snap(sy) - 10, 8, 8, C.g); game.draw.rect(snap(sx) + 4, snap(sy) - 10, 8, 8, C.g);
    }
    if (released) { drawPixelCircle(projX, projY, PERSON_R, C.f, 1); game.draw.rect(snap(projX) - 10, snap(projY) - 10, 8, 8, C.g); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame();
      background();
      angle = 0.6 * Math.sin(game.time.elapsed * 1.5);
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.3, 72, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.355, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT LANDING!' : 'GAME OVER', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (swinging) { angVel += -(9.8 / (ROPE_L / 100)) * Math.sin(angle) * dt * 3; angVel *= 0.999; angle += angVel * dt; }
      if (released) {
        projVY += 1600 * dt; projX += projVX * dt; projY += projVY * dt;
        if (Math.sqrt((projX - target.x) * (projX - target.x) + (projY - target.y) * (projY - target.y)) < TARGET_R + PERSON_R) {
          score++; feedbackOk = true; feedback = 0.5; game.audio.play('se_success'); released = false;
          if (score >= NEEDED) { finish(true); return; } placeTarget(); setTimeout(resetSwing, 600); return;
        }
        if (projY > H + 100 || projX < -100 || projX > W + 100) {
          misses++; feedbackOk = false; feedback = 0.5; game.audio.play('se_failure'); released = false;
          if (misses >= MAX_MISS) { finish(false); return; } setTimeout(resetSwing, 600);
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'LANDED!' : 'MISSED!', W / 2, H * 0.28, 80, feedbackOk ? C.b : C.a);
    timeBar();
    txt('LAND ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    if (swinging) txt('TAP TO RELEASE!', W / 2, H - 90, 44, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
