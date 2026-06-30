// 026-squeeze-time.js
// スクイーズタイム — ホールドで時間を遅くして絶妙なタイミングを作る
// 操作: 長押しで「スローモーション」、離すと通常速度に戻る
// 成功: 落下するボールをスロー中に的へ1回落とす  失敗: 3回外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'SQUEEZE TIME';
  var HOW_TO_PLAY = 'HOLD = SLOW / RELEASE = NORMAL';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  var BALL_R = 56, SLOW_FACTOR = 0.15;
  var TARGET_Y = H * 0.78;   // 修正1: 的は下3分の1

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var ball, target, targetVx, isSlow, score, misses, timeLeft, done, feedback, feedbackOk, particles;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function resetBall() { ball = { x: snap(game.random(150, W - 150)), y: -80, vy: 500 + score * 30, alive: true }; }
  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; isSlow = false; feedback = 0; feedbackOk = false; particles = [];
    target = { x: W / 2 - 110, w: 220, h: 36 }; targetVx = 340;
    resetBall();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function landMiss() {
    misses++; feedbackOk = false; feedback = 0.4;
    game.audio.play('se_failure', 0.5);
    if (misses >= MAX_MISS) finish(false); else if (!done) setTimeout(resetBall, 500);
  }

  game.onHold(function(x, y) { if (state === S.PLAYING && !done) isSlow = true; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    isSlow = false;  // PLAYING: 離す＝通常速度
  });

  function background() { game.draw.clear(isSlow ? '#0a0018' : C.bg); }

  function drawScene() {
    if (isSlow && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('SLOW', W * 0.84, H * 0.5, 48, C.d);
    game.draw.rect(snap(target.x), snap(TARGET_Y), target.w, target.h, C.b);
    game.draw.rect(snap(target.x), snap(TARGET_Y), target.w, 8, C.g, 0.6);
    if (ball.alive) {
      var stretch = 1 + Math.abs(ball.vy) / 3000, bH = snap(BALL_R * 2 * stretch);
      var bx = snap(ball.x - BALL_R), by = snap(ball.y - BALL_R * stretch);
      game.draw.rect(bx, by, BALL_R * 2, bH, C.f);                    // 本体
      game.draw.rect(bx + 12, by + 12, BALL_R - 8, 16, C.g, 0.5);     // ツヤ
      game.draw.rect(bx + 24, snap(ball.y) - 8, 14, 14, '#000000');   // 左目
      game.draw.rect(bx + BALL_R + 8, snap(ball.y) - 8, 14, 14, '#000000'); // 右目
    }
    for (var pp = 0; pp < particles.length; pp++) {
      var par = particles[pp];
      game.draw.rect(snap(par.x) - 8, snap(par.y) - 8, 16, 16, par.color, par.life / 0.5);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame();
      background();
      ball.y = TARGET_Y - 200 + Math.sin(game.time.elapsed * 3) * 150; ball.vy = 0; ball.alive = true;
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.58, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.66, 42, '#888888');
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
      var mul = isSlow ? SLOW_FACTOR : 1.0;
      target.x += targetVx * mul * dt;
      if (target.x + target.w > W - 40) { target.x = W - 40 - target.w; targetVx = -Math.abs(targetVx); }
      if (target.x < 40) { target.x = 40; targetVx = Math.abs(targetVx); }
      if (ball.alive) {
        ball.vy += 900 * mul * dt; ball.y += ball.vy * mul * dt;
        if (ball.y + BALL_R >= TARGET_Y) {
          ball.alive = false;
          if (ball.x > target.x && ball.x < target.x + target.w) {
            score++; feedbackOk = true; feedback = 0.4;
            for (var k = 0; k < 8; k++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: ball.x, y: TARGET_Y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5, color: C.b }); }
            game.audio.play('se_tap', 0.9);
            if (score >= NEEDED) finish(true); else if (!done) setTimeout(resetBall, 500);
          } else landMiss();
        } else if (ball.y > H + 100) { ball.alive = false; landMiss(); }
      }
      for (var i = particles.length - 1; i >= 0; i--) { var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) { if (feedbackOk) txt('NICE!', W / 2, TARGET_Y - 140, 80, C.b); else txt('MISS!', W / 2, H * 0.5, 76, C.a); }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt('HOLD TO SLOW!', W / 2, H - 120, 48, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
