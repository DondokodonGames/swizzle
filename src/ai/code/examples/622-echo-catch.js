// 622-echo-catch.js
// エコーキャッチ — 音波の反響から見えない的の位置を推定し、タップで撃ち当てる
// 操作: タップで音波発射 → 反響が返る位置を見て、的がいると思う場所をタップ
// 成功: 6的 命中  失敗: 3回 外れ or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、ソナー室） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECHO CATCH';
  var HOW_TO_PLAY = 'TAP TO PING · WATCH WHERE THE ECHO RETURNS · TAP THE HIDDEN TARGET';
  var MAX_TIME = 22;
  var NEEDED   = 6;          // 修正2: 12 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var SRC_X = W / 2, SRC_Y = snap(H * 0.88);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, echoes, hits, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, pulseTimer, showTarget, showTargetTimer, guessMode;
  var PULSE_INTERVAL = 2.0;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); for (var sl = 0; sl < H; sl += H / 20) game.draw.rect(0, snap(sl), W, 1, C.d, 0.12); }

  function spawnTarget() { target = { x: 120 + Math.random() * (W - 240), y: snap(H * 0.16) + Math.random() * (H * 0.58), r: 44, phase: Math.random() * Math.PI * 2 }; echoes = []; showTarget = false; guessMode = false; pulseTimer = 0; }

  function shootEcho() {
    var dist = Math.sqrt((target.x - SRC_X) * (target.x - SRC_X) + (target.y - SRC_Y) * (target.y - SRC_Y)), tt = dist / 500;
    echoes.push({ x: SRC_X, y: SRC_Y, vx: (target.x - SRC_X) / dist * 500, vy: (target.y - SRC_Y) / dist * 500, r: 10, life: tt + 0.6, travelTime: tt, echoDone: false, echoR: 10, echoX: 0, echoY: 0 });
    game.audio.play('se_tap', 0.2);
  }

  function initGame() { hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; showTarget = false; showTargetTimer = 0; guessMode = false; spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 700 + Math.ceil(timeLeft) * 100) : hits * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ei = 0; ei < echoes.length; ei++) {
      var e = echoes[ei], al = e.life / (e.travelTime + 0.6);
      if (!e.echoDone) ring(e.x, e.y, e.r, C.e, al * 0.7);
      else { var ea = Math.max(0, e.life / 0.6); ring(e.echoX, e.echoY, e.echoR, C.f, ea * 0.6); pc(e.echoX, e.echoY, Math.min(e.echoR, 24), C.c, ea * 0.5); }
    }
    ring(SRC_X, SRC_Y, 24, C.e, 0.7); pc(SRC_X, SRC_Y, 12, C.g, 0.8);
    if (showTarget && target) { pc(target.x, target.y, target.r, C.a, 0.85); pc(target.x - 12, target.y - 12, target.r * 0.3, C.g, 0.5); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!guessMode) { shootEcho(); guessMode = true; game.audio.play('se_tap', 0.25); return; }
    var dx = tx - target.x, dy = ty - target.y, r = target.r + 30;
    if (dx * dx + dy * dy < r * r) {
      hits++; showTarget = true; showTargetTimer = 0.8; flash = 0.3; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.8; game.audio.play('se_success', 0.8);
      for (var p = 0; p < 12; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: target.x, y: target.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); }
      if (hits >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) spawnTarget(); }, 900);
    } else {
      misses++; flash = 0.25; flashCol = C.a; resultText = 'MISS'; resultTimer = 0.6; game.audio.play('se_failure', 0.3); showTarget = true; showTargetTimer = 0.4;
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (!done) spawnTarget(); }, 900);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.68, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.72, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SONAR ACE!' : 'LOST SIGNAL', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (showTargetTimer > 0) { showTargetTimer -= dt; if (showTargetTimer <= 0) showTarget = false; }
      if (target) target.phase += dt * 2;
      if (!guessMode) { pulseTimer += dt; if (pulseTimer > PULSE_INTERVAL) { pulseTimer = 0; shootEcho(); } }
      for (var ei = echoes.length - 1; ei >= 0; ei--) {
        var e = echoes[ei]; e.life -= dt;
        if (!e.echoDone) { e.x += e.vx * dt; e.y += e.vy * dt; e.r = 10 + (1 - e.life / (e.travelTime + 0.6)) * 70; if (e.life <= 0.6) { e.echoDone = true; e.echoX = target.x + (Math.random() - 0.5) * 20; e.echoY = target.y + (Math.random() - 0.5) * 20; } }
        else e.echoR += dt * 150;
        if (e.life <= 0) echoes.splice(ei, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 56, flashCol);
    else if (guessMode) txt('TAP THE HIDDEN TARGET', W / 2, snap(H * 0.80), 36, C.f);
    else txt('TAP TO PING', W / 2, snap(H * 0.80), 36, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
