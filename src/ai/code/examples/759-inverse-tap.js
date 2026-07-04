// 759-inverse-tap.js
// インバースタップ — 表示された矢印の「逆」方向をタップする。脳が混乱する反応ゲーム
// 操作: 左矢印なら画面右、右矢印なら画面左をタップ（逆方向スワイプも可）
// 成功: 12回 正解  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、矢印） ──
  var C = { bg:'#0a0314', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ARROW_L = '#00cfff', ARROW_R = '#ff2fa0';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'INVERSE TAP';
  var HOW_TO_PLAY = 'TAP THE OPPOSITE SIDE OF THE ARROW · LEFT ARROW = TAP RIGHT, AND VICE VERSA';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var WAIT_DUR = 0.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var arrowDir, showTimer, showDur, answered, waitTimer, score, errors, timeLeft, done, elapsed, flash, flashCol, resultText, resultTimer, hintPulse;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 16; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.95); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#100818');
  }

  function background() { game.draw.clear(C.bg); }

  function nextArrow() { arrowDir = Math.random() < 0.5 ? 'left' : 'right'; showDur = Math.max(0.5, 1.0 - score * 0.03); showTimer = showDur; answered = false; hintPulse = 0; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; nextArrow(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluate(correct) {
    if (correct) { score++; flash = 0.2; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.38; game.audio.play('se_success', 0.55); if (score >= NEEDED) { finish(true); return; } }
    else { errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG - INVERT IT!'; resultTimer = 0.45; game.audio.play('se_failure', 0.3); if (errors >= MAX_ERR) { finish(false); return; } }
    answered = true; waitTimer = WAIT_DUR;
  }

  function drawScene() {
    game.draw.rect(0, H * 0.25, W / 2, H * 0.5, '#1e1b4b', 0.5); game.draw.rect(W / 2, H * 0.25, W / 2, H * 0.5, '#4a0d2e', 0.5);
    txt('< LEFT', W / 4, H * 0.35, 48, ARROW_L); txt('RIGHT >', W * 3 / 4, H * 0.35, 48, ARROW_R);
    txt('TAP THE OPPOSITE!', W / 2, H * 0.22, 38, C.g);
    game.draw.rect(W / 2 - 3, H * 0.25, 6, H * 0.5, C.g, 0.12);
    if (!answered) {
      var arrowCol = arrowDir === 'left' ? ARROW_L : ARROW_R, pulse = 1.0 + 0.08 * Math.sin(hintPulse), sz = Math.floor(260 * pulse);
      arrow(W / 2, snap(H * 0.50), sz, arrowDir === 'left' ? 'left' : 'right', arrowCol);
      game.draw.rect(W / 2 - 280, snap(H * 0.74), 560, 14, '#1a1a2a', 0.8); var tf = Math.max(0, showTimer / showDur); game.draw.rect(W / 2 - 280, snap(H * 0.74), 560 * tf, 14, tf > 0.35 ? arrowCol : C.a, 0.85);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0 || showTimer <= 0) return;
    var tappedLeft = tx < W / 2;
    evaluate((arrowDir === 'left' && !tappedLeft) || (arrowDir === 'right' && tappedLeft));
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || answered || waitTimer > 0 || showTimer <= 0) return;
    if (dir === 'left' || dir === 'right') evaluate((arrowDir === 'left' && dir === 'right') || (arrowDir === 'right' && dir === 'left'));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (arrowDir === undefined) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BRAIN BENDER!' : 'BRAIN FREEZE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) nextArrow(); }
      else { hintPulse += dt * 4; if (!answered) { showTimer -= dt; if (showTimer <= 0) { errors++; flash = 0.28; flashCol = C.a; resultText = 'TOO SLOW!'; resultTimer = 0.4; game.audio.play('se_failure', 0.22); if (errors >= MAX_ERR) { finish(false); return; } answered = true; waitTimer = WAIT_DUR; } } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.81), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#100818');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
