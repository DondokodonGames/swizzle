// 684-relay.js
// バトンリレー — 二人のランナーが交差する瞬間にタップでバトンを渡す
// 操作: 二人が重なるゾーンでタップしてバトンタッチ。早すぎ・遅すぎは失敗
// 成功: 6回 バトンパス  失敗: 3回 ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、トラック） ──
  var C = { bg:'#040a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RUNNER1 = '#00ff41', RUNNER2 = '#00cfff', BATON = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RELAY';
  var HOW_TO_PLAY = 'TAP WHEN THE RUNNERS OVERLAP TO PASS THE BATON · NOT TOO EARLY';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var TRACK_Y = snap(H * 0.46), BATON_ZONE = 120, R = 52;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var r1X, r2X, speed, running, passed, missed, waitTimer, successes, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 8; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.5); else if (dir === 'left') game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.5); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#031003');
  }

  function background() { game.draw.clear(C.bg); }

  function checkPass() { return Math.abs(r1X - r2X) <= BATON_ZONE; }

  function newRound() { r1X = -R; r2X = W + R; speed = 380 + successes * 30; passed = false; missed = false; running = true; waitTimer = 0; }

  function initGame() { successes = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 600 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, TRACK_Y - 90, W, 180, '#0a1a0a', 0.9);
    game.draw.line(0, TRACK_Y - 90, W, TRACK_Y - 90, '#00ff4118', 3);
    game.draw.line(0, TRACK_Y + 90, W, TRACK_Y + 90, '#00ff4118', 3);
    for (var li = 1; li < 8; li++) game.draw.line(li * W / 8, TRACK_Y - 90, li * W / 8, TRACK_Y + 90, '#00ff4108', 2);

    if (running) {
      var zx = (r1X + r2X) / 2, inZone = checkPass();
      game.draw.rect(zx - BATON_ZONE / 2, TRACK_Y - 80, BATON_ZONE, 160, inZone ? C.b : '#ffffff22', inZone ? 0.2 : 0.08);
      if (inZone && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('NOW!', zx, TRACK_Y - 108, 48, C.b);
    }

    // Runner 1 (has baton, goes right)
    if (r1X > -R * 2 && r1X < W + R * 2) {
      pc(r1X, TRACK_Y, R, RUNNER1, 0.9); pc(r1X - R * 0.3, TRACK_Y - R * 0.3, R * 0.22, '#86efac', 0.5);
      if (!passed) { game.draw.line(r1X + R * 0.4, TRACK_Y - R * 0.6, r1X + R + 25, TRACK_Y - R * 0.3, BATON, 12); pc(r1X + R + 25, TRACK_Y - R * 0.3, 14, BATON, 0.9); }
      txt('1', r1X, TRACK_Y + 14, 44, C.g);
    }
    // Runner 2 (receives baton, goes left)
    if (r2X > -R * 2 && r2X < W + R * 2) {
      pc(r2X, TRACK_Y, R, RUNNER2, 0.9); pc(r2X - R * 0.3, TRACK_Y - R * 0.3, R * 0.22, '#93c5fd', 0.5);
      if (passed) { game.draw.line(r2X - R * 0.4, TRACK_Y - R * 0.6, r2X - R - 25, TRACK_Y - R * 0.3, BATON, 12); pc(r2X - R - 25, TRACK_Y - R * 0.3, 14, BATON, 0.9); }
      txt('2', r2X, TRACK_Y + 14, 44, C.g);
    }
    arrow(W * 0.1, TRACK_Y - 150, 48, 'right', RUNNER1);
    arrow(W * 0.9, TRACK_Y - 150, 48, 'left', RUNNER2);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !running || passed || missed) return;
    if (checkPass()) {
      passed = true; running = false; successes++; flash = 0.35; flashCol = C.b; resultText = 'BATON PASS!'; resultTimer = 0.6; game.audio.play('se_success', 0.7);
      var px = (r1X + r2X) / 2;
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: px, y: TRACK_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: BATON }); }
      if (successes >= NEEDED) { finish(true); return; }
      waitTimer = 0.9;
    } else {
      errors++; flash = 0.35; flashCol = C.a; resultText = 'OFF TIMING!'; resultTimer = 0.6; game.audio.play('se_failure', 0.45);
      missed = true; running = false;
      if (errors >= MAX_ERR) { finish(false); return; }
      waitTimer = 0.9;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (r1X === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOLD MEDAL!' : 'DROPPED BATON', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
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
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (running) {
        r1X += speed * dt; r2X -= speed * dt;
        if (r1X > r2X && !passed && !missed) {
          missed = true; running = false; errors++; flash = 0.4; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.6; game.audio.play('se_failure', 0.45);
          if (errors >= MAX_ERR) { finish(false); return; }
          waitTimer = 0.9;
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 54, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#031003');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
