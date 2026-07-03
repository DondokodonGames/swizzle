// 459-number-sprint.js
// 数字スプリント — 散らばった数字を1から順番に素早くタップして全消し
// 操作: 1→2→3…と順にタップ（時間切れになると1回ミス）
// 成功: 2列 完走  失敗: 3回 時間切れ or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、反射神経テスト） ──
  var C = { bg:'#000818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER SPRINT';
  var HOW_TO_PLAY = 'TAP THE NUMBERS 1 TO 9 IN ORDER · BEAT THE CLOCK';
  var MAX_TIME = 25;
  var N = 9;                 // 修正2: 25 → 9
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_FAIL = 3;
  var ROUND_LIMIT = 8, NUM_R = 76;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var positions, cleared, nextNum, roundTime, particles, rounds, failures, timeLeft, done, flash, flashCol, bestTime;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#04142a');
  }

  function background() { game.draw.clear(C.bg); }

  function scramble() {
    positions = []; cleared = [];
    var margin = NUM_R + 20;
    for (var i = 0; i < N; i++) {
      var tries = 0, x, y, ok;
      do { x = margin + Math.random() * (W - margin * 2); y = 300 + margin + Math.random() * (H * 0.66 - margin * 2); ok = true; for (var j = 0; j < positions.length; j++) if (Math.hypot(x - positions[j].x, y - positions[j].y) < NUM_R * 2.2) { ok = false; break; } tries++; } while (!ok && tries < 40);
      positions.push({ x: snap(x), y: snap(y) }); cleared.push(false);
    }
    nextNum = 1; roundTime = 0;
  }

  function initGame() { particles = []; rounds = 0; failures = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; bestTime = 999; scramble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 700 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawNumbers() {
    for (var i = 0; i < N; i++) {
      var p = positions[i];
      if (cleared[i]) { pc(p.x, p.y, NUM_R * 0.7, '#0d3020', 0.4); txt((i + 1) + '', p.x, p.y + 18, 40, '#2a5040'); continue; }
      var isNext = (i + 1 === nextNum);
      var pulse = isNext && Math.floor(game.time.elapsed * 8) % 2 === 0 ? 1.12 : 1.0;
      pc(p.x, p.y, NUM_R * pulse, isNext ? C.f : C.e, 0.9); pc(p.x - NUM_R * 0.3, p.y - NUM_R * 0.3, NUM_R * 0.2, C.g, 0.3);
      txt((i + 1) + '', p.x, p.y + 20, 56, isNext ? C.c : C.bg);
      if (isNext) ring(p.x, p.y, NUM_R + 10, C.c, 0.6);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < N; i++) {
      if (cleared[i]) continue;
      if (Math.hypot(tx - positions[i].x, ty - positions[i].y) < NUM_R + 12) {
        if (i + 1 === nextNum) {
          cleared[i] = true; nextNum++; game.audio.play('se_tap', 0.3);
          for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: positions[i].x, y: positions[i].y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); }
          if (nextNum > N) {
            rounds++; if (roundTime < bestTime) bestTime = roundTime; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7);
            for (var pi2 = 0; pi2 < 16; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a2) * 220, vy: Math.sin(a2) * 220, life: 0.7, col: C.c }); }
            if (rounds >= NEEDED) { finish(true); return; }
            setTimeout(function() { if (!done) scramble(); }, 1000);
          }
        } else { game.audio.play('se_failure', 0.3); flash = 0.3; flashCol = C.a; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!positions) initGame(); background(); drawNumbers();
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SPEED KING!' : 'TOO SLOW', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      roundTime += dt;
      if (roundTime > ROUND_LIMIT) { failures++; game.audio.play('se_failure', 0.4); flash = 0.5; flashCol = C.a; if (failures >= MAX_FAIL) { finish(false); return; } scramble(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawNumbers();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(roundTime.toFixed(1) + 's', W / 2, snap(H * 0.90), 42, roundTime > ROUND_LIMIT * 0.8 ? C.a : C.c);
    if (bestTime < 999) txt('BEST ' + bestTime.toFixed(1) + 's', W / 2, snap(H * 0.94), 30, C.b);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_FAIL; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, mi < failures ? C.a : '#04142a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
