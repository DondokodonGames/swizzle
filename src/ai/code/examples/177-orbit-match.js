// 177-orbit-match.js
// 軌道合わせ — 異なる速度で周回する2つの点が揃った瞬間にタップする観察力ゲーム
// 操作: タップで両方の点が重なった瞬間を捉える
// 成功: 1回揃える  失敗: 5回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、天文台） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT MATCH';
  var HOW_TO_PLAY = 'TAP WHEN BOTH DOTS ALIGN';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 5;
  var CX = snap(W / 2), CY = snap(H * 0.46), R1 = 260, R2 = 150, DOT_R = 30;
  var SPEED1 = 0.9, SPEED2 = 1.45, TOL = 0.25;   // 修正2: 判定甘め

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var a1, a2, score, misses, timeLeft, done, feedback, feedbackOk, particles, lockTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function angDiff() { var d = Math.abs(a1 - a2) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; }

  function initGame() {
    a1 = Math.random() * Math.PI * 2; a2 = a1 + Math.PI;
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; particles = []; lockTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lockTimer > 0) return;
    if (angDiff() < TOL) {
      score++; feedbackOk = true; feedback = 0.5; lockTimer = 0.4;
      game.audio.play('se_success', 0.9);
      var mx = CX + Math.cos(a1) * (R1 + R2) / 2, my = CY + Math.sin(a1) * (R1 + R2) / 2;
      for (var pi = 0; pi < 12; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: mx, y: my, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5 }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; feedbackOk = false; feedback = 0.4;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      ring(CX, CY, R1, C.d, 0.4); ring(CX, CY, R2, C.d, 0.4);
      a1 = game.time.elapsed * SPEED1; a2 = game.time.elapsed * SPEED2;
      pc(CX + Math.cos(a1) * R1, CY + Math.sin(a1) * R1, DOT_R, C.e, 1);
      pc(CX + Math.cos(a2) * R2, CY + Math.sin(a2) * R2, DOT_R, C.a, 1);
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.80, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALIGNED!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      a1 += SPEED1 * dt; a2 += SPEED2 * dt;
      if (lockTimer > 0) lockTimer -= dt;
    }
    if (feedback > 0) feedback -= dt;
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    var close = Math.max(0, 1 - angDiff() / (TOL * 3));
    var d1x = CX + Math.cos(a1) * R1, d1y = CY + Math.sin(a1) * R1, d2x = CX + Math.cos(a2) * R2, d2y = CY + Math.sin(a2) * R2;

    // ---- 描画 ----
    background();
    ring(CX, CY, R1, C.d, 0.4); ring(CX, CY, R2, C.d, 0.4);
    pc(CX, CY, 24, C.d, 0.9);
    if (close > 0.3) pc(CX, CY, 300, C.b, close * 0.06);
    pc(d1x, d1y, DOT_R, C.e, 1); pc(d1x - 10, d1y - 10, 8, C.g, 0.6);
    pc(d2x, d2y, DOT_R, C.a, 1); pc(d2x - 10, d2y - 10, 8, C.g, 0.6);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.14);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    txt(close > 0.4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? 'NOW!' : 'WATCH...', W / 2, H - 120, 48, close > 0.4 ? C.c : C.e);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
