// 768-freeze-moment.js
// フリーズモーメント — 3つの円が中央ゾーンにすべて重なる瞬間にタップせよ
// 操作: タップ — 3つの円がすべて中央に集まった瞬間
// 成功: 10回 成功  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、円は保持） ──
  var C = { bg:'#030708', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ORB1 = '#ff3355', ORB2 = '#00cfff', ORB3 = '#00ff41', TARGET = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREEZE MOMENT';
  var HOW_TO_PLAY = 'TAP THE INSTANT ALL THREE ORBS OVERLAP INSIDE THE CENTER ZONE';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var WAIT_DUR = 0.45;
  var CX = W / 2, CY = snap(H * 0.44), ORBIT_R = 220, CIRCLE_R = 76, TOL = 78;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var circles, answered, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#07080e');
  }

  function background() { game.draw.clear(C.bg); }

  function getPos(c) { return { x: CX + Math.cos(c.angle) * c.orbitR, y: CY + Math.sin(c.angle) * c.orbitR }; }

  function allAligned() { for (var i = 0; i < circles.length; i++) { var p = getPos(circles[i]), dx = p.x - CX, dy = p.y - CY; if (Math.sqrt(dx * dx + dy * dy) > TOL) return false; } return true; }

  function initGame() {
    circles = [{ angle: 0, speed: 0.9, color: ORB1, orbitR: ORBIT_R }, { angle: Math.PI * 2 / 3, speed: -1.2, color: ORB2, orbitR: ORBIT_R * 0.85 }, { angle: Math.PI * 4 / 3, speed: 1.5, color: ORB3, orbitR: ORBIT_R * 0.7 }];
    answered = false; waitTimer = 0; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var aligned = allAligned();
    for (var ci = 0; ci < circles.length; ci++) ring(CX, CY, circles[ci].orbitR, circles[ci].color, 0.12);
    if (aligned) pc(CX, CY, TOL, TARGET, (0.14 + 0.14 * Math.sin(elapsed * 12)));
    ring(CX, CY, TOL, TARGET, aligned ? 0.9 : 0.35);
    pc(CX, CY, 12, C.g, 0.5);
    for (var ci4 = 0; ci4 < circles.length; ci4++) {
      var pos = getPos(circles[ci4]), dx = pos.x - CX, dy = pos.y - CY, nearCenter = Math.sqrt(dx * dx + dy * dy) < TOL;
      if (nearCenter) pc(pos.x, pos.y, CIRCLE_R + 16, circles[ci4].color, 0.3);
      pc(pos.x, pos.y, CIRCLE_R, circles[ci4].color, aligned ? 0.95 : 0.7); pc(pos.x - CIRCLE_R * 0.3, pos.y - CIRCLE_R * 0.3, CIRCLE_R * 0.22, C.g, 0.35);
    }
    if (state === S.PLAYING) { if (aligned && !answered) txt('NOW! TAP!', W / 2, snap(H * 0.78), 72, TARGET); else if (!answered) txt('WAIT FOR THE OVERLAP', W / 2, snap(H * 0.78), 36, C.g); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    answered = true;
    if (allAligned()) {
      score++; flash = 0.25; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.42; game.audio.play('se_success', 0.7);
      for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * (80 + Math.random() * 180), vy: Math.sin(pa) * (80 + Math.random() * 180), life: 0.45, col: [ORB1, ORB2, ORB3][p % 3] }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'NOT ALIGNED!'; resultTimer = 0.45; game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!circles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT TIMING!' : 'OUT OF SYNC', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) { answered = false; for (var ci = 0; ci < circles.length; ci++) { circles[ci].speed *= (1 + score * 0.005); circles[ci].speed = Math.min(Math.abs(circles[ci].speed), 3.2) * (circles[ci].speed > 0 ? 1 : -1); } } }
      for (var ci2 = 0; ci2 < circles.length; ci2++) circles[ci2].angle += circles[ci2].speed * dt;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.4; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 6, snap(p2.y) - 6, 12, 12, p2.col, p2.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.85), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#07080e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
