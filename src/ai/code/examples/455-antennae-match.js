// 455-antennae-match.js
// アンテナ合わせ — 電波塔と同じ角度に自分のアンテナを回して電波を受信する
// 操作: 画面の左半分/右半分タップでアンテナを左右に回転。角度が合ったら保持
// 成功: 4回 受信  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、深夜の電波塔） ──
  var C = { bg:'#000814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ANTENNA MATCH';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO ROTATE · HOLD THE MATCHING ANGLE';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var STA_X = snap(W * 0.24), PL_X = snap(W * 0.76), BASE_Y = snap(H * 0.60), ALEN = 220, ROT = 2.2, TOL = 0.16, HOLD = 0.7;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stationAngle, playerAngle, targetAngle, turning, matchTimer, waves, received, misses, timeLeft, done, particles, flash, flashCol, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#081428');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 2 + si) * 0.3); }

  function initStars() { stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H * 0.5), r: Math.random() < 0.5 ? 4 : 8 }); }

  function newSignal() { targetAngle = (Math.random() - 0.5) * Math.PI * 0.8; stationAngle = targetAngle; matchTimer = 0; waves = [{ r: 10, alpha: 0.8 }, { r: 50, alpha: 0.5 }]; }

  function initGame() { playerAngle = 0; turning = 0; received = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; newSignal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (received * 600 + Math.ceil(timeLeft) * 100) : received * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tower(x, angle, matched, ratio) {
    game.draw.rect(x - 16, BASE_Y - 120, 32, 120, C.d, 0.9); game.draw.rect(x - 22, BASE_Y - 20, 44, 30, C.e, 0.5);
    var tx = x + Math.sin(angle) * ALEN, ty = (BASE_Y - 120) - Math.cos(angle) * ALEN;
    pline(x, BASE_Y - 120, tx, ty, matched ? C.b : '#90a0b0', 0.9, 8); pc(tx, ty, 14, matched ? C.b : C.e, 0.9);
    if (matched && ratio !== undefined) ring(x, BASE_Y - 120, ratio * 90, C.b, 0.4);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    turning = x < W / 2 ? -1 : 1; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); tower(STA_X, stationAngle, false); tower(PL_X, playerAngle, false);
      txt(GAME_TITLE, W / 2, H * 0.72, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.78, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SIGNAL LOCKED!' : 'LOST SIGNAL', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var diff = Math.abs(playerAngle - targetAngle), matched = diff < TOL;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      playerAngle += turning * ROT * dt; turning *= 0.85;
      if (playerAngle > Math.PI / 2) playerAngle = Math.PI / 2; if (playerAngle < -Math.PI / 2) playerAngle = -Math.PI / 2;
      for (var wi = waves.length - 1; wi >= 0; wi--) { waves[wi].r += 200 * dt; waves[wi].alpha -= dt * 0.8; if (waves[wi].alpha <= 0) waves.splice(wi, 1); }
      if (waves.length === 0) waves.push({ r: 10, alpha: 0.8 });
      diff = Math.abs(playerAngle - targetAngle); matched = diff < TOL;
      if (matched) {
        matchTimer += dt;
        if (matchTimer >= HOLD) {
          received++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PL_X, y: BASE_Y - 120, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.e }); }
          if (received >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (!done) newSignal(); }, 700);
        }
      } else {
        if (matchTimer > 0.45) { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
        matchTimer = 0;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var wi2 = 0; wi2 < waves.length; wi2++) ring(STA_X, BASE_Y - 120, waves[wi2].r, C.e, Math.max(0, waves[wi2].alpha));
    tower(STA_X, stationAngle, false); tower(PL_X, playerAngle, matched, matchTimer / HOLD);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    // シグナル強度バー
    var sr = Math.max(0, 1 - diff / 0.6);
    game.draw.rect(snap(W * 0.32), snap(H * 0.80), snap(W * 0.36), 28, '#081428', 0.7); game.draw.rect(snap(W * 0.32), snap(H * 0.80), snap(W * 0.36 * sr), 28, matched ? C.b : C.e, 0.9);
    txt('SIGNAL', W / 2, snap(H * 0.80) + 60, 34, matched ? C.b : C.e);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(received + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#081428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
