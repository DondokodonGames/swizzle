// 452-sniper-scope.js
// スナイパースコープ — 揺れる暗視スコープを安定させ、動く標的を撃ち抜く
// 操作: タップで照準を固定（LOCK）、もう一度タップで発射（FIRE）
// 成功: 3体 撃破  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、暗視スコープ） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SNIPER SCOPE';
  var HOW_TO_PLAY = 'TAP TO LOCK THE CROSSHAIR · TAP AGAIN TO FIRE';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var SCOPE_R = 260, CX = snap(W / 2), CY = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var scopeX, scopeY, scopeVX, scopeVY, targetX, targetY, targetR, targetVX, targetVY, phase, lockedX, lockedY, hits, misses, timeLeft, done, particles, flash, flashCol, fireAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); pc(CX, CY, SCOPE_R, '#002200', 0.4); ring(CX, CY, SCOPE_R, C.d, 0.4); }

  function newTarget() {
    var ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 120;
    targetX = CX + Math.cos(ang) * dist; targetY = CY + Math.sin(ang) * dist;
    targetR = Math.max(30, 56 - hits * 6);
    var sp = 60 + hits * 15, ta = Math.random() * Math.PI * 2;
    targetVX = Math.cos(ta) * sp; targetVY = Math.sin(ta) * sp; phase = 'aim';
  }

  function initGame() { scopeX = CX; scopeY = CY; scopeVX = (Math.random() - 0.5) * 120; scopeVY = (Math.random() - 0.5) * 80; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; fireAnim = 0; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 800 + Math.ceil(timeLeft) * 100) : hits * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // 標的
    pc(targetX, targetY, targetR, C.a, 0.7); pc(targetX, targetY, targetR * 0.6, C.f, 0.6); pc(targetX, targetY, targetR * 0.3, C.c, 0.8);
    // 照準（十字）
    var sx = phase !== 'aim' ? lockedX : scopeX, sy = phase !== 'aim' ? lockedY : scopeY;
    var col = phase === 'locked' ? C.c : C.b, cs = 90;
    for (var i = 24; i <= cs; i += 8) { game.draw.rect(snap(sx - i) - 4, snap(sy) - 4, 8, 8, col, 0.9); game.draw.rect(snap(sx + i) - 4, snap(sy) - 4, 8, 8, col, 0.9); game.draw.rect(snap(sx) - 4, snap(sy - i) - 4, 8, 8, col, 0.9); game.draw.rect(snap(sx) - 4, snap(sy + i) - 4, 8, 8, col, 0.9); }
    ring(sx, sy, 100, col, phase === 'locked' ? 0.5 : 0.2); pc(sx, sy, 8, col, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'aim') { lockedX = scopeX; lockedY = scopeY; phase = 'locked'; game.audio.play('se_tap', 0.4); }
    else if (phase === 'locked') {
      phase = 'fire'; fireAnim = 0.3;
      if (Math.hypot(targetX - lockedX, targetY - lockedY) < targetR + 16) {
        hits++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: targetX, y: targetY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); }
        if (hits >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) newTarget(); }, 800);
      } else {
        misses++; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.5);
        if (misses >= MAX_MISS) { finish(false); return; }
        setTimeout(function() { if (!done) newTarget(); }, 600);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (scopeX === undefined) initGame(); background(); drawScene();
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
      background();
      txt(resultSuccess ? 'TARGET DOWN!' : 'MISSED SHOT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (fireAnim > 0) fireAnim -= dt * 4;
      if (phase === 'aim') {
        scopeVX += (Math.random() - 0.5) * 400 * dt; scopeVY += (Math.random() - 0.5) * 300 * dt; scopeVX *= (1 - dt * 1.5); scopeVY *= (1 - dt * 1.5);
        scopeX += scopeVX * dt; scopeY += scopeVY * dt;
        var sdx = scopeX - CX, sdy = scopeY - CY, sd = Math.hypot(sdx, sdy);
        if (sd > SCOPE_R - 60) { scopeX = CX + sdx / sd * (SCOPE_R - 60); scopeY = CY + sdy / sd * (SCOPE_R - 60); scopeVX = -scopeVX * 0.5; scopeVY = -scopeVY * 0.5; }
      }
      if (phase === 'aim' || phase === 'locked') {
        targetX += targetVX * dt; targetY += targetVY * dt;
        var tdx = targetX - CX, tdy = targetY - CY;
        if (Math.hypot(tdx, tdy) > SCOPE_R - 40) { targetVX = -targetVX; targetVY = -targetVY; targetX += targetVX * dt * 2; targetY += targetVY * dt * 2; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(phase === 'aim' ? 'TAP TO LOCK' : phase === 'locked' ? 'TAP TO FIRE' : '', W / 2, snap(H * 0.88), 46, phase === 'locked' ? C.c : C.b);
    if (fireAnim > 0) game.draw.rect(0, 0, W, H, C.g, fireAnim * 0.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
