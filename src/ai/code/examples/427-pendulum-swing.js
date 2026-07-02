// 427-pendulum-swing.js
// 振り子飛び越え — 大きく揺れる鉄球が近づく瞬間、タップでジャンプして飛び越える
// 操作: 鉄球が来るタイミングでタップしてジャンプ（当たると被弾）
// 成功: 4回 飛び越える  失敗: 3回 衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、危険地帯） ──
  var C = { bg:'#0a0518', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENDULUM SWING';
  var HOW_TO_PLAY = 'TAP TO JUMP OVER THE SWINGING WRECKING BALL';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_MISS = 3;
  var PIVOT_X = snap(W / 2), PIVOT_Y = snap(H * 0.22), ROPE = 420, GROUND_Y = snap(H * 0.72), RUNNER_Y = snap(H * 0.72) - 40, RUNNER_X = snap(W / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pendAngle, pendOmega, jumping, jumpVY, jumpY, jumped, successes, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#1a1430', 0.9); game.draw.rect(0, GROUND_Y, W, 4, C.d, 0.6); }

  function ballPos() { return { x: PIVOT_X + Math.sin(pendAngle) * ROPE, y: PIVOT_Y + Math.cos(pendAngle) * ROPE }; }

  function initGame() { pendAngle = -Math.PI * 0.55; pendOmega = 2.8; jumping = false; jumpVY = 0; jumpY = RUNNER_Y; jumped = false; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 500 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var ball = ballPos();
    pline(PIVOT_X, 0, PIVOT_X, PIVOT_Y, '#3a3050', 0.6, 30); pc(PIVOT_X, PIVOT_Y, 20, C.g, 0.9);
    pline(PIVOT_X, PIVOT_Y, ball.x, ball.y, '#8a7a5a', 0.8, 8); pc(ball.x, ball.y, 44, C.a, 0.9); pc(ball.x - 14, ball.y - 16, 14, C.f, 0.5);
    var ry = jumpY;
    pc(RUNNER_X, ry - 70, 26, C.b, 0.9); pc(RUNNER_X - 8, ry - 78, 10, C.g, 0.5); game.draw.rect(snap(RUNNER_X - 22), snap(ry - 44), 44, 44, C.b, 0.8);
    if (!jumping) { pline(RUNNER_X - 12, ry, RUNNER_X - 12, ry - 20, C.b, 0.9, 8); pline(RUNNER_X + 12, ry, RUNNER_X + 12, ry - 20, C.b, 0.9, 8); }
    else { pline(RUNNER_X - 16, ry - 6, RUNNER_X - 22, ry - 24, C.b, 0.9, 8); pline(RUNNER_X + 16, ry - 6, RUNNER_X + 22, ry - 24, C.b, 0.9, 8); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || jumping) return; jumping = true; jumpVY = -900; jumpY = RUNNER_Y; jumped = false; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      pendAngle += pendOmega === undefined ? 0 : 0; if (pendOmega === undefined) initGame();
      pendOmega += (-5.0 * Math.sin(pendAngle)) * dt; pendOmega *= (1 - dt * 0.01); pendAngle += pendOmega * dt;
      background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.82, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.88, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.98, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NICE HOPS!' : 'SMASHED', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      var sf = 1 + Math.min(1.2, (MAX_TIME - timeLeft) * 0.04);
      pendOmega += (-5.0 * sf * Math.sin(pendAngle)) * dt; pendOmega *= (1 - dt * 0.01); pendAngle += pendOmega * dt;
      var ball = ballPos();
      if (jumping) { jumpVY += 2200 * dt; jumpY += jumpVY * dt; if (jumpY >= RUNNER_Y) { jumpY = RUNNER_Y; jumping = false; jumpVY = 0; } }
      var bdx = ball.x - RUNNER_X, bdy = ball.y - (jumpY - 40), coll = Math.hypot(bdx, bdy) < 44 + 30;
      if (coll) { misses++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: RUNNER_X, y: jumpY - 40, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.7, col: C.b }); } jumping = false; jumpY = RUNNER_Y; jumpVY = 0; jumped = false; if (misses >= MAX_MISS) { finish(false); return; } }
      if (jumping && !jumped && Math.abs(ball.x - RUNNER_X) < 60 && jumpY < RUNNER_Y - 60) jumped = true;
      if (!jumping && jumped && !coll) { successes++; jumped = false; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.5); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: RUNNER_X, y: RUNNER_Y - 40, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150 - 80, life: 0.5, col: C.c }); } if (successes >= NEEDED) { finish(true); return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
