// 726-fraction-split.js
// フラクションスプリット — バーを指定の分数の位置でタップして正確に分割する
// 操作: 目標の分数（例 2/3）の位置をバー上でタップ。許容範囲内なら成功
// 成功: 8回 成功  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、分割バー） ──
  var C = { bg:'#0a0510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BAR_A = '#ff2079', BAR_B = '#00cfff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRACTION SPLIT';
  var HOW_TO_PLAY = 'TAP THE BAR AT THE MARKED FRACTION POSITION · CLOSE ENOUGH WINS';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var BAR_X0 = 80, BAR_W = W - 160, BAR_Y = snap(H * 0.48), BAR_H = 80, TOLERANCE = 0.07;
  var FRACTIONS = [0.25, 0.33, 0.4, 0.5, 0.6, 0.67, 0.75];
  var FRAC_LABELS = ['1/4', '1/3', '2/5', '1/2', '3/5', '2/3', '3/4'];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetFrac, targetLabel, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, lastTapX, showResult, showCorrect;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#110715');
  }

  function background() { game.draw.clear(C.bg); }

  function pickTarget() { var idx = Math.floor(Math.random() * FRACTIONS.length); targetFrac = FRACTIONS[idx]; targetLabel = FRAC_LABELS[idx]; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lastTapX = -1; showResult = 0; showCorrect = false; pickTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var targetX = BAR_X0 + targetFrac * BAR_W;
    txt(targetLabel, W / 2, snap(H * 0.30), 120, C.c);
    txt('TAP AT THIS FRACTION', W / 2, snap(H * 0.30) + 100, 36, '#ffffff66');
    if (showResult > 0 && lastTapX >= 0) {
      var clampedTap = Math.max(0, Math.min(1, (lastTapX - BAR_X0) / BAR_W));
      game.draw.rect(BAR_X0, BAR_Y, clampedTap * BAR_W, BAR_H, BAR_A, 0.9);
      game.draw.rect(BAR_X0 + clampedTap * BAR_W, BAR_Y, (1 - clampedTap) * BAR_W, BAR_H, BAR_B, 0.9);
      game.draw.line(lastTapX, BAR_Y - 10, lastTapX, BAR_Y + BAR_H + 10, showCorrect ? C.b : C.a, 6);
    } else {
      game.draw.rect(BAR_X0, BAR_Y, BAR_W / 2, BAR_H, BAR_A, 0.6); game.draw.rect(BAR_X0 + BAR_W / 2, BAR_Y, BAR_W / 2, BAR_H, BAR_B, 0.6);
    }
    game.draw.line(targetX, BAR_Y - 24, targetX, BAR_Y + BAR_H + 24, C.c, 4); pc(targetX, BAR_Y - 24, 12, C.c, 0.9); pc(targetX, BAR_Y + BAR_H + 24, 12, C.c, 0.9);
    var tolX0 = BAR_X0 + (targetFrac - TOLERANCE) * BAR_W, tolX1 = BAR_X0 + (targetFrac + TOLERANCE) * BAR_W;
    game.draw.rect(tolX0, BAR_Y, tolX1 - tolX0, BAR_H, C.b, 0.12);
    game.draw.rect(BAR_X0, BAR_Y, 4, BAR_H, C.g, 0.3); game.draw.rect(BAR_X0 + BAR_W - 4, BAR_Y, 4, BAR_H, C.g, 0.3);
    txt('RED', BAR_X0 + 40, BAR_Y + BAR_H + 50, 32, '#ff2079cc'); txt('BLUE', BAR_X0 + BAR_W - 40, BAR_Y + BAR_H + 50, 32, '#00cfffcc');
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tapFrac = Math.max(0, Math.min(1, (tx - BAR_X0) / BAR_W)), diff = Math.abs(tapFrac - targetFrac);
    lastTapX = tx; showResult = 0.8;
    if (diff <= TOLERANCE) {
      score++; showCorrect = true; flash = 0.3; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.6; game.audio.play('se_success', 0.55);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: BAR_X0 + targetFrac * BAR_W, y: BAR_Y + BAR_H / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: C.c }); }
      pickTarget();
      if (score >= NEEDED) { finish(true); return; }
    } else {
      showCorrect = false; errors++; flash = 0.3; flashCol = C.a; resultText = Math.round(tapFrac * 100) + '%  (TARGET ' + Math.round(targetFrac * 100) + '%)'; resultTimer = 0.7; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetFrac === undefined) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.62, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PRECISE!' : 'MISJUDGED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (showResult > 0) showResult -= dt * 1.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.72), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#110715');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
