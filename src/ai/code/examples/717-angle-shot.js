// 717-angle-shot.js
// アングルショット — 左右に振れる砲台が目標を向いた瞬間にタップして撃つ
// 操作: 砲身の角度が目標と一致した瞬間タップで発射。誤差が小さいほど命中
// 成功: 8発 命中  失敗: 3発 外す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砲台） ──
  var C = { bg:'#030910', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CANNON = '#334155', CANNON_HI = '#64748b', SHELL = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ANGLE SHOT';
  var HOW_TO_PLAY = 'THE BARREL SWINGS BACK AND FORTH · TAP WHEN IT AIMS AT THE TARGET';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 15 → 3
  var CX = W / 2, CY = snap(H * 0.8), CANNON_LEN = 100, ANGLE_TOLERANCE = 12, TARGET_R = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cannonAngle, rotSpeed, rotDir, targetAngle, targetX, targetY, shells, hits, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, targetDisplay;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050c14');
  }

  function background() { game.draw.clear(C.bg); }

  function pickTarget() {
    var deg = -60 + Math.random() * 120;
    targetAngle = deg * Math.PI / 180 - Math.PI / 2;
    targetX = Math.max(80, Math.min(W - 80, CX + Math.sin(deg * Math.PI / 180) * 400));
    targetY = Math.max(160, Math.min(H * 0.6, snap(H * 0.8) - Math.cos(deg * Math.PI / 180) * 500));
    targetDisplay = 0;
  }

  function getAngleDiff() { var a = cannonAngle % (Math.PI * 2), b = targetAngle % (Math.PI * 2), diff = Math.abs(a - b); if (diff > Math.PI) diff = Math.PI * 2 - diff; return diff * 180 / Math.PI; }

  function initGame() { cannonAngle = -Math.PI / 2; rotSpeed = 1.5; rotDir = 1; shells = []; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; targetDisplay = 0; pickTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var aimX = CX + Math.cos(cannonAngle) * CANNON_LEN, aimY = CY + Math.sin(cannonAngle) * CANNON_LEN;
    for (var ai = 1; ai <= 10; ai++) { var t2 = ai * 0.05; pc(aimX + Math.cos(cannonAngle) * 900 * t2, aimY + Math.sin(cannonAngle) * 900 * t2, 6, C.e, (1 - ai / 12) * 0.25); }
    var pulse = 0.85 + 0.15 * Math.sin(targetDisplay * 3), diff2 = getAngleDiff(), closeness = Math.max(0, 1 - diff2 / 30);
    pc(targetX, targetY, TARGET_R * pulse, C.b, 0.8);
    game.draw.line(targetX - TARGET_R, targetY, targetX + TARGET_R, targetY, C.g, 3); game.draw.line(targetX, targetY - TARGET_R, targetX, targetY + TARGET_R, C.g, 3);
    if (closeness > 0.3) ring(targetX, targetY, TARGET_R + 20, C.b, closeness * 0.4);
    for (var si2 = 0; si2 < shells.length; si2++) { var s = shells[si2]; pc(s.x, s.y, 16 * s.life, s.hit ? C.b : SHELL, s.life); }
    pc(CX, CY, 50, CANNON, 0.9);
    game.draw.line(CX, CY, CX + Math.cos(cannonAngle) * CANNON_LEN, CY + Math.sin(cannonAngle) * CANNON_LEN, CANNON, 28);
    game.draw.line(CX, CY, CX + Math.cos(cannonAngle) * CANNON_LEN, CY + Math.sin(cannonAngle) * CANNON_LEN, CANNON_HI, 10);
    var diffCol = diff2 < 15 ? C.b : (diff2 < 30 ? C.c : C.a);
    txt(Math.round(diff2) + '°', W * 0.15, CY - 60, 56, diffCol);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var diff = getAngleDiff(), tol = Math.max(5, ANGLE_TOLERANCE - hits * 0.4);
    var vx = Math.cos(cannonAngle) * 900, vy = Math.sin(cannonAngle) * 900;
    game.audio.play('se_tap', 0.12);
    if (diff <= tol) {
      hits++; shells.push({ x: CX + Math.cos(cannonAngle) * CANNON_LEN, y: CY + Math.sin(cannonAngle) * CANNON_LEN, vx: vx, vy: vy, life: 0.8, hit: true }); flash = 0.3; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: targetX, y: targetY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.b }); }
      pickTarget(); rotSpeed = Math.min(3.5, 1.5 + hits * 0.15);
      if (hits >= NEEDED) { finish(true); return; }
    } else {
      misses++; shells.push({ x: CX + Math.cos(cannonAngle) * CANNON_LEN, y: CY + Math.sin(cannonAngle) * CANNON_LEN, vx: vx, vy: vy, life: 0.6, hit: false }); flash = 0.25; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cannonAngle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BULLSEYE!' : 'WILD SHOTS', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; targetDisplay += dt;
      cannonAngle += rotSpeed * rotDir * dt;
      var minA = -Math.PI * 0.95, maxA = -Math.PI * 0.05;
      if (cannonAngle > maxA) { cannonAngle = maxA; rotDir = -1; } if (cannonAngle < minA) { cannonAngle = minA; rotDir = 1; }
      for (var si = shells.length - 1; si >= 0; si--) { shells[si].x += shells[si].vx * dt; shells[si].y += shells[si].vy * dt; shells[si].life -= dt * 1.5; if (shells[si].life <= 0) shells.splice(si, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.89), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#050c14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
