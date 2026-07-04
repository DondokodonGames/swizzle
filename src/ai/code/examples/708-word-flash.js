// 708-word-flash.js
// フラッシュ暗算 — 一瞬だけ表示される数字を覚え、その合計を4択から選ぶ
// 操作: 数字が消えたら、合計値を下の4択からタップ
// 成功: 8問 正解  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、暗算） ──
  var C = { bg:'#04080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FLASH MATH';
  var HOW_TO_PLAY = 'MEMORIZE THE FLASHING NUMBERS · TAP THEIR SUM FROM THE FOUR OPTIONS';
  var MAX_TIME = 28;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 6 → 3
  var SHOW_DUR = 0.9;
  var OPT_W = 440, OPT_H = 200, OPT_GAP = 24, OPT_X0 = snap((W - OPT_W * 2 - OPT_GAP) / 2), OPT_Y0 = snap(H * 0.52);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flashPhase, showTimer, numbers, numY, sumAnswer, options, correctOptIdx, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, selectedIdx, waitTimer, choosing;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#070c14');
  }

  function background() { game.draw.clear(C.bg); }

  function optX(i) { return OPT_X0 + (i % 2) * (OPT_W + OPT_GAP); }
  function optY(i) { return OPT_Y0 + Math.floor(i / 2) * (OPT_H + OPT_GAP); }

  function newRound() {
    var count = 2 + Math.min(2, Math.floor(score / 3)), maxVal = 9 + Math.min(6, Math.floor(score / 2)) * 3;
    numbers = []; numY = []; sumAnswer = 0;
    for (var i = 0; i < count; i++) { var n = 1 + Math.floor(Math.random() * maxVal); numbers.push(n); numY.push(H * 0.30 + (i % 2 === 0 ? 1 : -1) * 40); sumAnswer += n; }
    options = [sumAnswer]; var offsets = [-2, -1, 1, 2, 3, -3, 4, -4, 5, -5];
    for (var j = offsets.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var tmp = offsets[j]; offsets[j] = offsets[k]; offsets[k] = tmp; }
    for (var m = 0; m < 3; m++) { var wr = sumAnswer + offsets[m]; if (wr <= 0) wr = sumAnswer + Math.abs(offsets[m]) + 1; options.push(wr); }
    for (var n2 = options.length - 1; n2 > 0; n2--) { var p2 = Math.floor(Math.random() * (n2 + 1)); var tmp2 = options[n2]; options[n2] = options[p2]; options[p2] = tmp2; }
    correctOptIdx = options.indexOf(sumAnswer);
    flashPhase = 'show'; showTimer = SHOW_DUR; selectedIdx = -1; choosing = false; waitTimer = 0;
  }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (flashPhase === 'show') {
      var ratio2 = showTimer / SHOW_DUR, cnt = numbers.length;
      for (var ni = 0; ni < cnt; ni++) txt(numbers[ni] + '', W * (ni + 1) / (cnt + 1), numY[ni], 120 + ni * 20, C.g);
      if (ratio2 < 0.4) txt('SUM?', W / 2, snap(H * 0.44), 52, C.c);
    } else {
      txt('SUM?', W / 2, snap(H * 0.46), 52, '#ffffff44');
      for (var oi = 0; oi < options.length; oi++) {
        var ox = optX(oi), oy = optY(oi), isSelected = selectedIdx === oi, isCorrect = oi === correctOptIdx, bgCol;
        if (isSelected) bgCol = isCorrect ? C.b : C.a;
        else if (!choosing && isCorrect && selectedIdx >= 0) bgCol = C.b;
        else bgCol = oi % 2 === 0 ? '#0f172a' : '#1e293b';
        game.draw.rect(ox, oy, OPT_W, OPT_H, bgCol, 0.85);
        txt(options[oi] + '', ox + OPT_W / 2, oy + OPT_H / 2 + 22, 80, C.g);
      }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !choosing || waitTimer > 0) return;
    for (var i = 0; i < options.length; i++) {
      if (tx >= optX(i) && tx <= optX(i) + OPT_W && ty >= optY(i) && ty <= optY(i) + OPT_H) {
        selectedIdx = i; choosing = false;
        if (i === correctOptIdx) {
          score++; flash = 0.3; flashCol = C.b; resultText = 'CORRECT!  (' + sumAnswer + ')'; resultTimer = 0.6; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: optX(i) + OPT_W / 2, y: optY(i) + OPT_H / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.b }); }
          if (score >= NEEDED) { finish(true); return; }
          waitTimer = 0.7;
        } else {
          errors++; flash = 0.35; flashCol = C.a; resultText = 'WRONG  (' + sumAnswer + ')'; resultTimer = 0.7; game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR) { finish(false); return; }
          waitTimer = 0.8;
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!numbers) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MATH WHIZ!' : 'MISCALCULATED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
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
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (flashPhase === 'show') { showTimer -= dt; if (showTimer <= 0) { flashPhase = 'choose'; choosing = true; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.92), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#070c14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
