// 714-tap-roulette.js
// タップルーレット — 回転するホイールをタップで減速させ、目標の数字で止める
// 操作: タップするたびに回転が落ちる。針が目標セグメントで止まれば当たり
// 成功: 5回 的中  失敗: 3回 ハズレ or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、セグメント色は保持） ──
  var C = { bg:'#060210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SEGMENTS = 8;
  var SEG_COLORS = ['#ff2079', '#ff6600', '#00ff41', '#00cfff', '#a855f7', '#ff2fa0', '#00ffcc', '#ffb300'];
  var SEG_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TAP ROULETTE';
  var HOW_TO_PLAY = 'TAP TO SLOW THE WHEEL · STOP THE NEEDLE ON THE TARGET NUMBER';
  var MAX_TIME = 22;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.42), WHEEL_R = 280, NEEDLE_Y = snap(H * 0.42) - 300, MIN_SPEED = 0.3, DECEL = 1.2, TAP_DECEL = 2.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, spinSpeed, targetSeg, spinning, resultWait, score, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080418');
  }

  function background() { game.draw.clear(C.bg); }

  function getTopSeg() {
    var normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), segAngle = Math.PI * 2 / SEGMENTS;
    var topAngle = (Math.PI * 3 / 2 - normalizedAngle + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(topAngle / segAngle) % SEGMENTS;
  }

  function pickTarget() { targetSeg = Math.floor(Math.random() * SEGMENTS); spinSpeed = 5 + Math.random() * 4; spinning = true; resultWait = 0; }

  function initGame() { angle = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; pickTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 700 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var segAngle2 = Math.PI * 2 / SEGMENTS;
    for (var seg = 0; seg < SEGMENTS; seg++) { var midA = angle + seg * segAngle2 + segAngle2 / 2; for (var r2 = 0; r2 < WHEEL_R; r2 += 20) game.draw.rect(CX + Math.cos(midA) * r2 - 10, CY + Math.sin(midA) * r2 - 10, 20, 20, SEG_COLORS[seg], 0.9); }
    for (var s2 = 0; s2 < SEGMENTS; s2++) { var la = angle + s2 * segAngle2; game.draw.line(CX, CY, CX + Math.cos(la) * WHEEL_R, CY + Math.sin(la) * WHEEL_R, '#000000', 4); }
    for (var sl = 0; sl < SEGMENTS; sl++) { var la2 = angle + sl * segAngle2 + segAngle2 / 2; txt(SEG_LABELS[sl], CX + Math.cos(la2) * WHEEL_R * 0.65, CY + Math.sin(la2) * WHEEL_R * 0.65 + 14, 48, C.g); }
    pc(CX, CY, 32, '#111', 0.9); pc(CX, CY, 18, '#334155', 0.9);
    game.draw.rect(snap(CX) - 6, NEEDLE_Y - 20, 12, 60, C.a, 0.95); pc(CX, NEEDLE_Y - 20, 14, C.a, 0.95);
    game.draw.rect(W * 0.7, CY - 80, 200, 160, SEG_COLORS[targetSeg], 0.85);
    txt('TARGET', W * 0.7 + 100, CY - 40, 32, C.g); txt(SEG_LABELS[targetSeg], W * 0.7 + 100, CY + 34, 80, C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !spinning) return;
    spinSpeed = Math.max(MIN_SPEED, spinSpeed - TAP_DECEL); game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 3; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX + Math.cos(pa) * WHEEL_R, y: CY + Math.sin(pa) * WHEEL_R, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 100, life: 0.3, col: C.g }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WINNER!' : 'NO LUCK', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (resultWait > 0) { resultWait -= dt; if (resultWait <= 0) pickTarget(); }
      if (spinning) {
        spinSpeed = Math.max(MIN_SPEED, spinSpeed - DECEL * dt); angle += spinSpeed * dt;
        if (spinSpeed <= MIN_SPEED) {
          spinning = false; var landedSeg = getTopSeg();
          if (landedSeg === targetSeg) {
            score++; flash = 0.35; flashCol = C.b; resultText = 'WIN!'; resultTimer = 0.7; game.audio.play('se_success', 0.65);
            for (var p2 = 0; p2 < 8; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa2) * 260, vy: Math.sin(pa2) * 260, life: 0.6, col: SEG_COLORS[targetSeg] }); }
            if (score >= NEEDED) { finish(true); return; }
            resultWait = 0.9;
          } else {
            misses++; flash = 0.35; flashCol = C.a; resultText = 'MISS  (' + SEG_LABELS[landedSeg] + ')'; resultTimer = 0.7; game.audio.play('se_failure', 0.4);
            if (misses >= MAX_MISS) { finish(false); return; }
            resultWait = 0.9;
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 60, flashCol);

    // Speed gauge
    var speedRatio = Math.min(1, spinSpeed / 9);
    game.draw.rect(40, snap(H * 0.73), 40, 200, '#080418', 0.7); game.draw.rect(40, snap(H * 0.73) + 200 * (1 - speedRatio), 40, 200 * speedRatio, spinning ? C.c : C.b, 0.85);
    txt('SPD', 60, snap(H * 0.73) - 20, 26, '#ffffff44');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#080418');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
