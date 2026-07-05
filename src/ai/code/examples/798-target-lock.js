// 798-target-lock.js
// ターゲットロック — 軌道を回るロックマーカーが的に重なった瞬間にタップせよ
// 操作: タップ — ロックマーカーが的の中心に重なった瞬間
// 成功: 10回 ロックオン  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、照準） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TARGET = '#ff2079', TARGET_HI = '#ff9ec4', LOCK = '#00ff41', RING = '#00cfff', GRID = '#0a1520';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TARGET LOCK';
  var HOW_TO_PLAY = 'TAP THE MOMENT THE ORBITING RETICLE LINES UP OVER THE MOVING TARGET';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H / 2), TARGET_R = 42, AMP_X = W * 0.3, AMP_Y = H * 0.28, FREQ_X = 0.8, FREQ_Y = 1.2, LOCK_ORBIT_R = 160, LOCK_R = 46, LOCK_TOL = 58, WAIT_DUR = 0.35;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetX, targetY, targetA, lockAngle, lockSpeed, lockX, lockY, onTarget, answered, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, lockAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040608');
  }

  function background() { game.draw.clear(C.bg); for (var gi = 0; gi <= 8; gi++) { game.draw.line(gi * W / 8, 0, gi * W / 8, H, GRID, 2); game.draw.line(0, gi * H / 8, W, gi * H / 8, GRID, 2); } }

  function initGame() { targetX = CX; targetY = CY; targetA = 0; lockAngle = 0; lockSpeed = 1.5; lockX = CX; lockY = CY; onTarget = false; answered = false; waitTimer = 0; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lockAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 130) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < 36; oi++) { var oa = oi * Math.PI * 2 / 36; game.draw.rect(snap(CX + Math.cos(oa) * LOCK_ORBIT_R) - 3, snap(CY + Math.sin(oa) * LOCK_ORBIT_R * 0.65) - 3, 6, 6, RING, 0.25); }
    pc(targetX, targetY, TARGET_R, TARGET, 0.9); pc(targetX, targetY, TARGET_R * 0.55, TARGET_HI, 0.5); pc(targetX, targetY, TARGET_R * 0.2, C.g, 0.8);
    game.draw.line(targetX - TARGET_R * 1.5, targetY, targetX - TARGET_R * 0.8, targetY, TARGET, 2); game.draw.line(targetX + TARGET_R * 0.8, targetY, targetX + TARGET_R * 1.5, targetY, TARGET, 2);
    game.draw.line(targetX, targetY - TARGET_R * 1.5, targetX, targetY - TARGET_R * 0.8, TARGET, 2); game.draw.line(targetX, targetY + TARGET_R * 0.8, targetX, targetY + TARGET_R * 1.5, TARGET, 2);
    var lockCol = onTarget ? LOCK : RING;
    if (onTarget) pc(lockX, lockY, LOCK_R + 20 + lockAnim * 30, lockCol, 0.2);
    var lR = LOCK_R, bLen = lR * 0.4;
    game.draw.line(lockX - lR, lockY - lR, lockX - lR + bLen, lockY - lR, lockCol, 4); game.draw.line(lockX - lR, lockY - lR, lockX - lR, lockY - lR + bLen, lockCol, 4);
    game.draw.line(lockX + lR - bLen, lockY - lR, lockX + lR, lockY - lR, lockCol, 4); game.draw.line(lockX + lR, lockY - lR, lockX + lR, lockY - lR + bLen, lockCol, 4);
    game.draw.line(lockX - lR, lockY + lR - bLen, lockX - lR, lockY + lR, lockCol, 4); game.draw.line(lockX - lR, lockY + lR, lockX - lR + bLen, lockY + lR, lockCol, 4);
    game.draw.line(lockX + lR - bLen, lockY + lR, lockX + lR, lockY + lR, lockCol, 4); game.draw.line(lockX + lR, lockY + lR - bLen, lockX + lR, lockY + lR, lockCol, 4);
    pc(lockX, lockY, 8, lockCol, onTarget ? 0.9 : 0.5);
    if (state === S.PLAYING && onTarget && !answered) { var pulse = 1 + 0.1 * Math.sin(elapsed * 20); txt('LOCK ON!', W / 2, snap(H * 0.16), Math.floor(60 * pulse), LOCK); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0 || answered) return;
    var dx = lockX - targetX, dy = lockY - targetY, locked = Math.sqrt(dx * dx + dy * dy) < LOCK_TOL;
    answered = true;
    if (locked) {
      score++; lockAnim = 0.5; flash = 0.2; flashCol = C.b; resultText = 'LOCKED!'; resultTimer = 0.38; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: targetX, y: targetY, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: LOCK }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.28; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.38; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.88, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TARGET NEUTRALIZED!' : 'LOCK FAILED', W / 2, H * 0.35, 48, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) answered = false; }
      var speed = 1 + Math.min(1.5, score * 0.08); targetA += dt * speed;
      targetX = CX + Math.sin(targetA * FREQ_X) * AMP_X; targetY = CY + Math.sin(targetA * FREQ_Y) * AMP_Y;
      lockSpeed = Math.min(4.5, 1.5 + score * 0.15); lockAngle += lockSpeed * dt;
      lockX = CX + Math.cos(lockAngle) * LOCK_ORBIT_R; lockY = CY + Math.sin(lockAngle) * LOCK_ORBIT_R * 0.65;
      var dx = lockX - targetX, dy = lockY - targetY; onTarget = Math.sqrt(dx * dx + dy * dy) < LOCK_TOL;
      if (lockAnim > 0) lockAnim -= dt * 2.5; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.83), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#040608');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
