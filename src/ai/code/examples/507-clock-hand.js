// 507-clock-hand.js
// クロックハンド — ぐるぐる回る時計の針が、指定された時刻マーカーを指した瞬間にタップする
// 操作: 針が黄色いターゲットに重なった瞬間にタップ（ズレるとミス）
// 成功: 5回 的中  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時計塔） ──
  var C = { bg:'#030210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CLOCK HAND';
  var HOW_TO_PLAY = 'TAP WHEN THE HAND POINTS AT THE YELLOW TARGET';
  var MAX_TIME = 20;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = snap(W / 2), CY = snap(H * 0.44), CLOCK_R = 320, HAND_LEN = 250;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var handAngle, handSpeed, targetAngle, tolerance, hits, misses, timeLeft, done, particles, resultText, resultCol, resultTimer, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0828');
  }

  function background() { game.draw.clear(C.bg); }

  function norm(a) { while (a < 0) a += Math.PI * 2; while (a >= Math.PI * 2) a -= Math.PI * 2; return a; }
  function angleDiff(a, b) { var d = Math.abs(norm(a) - norm(b)); if (d > Math.PI) d = Math.PI * 2 - d; return d; }
  function xy(angle, len) { return { x: CX + Math.sin(angle) * len, y: CY - Math.cos(angle) * len }; }

  function newTarget() { targetAngle = (1 + Math.floor(Math.random() * 12)) / 12 * Math.PI * 2; }

  function initGame() { handAngle = 0; handSpeed = Math.PI; tolerance = 0.28; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; flash = 0; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 700 + Math.ceil(timeLeft) * 100) : hits * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawClock() {
    pc(CX, CY, CLOCK_R, '#0a0828', 0.95); ring(CX, CY, CLOCK_R, C.d, 0.6);
    for (var hi = 0; hi < 12; hi++) { var ta = hi / 12 * Math.PI * 2, ot = xy(ta, CLOCK_R - 30); game.draw.rect(snap(ot.x) - 6, snap(ot.y) - 6, 12, 12, C.e, 0.6); var np = xy(ta, CLOCK_R - 70); txt(hi === 0 ? '12' : hi + '', np.x, np.y + 12, 30, C.e); }
    var tp = xy(targetAngle, CLOCK_R - 40); ring(tp.x, tp.y, 24, C.c, 0.5 + Math.sin(game.time.elapsed * 5) * 0.2); pc(tp.x, tp.y, 16, C.c, 0.9);
    var hp = xy(handAngle, HAND_LEN); pline(CX, CY, hp.x, hp.y, C.g, 0.95, 8); pc(hp.x, hp.y, 12, C.g, 0.9); pc(CX, CY, 16, C.g, 0.9);
    if (angleDiff(handAngle, targetAngle) < tolerance) ring(CX, CY, CLOCK_R + 8, C.b, 0.3);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var diff = angleDiff(handAngle, targetAngle);
    if (diff <= tolerance) {
      hits++; resultText = diff < 0.1 ? 'PERFECT!' : 'GOOD!'; resultCol = C.b; resultTimer = 0.8; flash = 0.4; game.audio.play('se_success', 0.8);
      var pt = xy(handAngle, HAND_LEN); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: pt.x, y: pt.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.c }); }
      if (hits >= NEEDED) { finish(true); return; }
      tolerance = Math.max(0.16, tolerance - 0.02); newTarget();
    } else { misses++; resultText = 'OFF!'; resultCol = C.a; resultTimer = 0.7; flash = 0.4; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      handAngle = norm(handAngle + Math.PI * dt); if (targetAngle === undefined) initGame(); background(); drawClock();
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
      txt(resultSuccess ? 'ON TIME!' : 'MISTIMED', W / 2, H * 0.80, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.86, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt; if (flash > 0) flash -= dt * 3;
      handSpeed = Math.PI + hits * 0.12; handAngle = norm(handAngle + handSpeed * dt);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawClock();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.78), 60, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
