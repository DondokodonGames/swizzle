// 693-time-sense.js
// タイムセンス — タイマーを見ずに、指定秒後を体内時計で感じてタップする
// 操作: タップで計測開始 → 目標秒だと思ったタイミングでもう一度タップ
// 成功: 8問で平均誤差0.5秒以内  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、時感） ──
  var C = { bg:'#030a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TIME SENSE';
  var HOW_TO_PLAY = 'TAP TO START · TAP AGAIN WHEN YOU FEEL THE TARGET SECONDS HAVE PASSED';
  var MAX_TIME = 30;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var AVG_THRESHOLD = 0.5;
  var CX = W / 2, CY = snap(H * 0.45), RADIUS = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetTime, startTime, sensePhase, tapTime, waitTimer, results, round, totalError, timeLeft, done, elapsed, flash, flashCol, resultText, resultScore, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 16) * (r - 16)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#05100a');
  }

  function background() { game.draw.clear(C.bg); }

  function pickTarget() { return 2 + Math.floor(Math.random() * 5); }
  function getGradeColor(err) { if (err < 0.25) return C.b; if (err < 0.5) return C.d; if (err < 1.0) return C.c; return C.a; }

  function newRound() { targetTime = pickTarget(); startTime = 0; sensePhase = 'ready'; tapTime = 0; waitTimer = 0; }

  function initGame() { round = 0; totalError = 0; results = []; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultScore = ''; resultTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var avgErr = round > 0 ? totalError / round : 99;
    finalScore = success ? (Math.max(0, Math.floor((1 - avgErr) * 5000)) + round * 200) : round * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(CX, CY, RADIUS + 20, '#064e3b', 0.8);
    if (sensePhase === 'ready') {
      txt('TAP TO START', CX, CY + 16, 52, '#ffffff66');
      txt('FEEL ' + targetTime + ' SEC', CX, CY + 108, 44, C.d);
    } else if (sensePhase === 'counting') {
      var t = elapsed - startTime, pulse = Math.sin(t * Math.PI * 2) * 0.15 + 0.85;
      ring(CX, CY, RADIUS * pulse, '#064e3b', 0.5);
      pc(CX, CY, 30, C.d, 0.6 + 0.4 * Math.sin(t * 6));
      txt('NOW?', CX, CY + 16, 80, '#ffffff33');
    } else if (sensePhase === 'result') {
      var res = results[results.length - 1], rCol = getGradeColor(res.err), ratio2 = Math.min(1, res.actual / targetTime);
      pc(CX, CY, RADIUS, rCol, 0.15); pc(CX, CY, RADIUS * ratio2, rCol, 0.3);
    }
    txt(targetTime + ' SEC', CX, snap(RADIUS + CY + 84), 60, C.d);
    txt('TARGET', CX, snap(RADIUS + CY + 148), 36, '#ffffff44');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (sensePhase === 'ready') { sensePhase = 'counting'; startTime = elapsed; game.audio.play('se_tap', 0.15); }
    else if (sensePhase === 'counting') {
      tapTime = elapsed - startTime; sensePhase = 'result';
      var err = Math.abs(tapTime - targetTime); totalError += err; round++;
      results.push({ target: targetTime, actual: tapTime, err: err });
      flashCol = getGradeColor(err); flash = 0.35;
      if (err < 0.15) resultText = 'PERFECT!'; else if (err < 0.4) resultText = 'GREAT!'; else if (err < 0.8) resultText = 'CLOSE'; else resultText = 'OFF...';
      resultScore = tapTime.toFixed(2) + 's  (TARGET ' + targetTime + 's)';
      resultTimer = 1.2; game.audio.play(err < 0.5 ? 'se_success' : 'se_failure', 0.5);
      if (round >= NEEDED) { finish((totalError / round) < AVG_THRESHOLD); return; }
      waitTimer = 1.3;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetTime === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT CLOCK!' : 'OUT OF RHYTHM', W / 2, H * 0.32, 54, resultSuccess ? C.b : C.a);
      txt('AVG ERR ' + (round > 0 ? (totalError / round).toFixed(2) : '-') + 's', W / 2, H * 0.42, 40, C.d);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.52, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (sensePhase === 'result' && waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (resultTimer > 0) { txt(resultText, CX, snap(H * 0.82), 64, flashCol); txt(resultScore, CX, snap(H * 0.88), 36, '#ffffff66'); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    if (round > 0) txt('AVG ' + (totalError / round).toFixed(2) + 's', W / 2, 168, 40, getGradeColor(totalError / round));
    txt(round + ' / ' + NEEDED, W / 2, 224, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
