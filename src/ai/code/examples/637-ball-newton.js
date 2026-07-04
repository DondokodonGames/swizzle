// 637-ball-newton.js
// ボールニュートン — 左右に揺れる2つの振り子を、玉が中央でぶつかる瞬間にタップで止める
// 操作: タップで近い方の玉を止める。2つとも中央の衝突ゾーンで止められれば成功
// 成功: 8回 完璧な衝突  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、振り子装置） ──
  var C = { bg:'#060810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALL NEWTON';
  var HOW_TO_PLAY = 'TAP TO STOP THE NEARER BALL · FREEZE BOTH IN THE CENTER ZONE TO SCORE';
  var MAX_TIME = 22;
  var NEEDED     = 8;        // 修正2: 15 → 8
  var MAX_MISSES = 3;        // 修正2: 10 → 3
  var PIVOT_Y = snap(H * 0.22), ARM_LEN = 500, BALL_R = 60, MAX_ANGLE = Math.PI / 2.5, SPEED_BASE = 1.8;
  var LEFT_PX = W * 0.28, RIGHT_PX = W * 0.72;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var leftAngle, leftVel, rightAngle, rightVel, leftStopped, rightStopped, correct, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, roundActive, roundTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0e18');
  }

  function background() { game.draw.clear(C.bg); }

  function ballPos(pivotX, angle) { return { x: pivotX + Math.sin(angle) * ARM_LEN, y: PIVOT_Y + Math.cos(angle) * ARM_LEN }; }

  function collision() { var lp = ballPos(LEFT_PX, leftAngle), rp = ballPos(RIGHT_PX, rightAngle); return Math.abs(rp.x - lp.x) < BALL_R * 2.2; }

  function resetRound() { leftAngle = -MAX_ANGLE; leftVel = SPEED_BASE * (0.9 + Math.random() * 0.3); rightAngle = MAX_ANGLE; rightVel = -SPEED_BASE * (0.9 + Math.random() * 0.3); leftStopped = false; rightStopped = false; roundActive = true; roundTimer = 0; }

  function initGame() { correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; resetRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 80) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(W * 0.1, PIVOT_Y - 16, W * 0.8, 16, '#475569', 0.8);
    pc(LEFT_PX, PIVOT_Y, 16, '#475569', 0.9); pc(RIGHT_PX, PIVOT_Y, 16, '#475569', 0.9);
    var midY = PIVOT_Y + ARM_LEN, near = collision();
    ring(W / 2, midY, BALL_R * 1.8, near ? C.b : '#334155', near ? 0.7 : 0.4);
    var lp = ballPos(LEFT_PX, leftAngle);
    game.draw.line(LEFT_PX, PIVOT_Y, lp.x, lp.y, '#334155', 4); pc(lp.x, lp.y, BALL_R, leftStopped ? C.a : C.e, 0.9); pc(lp.x - 18, lp.y - 18, BALL_R * 0.3, C.g, 0.5);
    var rp = ballPos(RIGHT_PX, rightAngle);
    game.draw.line(RIGHT_PX, PIVOT_Y, rp.x, rp.y, '#334155', 4); pc(rp.x, rp.y, BALL_R, rightStopped ? C.a : C.e, 0.9); pc(rp.x - 18, rp.y - 18, BALL_R * 0.3, C.g, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !roundActive) return;
    var lp = ballPos(LEFT_PX, leftAngle), rp = ballPos(RIGHT_PX, rightAngle);
    var dl = Math.sqrt((tx - lp.x) * (tx - lp.x) + (ty - lp.y) * (ty - lp.y)), dr = Math.sqrt((tx - rp.x) * (tx - rp.x) + (ty - rp.y) * (ty - rp.y));
    if (dl < dr && !leftStopped) { leftStopped = true; leftVel = 0; } else if (!rightStopped) { rightStopped = true; rightVel = 0; }
    if (leftStopped && rightStopped) {
      if (collision()) {
        correct++; flash = 0.3; flashCol = C.c; resultText = 'PERFECT!'; resultTimer = 0.6; game.audio.play('se_success', 0.6);
        var mx = (lp.x + rp.x) / 2, my = (lp.y + rp.y) / 2;
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: mx, y: my, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.5, col: C.b }); }
        if (correct >= NEEDED) { finish(true); return; }
      } else {
        misses++; flash = 0.3; flashCol = C.a; resultText = 'MISSED'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISSES) { finish(false); return; }
      }
      roundActive = false; roundTimer = 0.8;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (leftAngle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PRECISE!' : 'OFF TIMING', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (!roundActive) { roundTimer -= dt; if (roundTimer <= 0) resetRound(); }
      if (roundActive) {
        if (!leftStopped) { leftVel += -leftAngle * 3 * dt; leftAngle += leftVel * dt; }
        if (!rightStopped) { rightVel += -rightAngle * 3 * dt; rightAngle += rightVel * dt; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 68, flashCol);
    else if (roundActive && !leftStopped && !rightStopped) txt('TAP TO STOP', W / 2, snap(H * 0.86), 42, '#ffffff66');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISSES; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISSES - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0e18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
