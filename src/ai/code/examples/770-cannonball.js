// 770-cannonball.js
// キャノンボール — 大砲の弾道を予測してターゲットに直撃させろ
// 操作: タップで発射（タップX位置で発射角が変わる）
// 成功: 10回 命中  失敗: 3回 外れ or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砲撃） ──
  var C = { bg:'#0a0603', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SKY = '#0a1420', GROUND = '#2d1a0a', GROUND_HI = '#5c3d1e', CANNON = '#3a4a5a', CANNON_HI = '#9caab8', BALL = '#ff8800', BALL_HI = '#ffe600', TARGET = '#00ff41';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CANNONBALL';
  var HOW_TO_PLAY = 'TAP TO FIRE · YOUR TAP X SETS THE LAUNCH ANGLE · HIT THE TARGET';
  var MAX_TIME = 26;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var GROUND_Y = snap(H * 0.76), CANNON_X = snap(W * 0.14), CANNON_Y = GROUND_Y - 44, GRAVITY = 1200, TARGET_R = 60, WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetX, targetY, ball, trajectoryDots, cannonAnim, waitTimer, score, errors, done, timeLeft, elapsed, smoke, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0c0804');
  }

  function background() { game.draw.clear(SKY); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, GROUND, 1.0); game.draw.rect(0, GROUND_Y, W, 14, GROUND_HI, 0.6); }

  function newTarget() { targetX = W * 0.45 + Math.random() * W * 0.45; targetY = GROUND_Y - 80 - Math.random() * (H * 0.32); ball = null; }

  function getLaunchVelocity(aimTapX) {
    var norm = Math.max(0.05, Math.min(0.95, (aimTapX - CANNON_X) / (W - CANNON_X))), angle = 0.35 + (1 - norm) * 1.05, spd = 900 + Math.random() * 80;
    return { vx: Math.cos(angle) * spd, vy: -Math.sin(angle) * spd };
  }

  function fire(tapX) {
    var v = getLaunchVelocity(tapX); ball = { x: CANNON_X, y: CANNON_Y, vx: v.vx, vy: v.vy, done: false }; cannonAnim = 0.4;
    for (var p = 0; p < 6; p++) { var pa = -Math.PI * 0.4 + Math.random() * Math.PI * 0.3; smoke.push({ x: CANNON_X + 60, y: CANNON_Y, vx: Math.cos(pa) * (60 + Math.random() * 80), vy: Math.sin(pa) * 60 - 40, life: 0.6, r: 18 + Math.random() * 18 }); }
    trajectoryDots = []; var px = CANNON_X, py = CANNON_Y, pvx = v.vx, pvy = v.vy;
    for (var ti = 0; ti < 12; ti++) { for (var si = 0; si < 3; si++) { pvy += GRAVITY * 0.1; px += pvx * 0.1; py += pvy * 0.1; } if (py > GROUND_Y) break; trajectoryDots.push({ x: px, y: py }); }
    game.audio.play('se_tap', 0.12);
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; smoke = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; cannonAnim = 0; waitTimer = 0; trajectoryDots = []; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(targetX, targetY, TARGET_R, TARGET, 0.9); pc(targetX, targetY, TARGET_R * 0.6, TARGET, 0.4 + 0.3 * Math.sin(elapsed * 5)); pc(targetX, targetY, TARGET_R * 0.25, C.g, 0.85);
    for (var ti2 = 0; ti2 < trajectoryDots.length; ti2++) { var td = trajectoryDots[ti2]; game.draw.rect(snap(td.x) - 4, snap(td.y) - 4, 8, 8, BALL, Math.max(0.1, 0.5 - ti2 * 0.04)); }
    var recoil = cannonAnim > 0 ? cannonAnim * 16 : 0;
    game.draw.rect(snap(CANNON_X - 52 + recoil), CANNON_Y - 22, 96, 44, CANNON, 0.9); game.draw.rect(snap(CANNON_X - 52 + recoil), CANNON_Y - 22, 96, 10, CANNON_HI, 0.4);
    game.draw.rect(snap(CANNON_X + 16 + recoil), CANNON_Y - 14, 56, 28, CANNON, 0.95);
    pc(CANNON_X - 8, CANNON_Y, 34, CANNON, 0.95); pc(CANNON_X - 32, CANNON_Y + 28, 26, '#1a2530', 0.9); pc(CANNON_X + 16, CANNON_Y + 28, 20, '#1a2530', 0.9);
    if (ball && !ball.done) { pc(ball.x, ball.y, 22, BALL, 0.95); pc(ball.x - 7, ball.y - 7, 7, BALL_HI, 0.6); }
    for (var pp2 = 0; pp2 < smoke.length; pp2++) { var sp = smoke[pp2]; pc(sp.x, sp.y, sp.r * sp.life, '#6b7280', sp.life * 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0 || (ball && !ball.done)) return;
    fire(tx);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.88, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DIRECT HIT!' : 'MISFIRE', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newTarget(); }
      if (ball && !ball.done) {
        ball.vy += GRAVITY * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        var dx = ball.x - targetX, dy = ball.y - targetY;
        if (Math.sqrt(dx * dx + dy * dy) < TARGET_R + 20) {
          ball.done = true; score++; flash = 0.25; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.4; game.audio.play('se_success', 0.7);
          for (var p2 = 0; p2 < 8; p2++) { var pa2 = Math.random() * Math.PI * 2; smoke.push({ x: targetX, y: targetY, vx: Math.cos(pa2) * 180, vy: Math.sin(pa2) * 180 - 100, life: 0.45, r: 14 }); }
          waitTimer = WAIT_DUR; if (score >= NEEDED) { finish(true); return; }
        } else if (ball.y > GROUND_Y + 20) {
          ball.done = true; errors++; flash = 0.3; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.42; game.audio.play('se_failure', 0.28);
          for (var p3 = 0; p3 < 5; p3++) { var pa3 = -Math.PI * 0.8 + Math.random() * Math.PI * 0.6; smoke.push({ x: ball.x, y: GROUND_Y, vx: Math.cos(pa3) * 80, vy: Math.sin(pa3) * 80 - 60, life: 0.5, r: 16 }); }
          waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; }
        } else if (ball.x > W + 60) {
          ball.done = true; errors++; flash = 0.28; flashCol = C.a; resultText = 'OVERSHOT!'; resultTimer = 0.38; game.audio.play('se_failure', 0.22);
          waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; }
        }
      }
      if (cannonAnim > 0) cannonAnim -= dt * 3; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = smoke.length - 1; pp >= 0; pp--) { var sp2 = smoke[pp]; sp2.x += sp2.vx * dt; sp2.y += sp2.vy * dt; sp2.vy += 200 * dt; sp2.life -= dt * 1.8; if (sp2.life <= 0) smoke.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.30), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0c0804');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
