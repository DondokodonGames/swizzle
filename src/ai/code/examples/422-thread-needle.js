// 422-thread-needle.js
// 糸通し — ゆらゆら揺れる針の穴めがけてタップで糸を打ち込み、狙いすまして通す集中ゲーム
// 操作: タップで糸を針穴へ射出（穴に通れば成功、外すとミス）
// 成功: 4回 通す  失敗: 3回 ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、裁縫台） ──
  var C = { bg:'#0d0a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'THREAD NEEDLE';
  var HOW_TO_PLAY = 'TAP TO SHOOT THREAD INTO THE SWAYING NEEDLE EYE';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_MISS = 3;
  var NX = snap(W / 2), NY = snap(H * 0.40), NLEN = 280, EYE_W = 24, EYE_H = 36;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var needleAngle, thread, successes, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function eyePos() { var off = -NLEN * 0.85; return { x: NX + Math.cos(needleAngle - Math.PI / 2) * off, y: NY + Math.sin(needleAngle - Math.PI / 2) * off }; }

  function initGame() { needleAngle = 0; thread = null; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 600 + Math.ceil(timeLeft) * 100) : successes * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawNeedle() {
    var tx = NX + Math.cos(needleAngle - Math.PI / 2) * NLEN, ty = NY + Math.sin(needleAngle - Math.PI / 2) * NLEN;
    pline(NX, NY, tx, ty, C.g, 0.9, 16);
    var e = eyePos(); ring(e.x, e.y, EYE_W, C.g, 0.9); pc(e.x, e.y, EYE_W - 8, C.bg, 1);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || thread) return;
    var e = eyePos(), dx = e.x - x, dy = e.y - y, d = Math.max(1, Math.hypot(dx, dy));
    thread = { x: x, y: y, vx: dx / d * 1200, vy: dy / d * 1200 }; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    needleAngle = Math.sin(game.time.elapsed * (0.8 + successes * 0.1)) * (0.4 + successes * 0.04);
    if (state === S.ATTRACT) {
      background(); drawNeedle();
      txt(GAME_TITLE, W / 2, H * 0.62, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.68, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'THREADED!' : 'FRAYED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var e = eyePos();
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (thread) {
        thread.x += thread.vx * dt; thread.y += thread.vy * dt;
        var dx = thread.x - e.x, dy = thread.y - e.y, lx = dx * Math.cos(-needleAngle) - dy * Math.sin(-needleAngle), ly = dx * Math.sin(-needleAngle) + dy * Math.cos(-needleAngle);
        if (Math.abs(lx) < EYE_W / 2 && Math.abs(ly) < EYE_H / 2) { successes++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.6); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.a }); } thread = null; if (successes >= NEEDED) { finish(true); return; } }
        else if (thread && (thread.y < e.y - 100 || thread.x < -200 || thread.x > W + 200 || thread.y > H + 100)) { misses++; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.4); thread = null; if (misses >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawNeedle();
    if (thread) { pline(thread.x, thread.y, thread.x - thread.vx * 0.05, thread.y - thread.vy * 0.05, C.g, 0.5, 3); pc(thread.x, thread.y, 8, C.a, 0.9); }
    else { pc(W / 2, H * 0.82, 16, C.a, 0.6); pline(W / 2, H * 0.82, e.x, e.y, C.a, 0.3, 3); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
