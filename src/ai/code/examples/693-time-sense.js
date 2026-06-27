// 693-time-sense.js
// 体内時計 — タイマーを見ずに指定秒後を感じてタップせよ
// 操作: タップで時間を合わせる
// 成功: 15問で誤差平均0.5秒以内  失敗: 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a06',
    ring:    '#064e3b',
    fill:    '#22c55e',
    fillLow: '#ef4444',
    text:    '#f1f5f9',
    correct: '#22c55e',
    good:    '#86efac',
    warn:    '#fde68a',
    wrong:   '#ef4444',
    ui:      '#05100a'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var RADIUS = 300;

  var targetTime = 3;
  var startTime = 0;
  var phase = 'ready'; // 'ready' | 'counting' | 'result'
  var tapTime = 0;
  var waitTimer = 0;
  var results = [];

  var round = 0;
  var NEEDED = 15;
  var totalError = 0;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;
  var resultText = '', resultScore = '';
  var resultTimer = 0;

  function pickTarget() {
    return 2 + Math.floor(Math.random() * 5); // 2-6 seconds
  }

  function newRound() {
    targetTime = pickTarget();
    startTime = 0;
    phase = 'ready';
    tapTime = 0;
    waitTimer = 0;
  }

  function getGradeColor(err) {
    if (err < 0.25) return C.correct;
    if (err < 0.5) return C.good;
    if (err < 1.0) return C.warn;
    return C.wrong;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'ready') {
      phase = 'counting';
      startTime = elapsed;
      game.audio.play('se_tap', 0.15);
    } else if (phase === 'counting') {
      tapTime = elapsed - startTime;
      phase = 'result';
      var err = Math.abs(tapTime - targetTime);
      totalError += err;
      round++;
      results.push({ target: targetTime, actual: tapTime, err: err });

      var col = getGradeColor(err);
      flashCol = col;
      flashAnim = 0.35;
      var errStr = err.toFixed(2) + '秒';
      if (err < 0.15) { resultText = '完璧！'; }
      else if (err < 0.4) { resultText = 'いい感じ！'; }
      else if (err < 0.8) { resultText = 'まあまあ'; }
      else { resultText = 'ズレた...'; }
      resultScore = tapTime.toFixed(2) + '秒 (目標: ' + targetTime + '秒)';
      resultTimer = 1.2;
      game.audio.play(err < 0.5 ? 'se_success' : 'se_failure', 0.5);

      if (round >= NEEDED && !done) {
        var avgErr = totalError / round;
        done = true;
        game.audio.play(avgErr < 0.5 ? 'se_success' : 'se_failure', 0.9);
        var score = Math.max(0, Math.floor((1 - avgErr) * 5000)) + round * 100;
        setTimeout(function() {
          if (avgErr < 0.5) game.end.success(score);
          else game.end.failure();
        }, 1200);
      } else {
        waitTimer = 1.3;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (phase === 'result' && waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background ring
    game.draw.circle(CX + 5, CY + 5, RADIUS + 20, '#000', 0.3);
    game.draw.circle(CX, CY, RADIUS + 20, C.ring, 0.8);

    if (phase === 'ready') {
      game.draw.text('タップして開始', CX, CY + 20, { size: 52, color: '#ffffff66', bold: true });
      game.draw.text('目標: ' + targetTime + '秒後にタップ', CX, CY + 110, { size: 44, color: C.fill });

    } else if (phase === 'counting') {
      var t = elapsed - startTime;
      // Don't show the actual progress! Just show pulsing circle
      var pulse = Math.sin(t * Math.PI * 2) * 0.15 + 0.85;
      game.draw.circle(CX, CY, RADIUS * pulse, C.ring, 0.5);

      // Small visual hint (star/dot in center)
      game.draw.circle(CX, CY, 30, C.fill, 0.6 + 0.4 * Math.sin(t * 6));
      game.draw.text('今!', CX, CY + 20, { size: 80, color: '#ffffff33', bold: true });

    } else if (phase === 'result') {
      var err2 = results[results.length - 1].err;
      var actual2 = results[results.length - 1].actual;
      var rCol = getGradeColor(err2);
      // Show how far off they were
      var ratio2 = Math.min(1, actual2 / targetTime);
      game.draw.circle(CX, CY, RADIUS, rCol, 0.15);
      game.draw.circle(CX, CY, RADIUS * ratio2, rCol, 0.3);
    }

    // Target display
    game.draw.text(targetTime + '秒', CX, RADIUS + CY + 80, { size: 60, color: C.fill, bold: true });
    game.draw.text('秒後にタップ', CX, RADIUS + CY + 145, { size: 36, color: '#ffffff44' });

    if (resultTimer > 0) {
      game.draw.text(resultText, CX, H * 0.82, { size: 64, color: flashCol, bold: true });
      game.draw.text(resultScore, CX, H * 0.88, { size: 38, color: '#ffffff66' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    // Stats
    if (round > 0) {
      var avgE = totalError / round;
      var avgCol = getGradeColor(avgE);
      game.draw.text('平均誤差: ' + avgE.toFixed(2) + '秒', CX, 150, { size: 40, color: avgCol });
    }
    game.draw.text(round + ' / ' + NEEDED, CX, 200, { size: 44, color: C.text, bold: true });

    var ratio3 = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio3, 12, ratio3 > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', CX, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    newRound();
  });
})(game);
