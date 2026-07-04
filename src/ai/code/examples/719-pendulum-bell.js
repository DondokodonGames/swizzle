// 719-pendulum-bell.js
// ペンデュラムベル — 揺れる振り子が端の光るゾーンに来た瞬間にタップして鐘を鳴らす
// 操作: 振り子が左右どちらかのゾーンにいるときタップ。成功ごとに速くなる
// 成功: 10回 命中  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鐘楼） ──
  var C = { bg:'#050312', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BOB = '#7700ff', BOB_HI = '#c4b5fd';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENDULUM BELL';
  var HOW_TO_PLAY = 'TAP WHEN THE BOB REACHES A GLOWING EDGE ZONE · RING THE BELL';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var PIVOT_X = W / 2, PIVOT_Y = 240, LENGTH = 520, BOB_R = 44, MAX_ANGLE = 0.9, ZONE_THRESH = 0.16, GRAVITY = 2.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var theta, omega, speedMult, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, bellFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 14) * (r - 14)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#070520');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { theta = MAX_ANGLE; omega = 0; speedMult = 1.0; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; bellFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var bobX = PIVOT_X + Math.sin(theta) * LENGTH, bobY = PIVOT_Y + Math.cos(theta) * LENGTH, inZone = Math.abs(theta) > (MAX_ANGLE - ZONE_THRESH);
    var lzX = PIVOT_X - Math.sin(MAX_ANGLE) * LENGTH, lzY = PIVOT_Y + Math.cos(MAX_ANGLE) * LENGTH, rzX = PIVOT_X + Math.sin(MAX_ANGLE) * LENGTH;
    var lOn = inZone && theta < 0, rOn = inZone && theta > 0;
    ring(lzX, lzY, BOB_R + 28, C.b, lOn ? 0.5 : 0.15); ring(rzX, lzY, BOB_R + 28, C.b, rOn ? 0.5 : 0.15);
    game.draw.line(PIVOT_X, PIVOT_Y, bobX, bobY, '#94a3b8', 5);
    pc(PIVOT_X, PIVOT_Y, 18, '#334155', 0.9);
    if (bellFlash > 0) ring(bobX, bobY, BOB_R + 36, BOB_HI, bellFlash * 0.5);
    pc(bobX, bobY, BOB_R, inZone ? BOB_HI : BOB, 0.92); pc(bobX - BOB_R * 0.28, bobY - BOB_R * 0.32, BOB_R * 0.18, C.g, 0.3);
    if (speedMult > 1.08) txt('x' + speedMult.toFixed(1), W / 2, snap(H * 0.80), 36, C.c);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var inZone = Math.abs(theta) > (MAX_ANGLE - ZONE_THRESH);
    if (inZone) {
      score++; bellFlash = 0.5; flash = 0.3; flashCol = C.b; resultText = 'BELL!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
      var bx = PIVOT_X + Math.sin(theta) * LENGTH, by = PIVOT_Y + Math.cos(theta) * LENGTH;
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: BOB_HI }); }
      speedMult = Math.min(2.2, 1.0 + score * 0.1);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'TOO EARLY!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (theta === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.86, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.90, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.95, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BELL RINGER!' : 'MISTIMED', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      var dtP = dt * speedMult;
      omega += -GRAVITY * Math.sin(theta) * dtP; theta += omega * dtP;
      if (theta > MAX_ANGLE) { theta = MAX_ANGLE; omega = -Math.abs(omega); } if (theta < -MAX_ANGLE) { theta = -MAX_ANGLE; omega = Math.abs(omega); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (bellFlash > 0) bellFlash -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#070520');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
