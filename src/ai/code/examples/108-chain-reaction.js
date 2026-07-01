// 108-chain-reaction.js
// チェーンリアクション — 1つの爆発が連鎖して球体を巻き込む一掃の爽快感
// 操作: タップで爆発を起こす（連鎖で球を巻き込む）
// 成功: 3個以上を連鎖爆破  失敗: 3回チャレンジ失敗 or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP TO START A CHAIN BLAST';
  var MAX_TIME = 30;
  var NUM_BALLS = 14;
  var TARGET_CHAIN = 3;     // 修正2: 20 → 3
  var BALL_COLORS = [C.e, C.f, C.d, C.b, C.a, C.g];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var balls, attempts, timeLeft, done, phase, resultTimer, resultOk, particles, totalExploded;

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

  function initBalls() {
    balls = [];
    for (var i = 0; i < NUM_BALLS; i++) {
      var r = 32 + Math.random() * 32, spd = 40 + Math.random() * 80, ang = Math.random() * Math.PI * 2;
      balls.push({ x: r + Math.random() * (W - r * 2), y: H * 0.22 + Math.random() * (H * 0.5), vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: r, color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)], exploding: false, exploded: false, explodeR: 0, explodeMax: 0 });
    }
    totalExploded = 0; phase = 'ready';
  }
  function initGame() { attempts = 3; timeLeft = MAX_TIME; done = false; resultTimer = 0; resultOk = false; particles = []; initBalls(); }

  function triggerExplosion(b) {
    if (b.exploding || b.exploded) return;
    b.exploding = true; b.explodeR = b.r; b.explodeMax = b.r * 4; totalExploded++;
    for (var p = 0; p < 8; p++) { var ang = Math.random() * Math.PI * 2, spd = 120 + Math.random() * 200; particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.5, color: b.color }); }
    game.audio.play('se_tap', 0.5);
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (totalExploded * 60 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, 1000);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'ready') return;
    for (var i = 0; i < balls.length; i++) { var b = balls[i]; if (b.exploded || b.exploding) continue; if (Math.sqrt((tx - b.x) * (tx - b.x) + (ty - b.y) * (ty - b.y)) < b.r + 16) { triggerExplosion(b); phase = 'exploding'; return; } }
    phase = 'exploding';
    for (var j = 0; j < balls.length; j++) { var b2 = balls[j]; if (b2.exploded || b2.exploding) continue; if (Math.sqrt((tx - b2.x) * (tx - b2.x) + (ty - b2.y) * (ty - b2.y)) < b2.r + 70) triggerExplosion(b2); }
  });

  // 世界観: 爆発連鎖チャンバー。1つの爆発が周囲の球を巻き込み連鎖する。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < 20; i++) { var sx = snap((i * 149) % W), sy = snap((i * 211) % H); game.draw.rect(sx, sy, 6, 6, C.c, 0.12); }
    txt('BLAST CHAMBER', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var bi = 0; bi < balls.length; bi++) {
      var b = balls[bi]; if (b.exploded) continue;
      if (b.exploding) { var ef = b.explodeR / b.explodeMax; drawPixelCircle(b.x, b.y, b.explodeR, b.color, (1 - ef) * 0.6); }
      else { drawPixelCircle(b.x, b.y, b.r, b.color, 1); game.draw.rect(snap(b.x) - b.r * 0.3, snap(b.y) - b.r * 0.3, 10, 10, C.g, 0.4); }
    }
    for (var pp = 0; pp < particles.length; pp++) { var p = particles[pp]; game.draw.rect(snap(p.x) - 6, snap(p.y) - 6, 12, 12, p.color, p.life * 2); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 72, C.d);
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
      txt(resultSuccess ? 'CHAIN CLEAR!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i]; if (b.exploded) continue;
        if (!b.exploding) {
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y - b.r < H * 0.18) { b.y = H * 0.18 + b.r; b.vy = Math.abs(b.vy); } if (b.y + b.r > H * 0.86) { b.y = H * 0.86 - b.r; b.vy = -Math.abs(b.vy); }
        } else {
          b.explodeR += (b.explodeMax - b.r) * 3 * dt;
          for (var j = 0; j < balls.length; j++) { if (i === j || balls[j].exploded || balls[j].exploding) continue; if (Math.sqrt((b.x - balls[j].x) * (b.x - balls[j].x) + (b.y - balls[j].y) * (b.y - balls[j].y)) < b.explodeR + balls[j].r) triggerExplosion(balls[j]); }
          if (b.explodeR >= b.explodeMax) { b.exploding = false; b.exploded = true; }
        }
      }
      for (var pi = 0; pi < particles.length; pi++) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; }
      particles = particles.filter(function(p) { return p.life > 0; });
      if (phase === 'exploding' && !balls.some(function(b) { return b.exploding; })) {
        resultOk = totalExploded >= TARGET_CHAIN;
        if (resultOk) { finish(true); return; }
        attempts--; game.audio.play('se_failure', 0.6);
        if (attempts <= 0) { finish(false); return; }
        phase = 'result'; resultTimer = 1.0;
      }
      if (phase === 'result') { resultTimer -= dt; if (resultTimer <= 0) initBalls(); }
    }

    // ---- draw ----
    background();
    drawScene();
    if (phase === 'exploding' || phase === 'result') txt(totalExploded + ' / ' + TARGET_CHAIN, W / 2, H * 0.5, 88, totalExploded >= TARGET_CHAIN ? C.f : C.c);
    if (phase === 'result') txt('CHAIN SHORT! ' + attempts + ' LEFT', W / 2, H * 0.62, 48, C.e);
    timeBar();
    txt('BLAST ' + TARGET_CHAIN + '+ BALLS', W / 2, 96, 44, C.c);
    for (var a = 0; a < 3; a++) game.draw.rect(W / 2 + (a - 1) * 64 - 20, 150, 40, 40, a < attempts ? C.d : '#332200');
    if (phase === 'ready') txt('TAP A BALL!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
