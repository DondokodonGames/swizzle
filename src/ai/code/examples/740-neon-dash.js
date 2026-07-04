// 740-neon-dash.js
// ネオンダッシュ — 迫ってくる障害物をタップジャンプで飛び越え続ける
// 操作: 地上にいるときタップでジャンプ。障害物に当たるとダメージ
// 成功: 10個 クリア  失敗: 3回 衝突 or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ランナー） ──
  var C = { bg:'#020612', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RUNNER = '#00ff9f', RUNNER_HI = '#86efac', OBST = '#ff6600', OBST_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON DASH';
  var HOW_TO_PLAY = 'TAP TO JUMP OVER THE INCOMING OBSTACLES · TIME IT RIGHT';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var GROUND_Y = snap(H * 0.74), RUNNER_X = W * 0.22, RUNNER_W = 52, RUNNER_H = 80, GRAVITY = 1800, JUMP_V = -900, BASE_SPEED = 460;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var runnerY, runnerVy, isGrounded, speedLines, obstacles, spawnTimer, score, hits, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, legPhase, hitAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#020810');
  }

  function background() { game.draw.clear(C.bg); for (var sli3 = 0; sli3 < speedLines.length; sli3++) { var sl = speedLines[sli3]; game.draw.line(sl.x, sl.y, sl.x - sl.len, sl.y, '#0d2240', 0.55); } }

  function spawnObstacle() { obstacles.push({ x: W + 60, h: 72 + Math.random() * 120, scored: false, hit: false }); }

  function initGame() {
    runnerY = GROUND_Y - RUNNER_H; runnerVy = 0; isGrounded = true; obstacles = []; spawnTimer = 1.1; score = 0; hits = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; legPhase = 0; hitAnim = 0;
    speedLines = []; for (var sli = 0; sli < 8; sli++) speedLines.push({ x: Math.random() * W, y: H * 0.08 + Math.random() * (H * 0.58), len: 60 + Math.random() * 90 });
    spawnObstacle();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#1e3a5f', 0.9); game.draw.line(0, GROUND_Y, W, GROUND_Y, C.e, 3);
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) { var ob2 = obstacles[oi2]; game.draw.rect(snap(ob2.x - 28), GROUND_Y - ob2.h, 56, ob2.h, OBST, 0.9); game.draw.rect(snap(ob2.x - 28), GROUND_Y - ob2.h, 56, 12, OBST_HI, 0.5); }
    var shake = hitAnim > 0 ? Math.sin(elapsed * 30) * 12 * hitAnim : 0, rx = RUNNER_X + shake, rcol = hitAnim > 0 ? C.a : RUNNER;
    game.draw.rect(snap(rx - RUNNER_W / 2), runnerY, RUNNER_W, RUNNER_H, rcol, 0.9);
    pc(rx, runnerY - 26, 24, rcol, 0.9); pc(rx - 7, runnerY - 31, 8, RUNNER_HI, 0.45);
    if (isGrounded) { var l1x = rx - 14 + Math.sin(legPhase) * 14, l2x = rx + 14 - Math.sin(legPhase) * 14; game.draw.line(rx - 14, runnerY + RUNNER_H, l1x, runnerY + RUNNER_H + 24, rcol, 9); game.draw.line(rx + 14, runnerY + RUNNER_H, l2x, runnerY + RUNNER_H + 24, rcol, 9); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !isGrounded) return;
    runnerVy = JUMP_V; isGrounded = false; game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 4; p++) { var pa = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5; particles.push({ x: RUNNER_X, y: GROUND_Y, vx: Math.cos(pa) * 110, vy: Math.sin(pa) * 160, life: 0.3, col: RUNNER }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLAWLESS RUN!' : 'WIPED OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      runnerVy += GRAVITY * dt; runnerY += runnerVy * dt;
      if (runnerY >= GROUND_Y - RUNNER_H) { runnerY = GROUND_Y - RUNNER_H; runnerVy = 0; isGrounded = true; }
      if (isGrounded) legPhase += dt * 9; if (hitAnim > 0) hitAnim -= dt * 3;
      var spd = Math.min(900, BASE_SPEED + score * 18);
      for (var sli2 = 0; sli2 < speedLines.length; sli2++) { speedLines[sli2].x -= spd * dt * 0.28; if (speedLines[sli2].x < -speedLines[sli2].len) { speedLines[sli2].x = W + 60; speedLines[sli2].y = H * 0.08 + Math.random() * (H * 0.58); } }
      spawnTimer -= dt; var rate = Math.max(0.65, 1.1 - score * 0.025); if (spawnTimer <= 0) { spawnTimer = rate; spawnObstacle(); }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var ob = obstacles[oi]; ob.x -= spd * dt;
        if (!ob.scored && !ob.hit && ob.x + 30 < RUNNER_X - RUNNER_W / 2) {
          ob.scored = true; score++; flash = 0.18; flashCol = C.b; resultText = 'CLEAR!'; resultTimer = 0.32; game.audio.play('se_tap', 0.07);
          if (score >= NEEDED) { finish(true); return; }
        }
        var oL = ob.x - 28, oR = ob.x + 28, oT = GROUND_Y - ob.h, rL = RUNNER_X - RUNNER_W / 2 + 6, rR = RUNNER_X + RUNNER_W / 2 - 6, rB = runnerY + RUNNER_H - 4;
        if (!ob.scored && !ob.hit && rR > oL && rL < oR && rB > oT) {
          ob.hit = true; ob.scored = true; hits++; flash = 0.5; flashCol = C.a; resultText = 'CRASH!'; resultTimer = 0.5; hitAnim = 0.4; game.audio.play('se_failure', 0.4); runnerVy = JUMP_V * 0.55; isGrounded = false;
          for (var pe = 0; pe < 7; pe++) { var pea = Math.random() * Math.PI * 2; particles.push({ x: RUNNER_X, y: runnerY + RUNNER_H / 2, vx: Math.cos(pea) * 220, vy: Math.sin(pea) * 220, life: 0.45, col: C.a }); }
          if (hits >= MAX_HITS) { finish(false); return; }
        }
        if (ob.x < -100) obstacles.splice(oi, 1);
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.18), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#020810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
