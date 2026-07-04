// 687-echo-tap.js
// エコータップ — 表示された数字ちょうどの回数だけタップする
// 操作: 表示回数と同じ数だけタップ。手を止めると自動判定。超えたら即アウト
// 成功: 8問 正解  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、カウント） ──
  var C = { bg:'#050214', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECHO TAP';
  var HOW_TO_PLAY = 'TAP EXACTLY THE NUMBER SHOWN · PAUSE TO LOCK IN · DO NOT OVERSHOOT';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 6 → 3
  var COMMIT_DELAY = 0.7;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetNum, tapCount, committed, commitTimer, correct, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, tapDots;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 14) * (r - 14)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080510');
  }

  function background() { game.draw.clear(C.bg); }

  function newQuestion() { targetNum = 2 + Math.floor(Math.random() * 5); tapCount = 0; committed = false; commitTimer = 0; tapDots = []; }

  function initGame() { correct = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newQuestion(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluate() {
    if (committed) return;
    committed = true;
    if (tapCount === targetNum) {
      correct++; flash = 0.3; flashCol = C.b; resultText = tapCount + '  CORRECT!'; resultTimer = 0.55; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.b }); }
      if (correct >= NEEDED) { finish(true); return; }
      setTimeout(newQuestion, 700);
    } else {
      errors++; flash = 0.4; flashCol = C.a; resultText = tapCount + '  NEEDED ' + targetNum; resultTimer = 0.7; game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERR) { finish(false); return; }
      setTimeout(newQuestion, 800);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || committed) return;
    tapCount++; commitTimer = COMMIT_DELAY; game.audio.play('se_tap', 0.1);
    tapDots.push({ x: tx, y: ty, life: 0.6 });
    if (tapCount > targetNum) evaluate();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetNum === undefined) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.30, 90, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.35, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.62, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT ECHO!' : 'OUT OF SYNC', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
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
      if (!committed && tapCount > 0) { commitTimer -= dt; if (commitTimer <= 0) evaluate(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
      for (var td = tapDots.length - 1; td >= 0; td--) { tapDots[td].life -= dt * 2; if (tapDots[td].life <= 0) tapDots.splice(td, 1); }
    }

    // ---- 描画 ----
    background();
    // Big target number
    ring(W / 2, snap(H * 0.38), 236, C.d, 0.5); pc(W / 2, snap(H * 0.38), 220, '#1e1b4b', 0.9);
    txt('' + targetNum, W / 2, snap(H * 0.38) + 70, 220, C.d);
    txt('TAPS', W / 2, snap(H * 0.38) + 230, 42, '#ffffff55');

    // Tap counter row
    var dotSpacing = 90, dotY = snap(H * 0.66), startX = W / 2 - (targetNum - 1) * dotSpacing / 2;
    for (var i = 0; i < targetNum; i++) {
      var dx2 = startX + i * dotSpacing, isTapped = i < tapCount, isOver = tapCount > targetNum && i < tapCount;
      pc(dx2, dotY, 34, isOver ? C.a : (isTapped ? C.b : '#1e293b'), 0.9);
      if (isTapped) txt('#', dx2, dotY + 12, 32, C.g);
    }
    var countCol = tapCount > targetNum ? C.a : (tapCount === targetNum ? C.b : C.g);
    txt(tapCount + '', W / 2, snap(H * 0.77), 80, countCol);
    if (!committed && tapCount > 0) { var barW = W * 0.6, barRatio = commitTimer / COMMIT_DELAY; game.draw.rect(W * 0.2, snap(H * 0.81), barW, 14, '#1e293b', 0.7); game.draw.rect(W * 0.2, snap(H * 0.81), barW * barRatio, 14, C.d, 0.8); }
    for (var td2 = 0; td2 < tapDots.length; td2++) { var dot = tapDots[td2]; pc(dot.x, dot.y, 28 * dot.life, C.b, dot.life * 0.5); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 50, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080510');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
