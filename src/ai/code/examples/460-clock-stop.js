// 460-clock-stop.js
// 時計停止 — ぐるぐる回る秒針が12時ちょうどを指した瞬間にタップして止める
// 操作: タップで秒針を止める（真上=12時にぴったり合わせる）
// 成功: 3回 成功  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時計塔） ──
  var C = { bg:'#08060f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CLOCK STOP';
  var HOW_TO_PLAY = 'TAP WHEN THE SECOND HAND POINTS STRAIGHT UP AT 12';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var CX = snap(W / 2), CY = snap(H * 0.44), CLOCK_R = 300, TOL = 0.09;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var secondAngle, secondSpeed, stopped, resultText, resultCol, resultTimer, particles, successes, misses, timeLeft, done, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#12081a');
  }

  function background() { game.draw.clear(C.bg); }

  function resetHand() { secondAngle = Math.random() * Math.PI * 2; secondSpeed = 2.5 + successes * 0.4; stopped = false; }

  function initGame() { successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; resetHand(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 800 + Math.ceil(timeLeft) * 100) : successes * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawClock() {
    pc(CX, CY, CLOCK_R, '#12081a', 0.95); ring(CX, CY, CLOCK_R, C.d, 0.6);
    for (var ti = 0; ti < 12; ti++) { var ta = ti * Math.PI / 6 - Math.PI / 2; game.draw.rect(snap(CX + Math.cos(ta) * (CLOCK_R - 30)) - 6, snap(CY + Math.sin(ta) * (CLOCK_R - 30)) - 6, 12, 12, C.g, 0.5); }
    // 12マーカー
    pc(CX, CY - CLOCK_R + 44, 28, C.c, 0.9); txt('12', CX, CY - CLOCK_R + 58, 34, C.bg);
    // 装飾の短針・長針
    pline(CX, CY, CX, CY - CLOCK_R * 0.42, C.e, 0.8, 14); pline(CX, CY, CX + Math.cos(-Math.PI / 2 + 0.8) * CLOCK_R * 0.6, CY + Math.sin(-Math.PI / 2 + 0.8) * CLOCK_R * 0.6, C.e, 0.8, 10);
    // 秒針
    var sa = secondAngle - Math.PI / 2, tx = CX + Math.cos(sa) * CLOCK_R * 0.86, ty = CY + Math.sin(sa) * CLOCK_R * 0.86;
    pline(CX - Math.cos(sa) * 40, CY - Math.sin(sa) * 40, tx, ty, C.a, 0.95, 8); pc(CX, CY, 14, C.a, 1.0);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || stopped) return;
    stopped = true;
    var norm = ((secondAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), dist = Math.min(norm, Math.PI * 2 - norm);
    if (dist < TOL) {
      successes++; resultText = 'PERFECT!'; resultCol = C.b; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY - CLOCK_R * 0.8, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.7, col: C.c }); }
      if (successes >= NEEDED) { finish(true); return; }
    } else {
      misses++; resultText = 'OFF!'; resultCol = C.a; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    resultTimer = 1.0; setTimeout(function() { if (!done) resetHand(); }, 900);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (secondAngle === undefined) initGame(); background(); if (!stopped) secondAngle += 2.5 * dt; drawClock();
      txt(GAME_TITLE, W / 2, H * 0.80, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.955, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawClock();
      txt(resultSuccess ? 'ON THE DOT!' : 'MISTIMED', W / 2, H * 0.82, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.88, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (resultTimer > 0) resultTimer -= dt;
      if (!stopped) secondAngle += secondSpeed * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawClock();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.78), 56, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#12081a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
