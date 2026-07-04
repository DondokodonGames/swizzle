// 618-clock-sync.js
// クロックシンク — 回転する時針と分針を、指定の目印にぴったり止める反射神経ゲーム
// 操作: タップで時針を止める → もう一度タップで分針を止める。両方の目印に合わせる
// 成功: 5回 正確に一致  失敗: 3回 外れ or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、時計塔） ──
  var C = { bg:'#04040c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CLOCK SYNC';
  var HOW_TO_PLAY = 'TAP TO STOP THE HOUR HAND · TAP AGAIN FOR THE MINUTE HAND · HIT BOTH MARKS';
  var MAX_TIME = 22;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.44), CLOCK_R = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hourAngle, minuteAngle, hourSpeed, minuteSpeed, targetHour, targetMinute, hourStopped, minuteStopped, handPhase, successes, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0a1a');
  }

  function background() { game.draw.clear(C.bg); }

  function nextRound() {
    var h = Math.floor(Math.random() * 12), m = Math.floor(Math.random() * 12) * 5;
    targetHour = (h / 12) * Math.PI * 2 - Math.PI / 2; targetMinute = (m / 60) * Math.PI * 2 - Math.PI / 2;
    hourAngle = Math.random() * Math.PI * 2; minuteAngle = Math.random() * Math.PI * 2;
    hourStopped = false; minuteStopped = false; handPhase = 'hour';
    hourSpeed = 0.6 + Math.random() * 0.5 + successes * 0.05; minuteSpeed = 1.8 + Math.random() * 1.2 + successes * 0.1;
  }

  function initGame() { successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; nextRound(); }

  function angleDiff(a, b) { var d = ((a - b) + Math.PI * 2) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; return d; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawHand(angle, length, width, col) {
    var x2 = CX + Math.cos(angle) * length, y2 = CY + Math.sin(angle) * length;
    game.draw.line(CX, CY, x2, y2, '#000000', width + 4); game.draw.line(CX, CY, x2, y2, col, width);
    game.draw.line(CX, CY, CX - Math.cos(angle) * length * 0.2, CY - Math.sin(angle) * length * 0.2, col, width * 0.6);
  }

  function drawScene() {
    ring(CX, CY, CLOCK_R, C.d, 0.8); pc(CX, CY, CLOCK_R - 12, '#0d0d20', 1);
    for (var hi = 0; hi < 12; hi++) { var a = (hi / 12) * Math.PI * 2 - Math.PI / 2, r1 = CLOCK_R - 34, r2 = CLOCK_R - 14; game.draw.line(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1, CX + Math.cos(a) * r2, CY + Math.sin(a) * r2, C.e, hi % 3 === 0 ? 7 : 3); }
    var thx = CX + Math.cos(targetHour) * (CLOCK_R - 54), thy = CY + Math.sin(targetHour) * (CLOCK_R - 54);
    pc(thx, thy, 16, C.f, 0.5 + Math.sin(game.time.elapsed * 6) * 0.2);
    var tmx = CX + Math.cos(targetMinute) * (CLOCK_R - 20), tmy = CY + Math.sin(targetMinute) * (CLOCK_R - 20);
    pc(tmx, tmy, 12, C.e, 0.5 + Math.sin(game.time.elapsed * 6 + 1) * 0.2);
    drawHand(hourAngle, CLOCK_R * 0.52, 14, C.f);
    drawHand(minuteAngle, CLOCK_R * 0.78, 8, C.e);
    pc(CX, CY, 18, C.g, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (handPhase === 'hour' && !hourStopped) { hourStopped = true; handPhase = 'minute'; game.audio.play('se_tap', 0.25); }
    else if (handPhase === 'minute' && !minuteStopped) {
      minuteStopped = true; handPhase = 'check';
      var hDiff = angleDiff(hourAngle, targetHour), mDiff = angleDiff(minuteAngle, targetMinute), ok = hDiff < 0.28 && mDiff < 0.28;
      if (ok) {
        successes++; flash = 0.35; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.8; game.audio.play('se_success', 0.7);
        for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); }
        if (successes >= NEEDED) { finish(true); return; }
      } else {
        misses++; flash = 0.3; flashCol = C.a; resultText = Math.round(Math.max(hDiff, mDiff) * 180 / Math.PI) + ' OFF'; resultTimer = 0.8; game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS) { finish(false); return; }
      }
      setTimeout(function() { if (!done) nextRound(); }, 1100);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetHour === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.10, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN SYNC!' : 'OUT OF TIME', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      if (!hourStopped) hourAngle += hourSpeed * dt; if (!minuteStopped) minuteAngle += minuteSpeed * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    var inst = handPhase === 'hour' ? 'STOP THE HOUR HAND' : (handPhase === 'minute' ? 'STOP THE MINUTE HAND' : '');
    if (resultTimer > 0) txt(resultText, W / 2, snap(CY + CLOCK_R + 90), 56, flashCol);
    else if (inst) txt(inst, W / 2, snap(CY + CLOCK_R + 90), 42, handPhase === 'hour' ? C.f : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
