// 792-chain-reaction.js
// チェーンリアクション — 1タップで最大の連鎖爆発を引き起こせ
// 操作: タップ — 爆発を起こし、隣接する玉を巻き込む（2連鎖以上を作れ）
// 成功: 8回 連鎖達成  失敗: 3回 連鎖なし or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆発） ──
  var C = { bg:'#050204', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL = '#ff2079', BALL_HI = '#ff9ec4', CHAIN1 = '#ff6600', CHAIN2 = '#ffe600', CHAIN3 = '#00ff41';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP ONE ORB TO DETONATE IT · THE BLAST CHAINS TO NEARBY ORBS · GO BIG';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var BALL_R = 46, EXPLODE_R = 118, CHAIN_DELAY = 0.12, WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, explosions, pending, chainCount, chainActive, chainTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, waitTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#080408');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBalls() {
    balls = []; var count = Math.min(14, 6 + Math.floor(score / 2)), attempts = 0;
    while (balls.length < count && attempts < 200) {
      attempts++;
      var bx = BALL_R * 1.5 + Math.random() * (W - BALL_R * 3), by = H * 0.22 + Math.random() * (H * 0.58), ok = true;
      for (var i = 0; i < balls.length; i++) { var dx = bx - balls[i].x, dy = by - balls[i].y; if (Math.sqrt(dx * dx + dy * dy) < BALL_R * 2.5) { ok = false; break; } }
      if (ok) balls.push({ x: snap(bx), y: snap(by), alive: true });
    }
    chainCount = 0; chainActive = false;
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; explosions = []; pending = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; spawnBalls(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 150) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function explodeBall(idx) {
    var b = balls[idx]; if (!b || !b.alive) return;
    b.alive = false; chainCount++; explosions.push({ x: b.x, y: b.y, r: 0, maxR: EXPLODE_R, life: 1.0 });
    var col2 = chainCount === 1 ? CHAIN1 : (chainCount <= 3 ? CHAIN2 : CHAIN3);
    for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * (150 + Math.random() * 150), vy: Math.sin(pa) * (150 + Math.random() * 150), life: 0.45, col: col2 }); }
    for (var i = 0; i < balls.length; i++) { if (!balls[i].alive) continue; var dx = balls[i].x - b.x, dy = balls[i].y - b.y; if (Math.sqrt(dx * dx + dy * dy) < EXPLODE_R + BALL_R) pending.push(i); }
  }

  function drawScene() {
    for (var ex = 0; ex < explosions.length; ex++) { var exp = explosions[ex]; ring(exp.x, exp.y, exp.r, CHAIN1, exp.life * 0.8); pc(exp.x, exp.y, exp.r * 0.5, CHAIN2, exp.life * 0.1); }
    for (var bi = 0; bi < balls.length; bi++) { if (!balls[bi].alive) continue; var b2 = balls[bi]; pc(b2.x, b2.y, BALL_R, BALL, 0.9); pc(b2.x - BALL_R * 0.3, b2.y - BALL_R * 0.3, BALL_R * 0.25, BALL_HI, 0.5); if (!chainActive) pc(b2.x, b2.y, EXPLODE_R, BALL, 0.04); }
    if (state === S.PLAYING) {
      if (chainActive && chainCount > 0) { var cCol = chainCount >= 5 ? CHAIN3 : (chainCount >= 3 ? CHAIN2 : CHAIN1); txt(chainCount + ' CHAIN!', W / 2, snap(H * 0.90), 56, cCol); }
      else if (!chainActive && waitTimer <= 0) txt('TAP AN ORB', W / 2, snap(H * 0.90), 40, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || chainActive || waitTimer > 0) return;
    var hitIdx = -1, bestDist = Infinity;
    for (var i = 0; i < balls.length; i++) { if (!balls[i].alive) continue; var dx = tx - balls[i].x, dy = ty - balls[i].y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < BALL_R + 20 && dist < bestDist) { bestDist = dist; hitIdx = i; } }
    if (hitIdx < 0) return;
    game.audio.play('se_tap', 0.08); chainActive = true; chainTimer = 0; pending = [hitIdx];
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN MASTER!' : 'NO REACTION', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) spawnBalls(); }
      if (chainActive) {
        chainTimer -= dt;
        if (chainTimer <= 0 && pending.length > 0) { explodeBall(pending.shift()); chainTimer = CHAIN_DELAY; }
        else if (pending.length === 0 && chainTimer <= 0) {
          chainActive = false; var reached = chainCount;
          if (reached >= 2) { score++; flash = 0.22; flashCol = C.b; resultText = reached + ' CHAIN!'; resultTimer = 0.42; game.audio.play('se_success', 0.7); if (score >= NEEDED) { finish(true); return; } }
          else { errors++; flash = 0.3; flashCol = C.a; resultText = 'NO CHAIN...'; resultTimer = 0.42; game.audio.play('se_failure', 0.3); if (errors >= MAX_ERR) { finish(false); return; } }
          waitTimer = WAIT_DUR;
        }
      }
      for (var ei = explosions.length - 1; ei >= 0; ei--) { var e = explosions[ei]; e.r += 400 * dt; e.life = 1 - e.r / e.maxR; if (e.life <= 0) explosions.splice(ei, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0 && !chainActive) txt(resultText, W / 2, snap(H * 0.30), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei2 = 0; ei2 < MAX_ERR; ei2++) game.draw.rect(snap(W / 2 + (ei2 - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei2 < errors ? C.a : '#080408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
