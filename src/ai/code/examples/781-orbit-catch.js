// 781-orbit-catch.js
// オービットキャッチ — 軌道上を回るボールを、ゲートを開けて正確な瞬間にキャッチせよ
// 操作: タップした位置にゲートが移動し、一瞬開く。ボール通過に合わせろ
// 成功: 12回 キャッチ  失敗: 3回 逃す or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、軌道） ──
  var C = { bg:'#03080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ORBIT = '#0a3a5a', BALL = '#00cfff', BALL_HI = '#c0f0ff', GATE = '#00ff41', GATE_OFF = '#1e2b45', CATCH = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP TO MOVE THE GATE AND OPEN IT · TIME IT AS THE BALL PASSES THROUGH';
  var MAX_TIME = 24;
  var NEEDED   = 12;         // 修正2: 35 → 12
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.45), ORBIT_R = 280, GATE_SIZE = 0.20, GATE_DUR = 0.24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballAngle, ballSpeed, gateAngle, gateOpen, gateTimer, score, missed, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, catchAnim, lastInGate;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050a12');
  }

  function background() { game.draw.clear(C.bg); }

  function drawScene() {
    for (var oi = 0; oi < 60; oi++) {
      var oa = oi * Math.PI * 2 / 60, angleDiffG = oa - gateAngle;
      while (angleDiffG > Math.PI) angleDiffG -= Math.PI * 2; while (angleDiffG < -Math.PI) angleDiffG += Math.PI * 2;
      var isGate = Math.abs(angleDiffG) < GATE_SIZE, col = isGate ? (gateOpen ? GATE : GATE_OFF) : ORBIT;
      game.draw.rect(snap(CX + Math.cos(oa) * ORBIT_R) - (isGate ? 5 : 3), snap(CY + Math.sin(oa) * ORBIT_R) - (isGate ? 5 : 3), isGate ? 10 : 6, isGate ? 10 : 6, col, isGate ? 0.9 : 0.4);
    }
    pc(CX, CY, 22, ORBIT, 0.6); pc(CX, CY, 12, BALL, 0.3);
    if (gateOpen) pc(CX + Math.cos(gateAngle) * ORBIT_R, CY + Math.sin(gateAngle) * ORBIT_R, 26 + catchAnim * 18, GATE, 0.15 + catchAnim * 0.3);
    var bx = CX + Math.cos(ballAngle) * ORBIT_R, by = CY + Math.sin(ballAngle) * ORBIT_R;
    for (var ti = 1; ti <= 5; ti++) { var ta = ballAngle - ti * ballSpeed * 0.025; pc(CX + Math.cos(ta) * ORBIT_R, CY + Math.sin(ta) * ORBIT_R, 10 - ti * 1.5, BALL, 0.3 - ti * 0.05); }
    pc(bx, by, 22, BALL, 0.95); pc(bx - 6, by - 6, 7, BALL_HI, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    gateAngle = Math.atan2(ty - CY, tx - CX); gateOpen = true; gateTimer = GATE_DUR; game.audio.play('se_tap', 0.07);
  });

  function initGame() { ballAngle = 0; ballSpeed = 1.8; gateAngle = Math.PI; gateOpen = false; gateTimer = 0; score = 0; missed = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; catchAnim = 0; lastInGate = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 140) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballAngle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.88, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT CATCH!' : 'SLIPPED AWAY', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      if (gateTimer > 0) { gateTimer -= dt; if (gateTimer <= 0) gateOpen = false; }
      ballSpeed = Math.min(4.5, 1.8 + score * 0.09); ballAngle += ballSpeed * dt; if (ballAngle > Math.PI * 2) ballAngle -= Math.PI * 2;
      var angleDiff = ballAngle - gateAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      var inGateZone = Math.abs(angleDiff) < GATE_SIZE;
      if (inGateZone && !lastInGate) {
        if (gateOpen) {
          score++; catchAnim = 0.5; flash = 0.2; flashCol = C.b; resultText = 'CATCH!'; resultTimer = 0.38; game.audio.play('se_success', 0.6);
          var bx = CX + Math.cos(ballAngle) * ORBIT_R, by = CY + Math.sin(ballAngle) * ORBIT_R;
          for (var p = 0; p < 7; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(pa) * (120 + Math.random() * 120), vy: Math.sin(pa) * (120 + Math.random() * 120), life: 0.4, col: CATCH }); }
          if (score >= NEEDED) { finish(true); return; }
        } else {
          missed++; flash = 0.28; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
          if (missed >= MAX_MISS) { finish(false); return; }
        }
      }
      lastInGate = inGateZone;
      if (catchAnim > 0) catchAnim -= dt * 3; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 6, snap(p3.y) - 6, 12, 12, p3.col, p3.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.78), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#050a12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
