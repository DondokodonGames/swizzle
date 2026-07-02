// 208-coin-flip.js
// コインフリップ — 回転して止まるコインの表裏を、回っている間に予測してタップする読み勝ち
// 操作: 左タップで表(HEADS)、右タップで裏(TAILS)
// 成功: 3回中2回以上的中  失敗: 的中2回に届かず or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、カジノ台） ──
  var C = { bg:'#06040c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN FLIP';
  var HOW_TO_PLAY = 'TAP ◄ HEADS · TAILS ► WHILE IT SPINS';
  var MAX_TIME = 20;
  var ROUNDS = 3;              // 修正2: 10 → 3
  var NEEDED = 2;             // 修正2: 5 → 2
  var COIN_X = snap(W / 2), COIN_Y = snap(H * 0.4), COIN_R = 160;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, phaseTimer, spinAngle, result, choice, score, total, timeLeft, done, feedback, feedbackOk, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, snap(H * 0.74), W / 2, snap(H * 0.2), C.b, choice === 0 && phase === 'spinning' ? 0.2 : 0.06);
    game.draw.rect(W / 2, snap(H * 0.74), W / 2, snap(H * 0.2), C.e, choice === 1 && phase === 'spinning' ? 0.2 : 0.06);
    txt('HEADS', W * 0.25, snap(H * 0.86), 56, C.b);
    txt('TAILS', W * 0.75, snap(H * 0.86), 56, C.e);
  }

  function drawCoin() {
    var squeeze = 1;
    if (phase === 'spinning') squeeze = Math.abs(Math.cos(spinAngle));
    else if (phase === 'reveal' || phase === 'wait') squeeze = 1;
    var cw = Math.max(8, snap(COIN_R * squeeze)), face = result === 0 ? C.b : C.e;
    var col = squeeze > 0.4 ? face : C.f;
    // ドット楕円（横幅 squeeze）
    for (var qy = -COIN_R; qy <= COIN_R; qy += 8) for (var qx = -cw; qx <= cw; qx += 8) {
      if ((qx * qx) / (cw * cw) + (qy * qy) / (COIN_R * COIN_R) <= 1) game.draw.rect(COIN_X + qx, COIN_Y + qy, 8, 8, col, 0.92);
    }
    if ((phase === 'reveal' || phase === 'wait') && squeeze > 0.4) txt(result === 0 ? 'H' : 'T', COIN_X, COIN_Y + 36, 130, '#000000');
  }

  function startFlip() {
    if (state !== S.PLAYING || done) return;
    result = Math.random() > 0.5 ? 1 : 0; spinAngle = 0; phase = 'spinning'; phaseTimer = 1.4 + Math.random() * 0.6; choice = -1;
    game.audio.play('se_tap', 0.3);
  }

  function initGame() {
    phase = 'idle'; phaseTimer = 0.6; spinAngle = 0; result = 0; choice = -1;
    score = 0; total = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 40) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'idle' || phase === 'wait') startFlip();
    else if (phase === 'spinning' && choice < 0) { choice = x < W / 2 ? 0 : 1; game.audio.play('se_tap', 0.4); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      phase = 'reveal'; result = Math.floor(game.time.elapsed) % 2; background(); drawCoin();
      txt(GAME_TITLE, W / 2, H * 0.15, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.66, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'READ WIN!' : 'BAD LUCK', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      if (phaseTimer > 0) phaseTimer -= dt;

      if (phase === 'idle') { if (phaseTimer <= 0) startFlip(); }
      else if (phase === 'spinning') {
        spinAngle += (2 + Math.max(0, phaseTimer) * 12) * dt;
        if (phaseTimer <= 0) {
          phase = 'reveal'; phaseTimer = 1.2; total++;
          if (choice === result) {
            score++; feedbackOk = true; feedback = 1.0; game.audio.play('se_success', 0.8);
            for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: COIN_X, y: COIN_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6 }); }
          } else if (choice >= 0) { feedbackOk = false; feedback = 0.8; game.audio.play('se_failure', 0.4); }
          else { feedbackOk = false; feedback = 0.6; }
          if (score >= NEEDED) { finish(true); return; }
          if (total >= ROUNDS) { finish(score >= NEEDED); return; }
        }
      }
      else if (phase === 'reveal') { if (phaseTimer <= 0) { phase = 'idle'; phaseTimer = 0.8; } }
      for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) { var p = particles[pi2]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi2, 1); }
    }

    // ---- 描画 ----
    background(); drawCoin();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 6, snap(particles[pp].y) - 6, 12, 12, C.c, particles[pp].life * 1.6);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    var hint = phase === 'idle' ? 'TAP TO FLIP' : (phase === 'spinning' && choice < 0 ? 'CALL IT!' : '');
    if (hint) txt(hint, W / 2, H * 0.70, 44, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('HITS ' + score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('ROUND ' + Math.min(total + (phase === 'reveal' ? 0 : 1), ROUNDS) + ' / ' + ROUNDS, W / 2, 224, 38, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
