// 166-code-crack.js
// 金庫破り — 4桁のダイヤル錠を一つずつ止めて正しいコードに合わせる緊張感
// 操作: タップでダイヤルを止める
// 成功: 4桁全部正解  失敗: 1桁でも外す or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08070a',
    safe:    '#2d2d2d',
    safeHi:  '#4a4a4a',
    dial:    '#8b7355',
    dialHi:  '#c4a265',
    num:     '#f8fafc',
    correct: '#22c55e',
    wrong:   '#ef4444',
    lock:    '#7c3aed',
    lockHi:  '#a78bfa',
    ui:      '#334155'
  };

  var DIGITS = 4;
  var DIAL_R = 130;
  var DIAL_X = [W * 0.16, W * 0.38, W * 0.62, W * 0.84];
  var DIAL_Y = H * 0.48;

  var target = [];
  var current = [];
  var speeds = [];
  var stopped = [];
  var results = []; // true/false per digit
  var currentDigit = 0;
  var done = false;
  var gameState = 'playing'; // 'playing' | 'reveal' | 'done'
  var revealTimer = 0;
  var timeLeft = 30;
  var feedback = 0;
  var shakeX = 0;

  function init() {
    for (var i = 0; i < DIGITS; i++) {
      target.push(Math.floor(Math.random() * 10));
      current.push(Math.random() * 10);
      speeds.push((2 + Math.random() * 3) * (Math.random() < 0.5 ? 1 : -1) * (1 + i * 0.3));
      stopped.push(false);
      results.push(false);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || gameState !== 'playing') return;
    if (currentDigit >= DIGITS) return;

    // Stop current dial
    var val = Math.floor(current[currentDigit]) % 10;
    stopped[currentDigit] = true;
    results[currentDigit] = (val === target[currentDigit]);
    game.audio.play('se_tap', 0.7);

    if (!results[currentDigit]) {
      // Wrong digit!
      gameState = 'reveal';
      revealTimer = 1.5;
      game.audio.play('se_failure');
      shakeX = 20;
    } else {
      game.audio.play('se_success', 0.6);
      currentDigit++;
      if (currentDigit >= DIGITS) {
        // All correct!
        gameState = 'reveal';
        revealTimer = 1.2;
        game.audio.play('se_success');
        done = true;
        setTimeout(function() {
          game.end.success(DIGITS * 200 + Math.ceil(timeLeft) * 40);
        }, 1200);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;
    if (shakeX > 0) shakeX *= 0.7;
    if (revealTimer > 0) {
      revealTimer -= dt;
      if (revealTimer <= 0 && gameState === 'reveal' && !done) {
        done = true;
        game.end.failure();
      }
    }

    // Update spinning dials
    for (var i = 0; i < DIGITS; i++) {
      if (!stopped[i]) {
        current[i] += speeds[i] * dt;
        if (current[i] < 0) current[i] += 10;
        if (current[i] >= 10) current[i] -= 10;
      }
    }

    // ---- draw ----
    var ox = (Math.random() - 0.5) * shakeX * 2;
    game.draw.rect(0, 0, W, H, C.bg);

    // Safe door background
    game.draw.rect(40 + ox, H * 0.22, W - 80, H * 0.55, C.safe, 0.95);
    game.draw.rect(40 + ox, H * 0.22, W - 80, 16, C.safeHi, 0.6);

    // Dials
    for (var i = 0; i < DIGITS; i++) {
      var dx = DIAL_X[i] + ox;
      var dy = DIAL_Y;
      var val = Math.floor(current[i]) % 10;
      var isActive = (i === currentDigit && !stopped[i]);
      var isStopped = stopped[i];

      // Dial body
      game.draw.circle(dx, dy, DIAL_R + 12, C.safeHi, 0.3);
      game.draw.circle(dx, dy, DIAL_R, isStopped ? (results[i] ? C.correct : C.wrong) : C.dial, 0.9);

      // Tick marks around dial
      for (var tick = 0; tick < 10; tick++) {
        var ta = -Math.PI / 2 + ((current[i] + tick) / 10) * Math.PI * 2;
        var tr = DIAL_R - 20;
        var tx2 = dx + Math.cos(ta) * tr;
        var ty2 = dy + Math.sin(ta) * tr;
        game.draw.circle(tx2, ty2, 6, C.dialHi, tick === 0 ? 0.9 : 0.35);
      }

      // Window showing current number
      game.draw.rect(dx - 44, dy - 52, 88, 96, '#000', 0.7);
      game.draw.rect(dx - 44, dy - 52, 88, 8, C.lockHi, 0.4);
      game.draw.text(val + '', dx, dy + 4, { size: 72, color: isStopped ? (results[i] ? C.correct : C.wrong) : C.num, bold: true });

      // Arrow indicator
      game.draw.rect(dx - 12, dy - DIAL_R - 32, 24, 32, C.lockHi, isActive ? 0.9 : 0.3);

      // Label
      if (isStopped) {
        game.draw.text(results[i] ? '✓' : '✗', dx, dy + DIAL_R + 40, { size: 52, color: results[i] ? C.correct : C.wrong, bold: true });
      } else if (i === currentDigit) {
        game.draw.text('↑ タップ', dx, dy + DIAL_R + 44, { size: 32, color: C.lockHi });
      }
    }

    // Target hint (blurred)
    game.draw.text('コード:', W / 2 + ox, H * 0.82, { size: 36, color: C.ui });
    for (var ti = 0; ti < DIGITS; ti++) {
      var shown = stopped[ti] && results[ti] ? target[ti] : '?';
      game.draw.circle(W * 0.28 + ti * W * 0.15 + ox, H * 0.87, 32, stopped[ti] && results[ti] ? C.correct : C.lock, 0.7);
      game.draw.text(shown + '', W * 0.28 + ti * W * 0.15 + ox, H * 0.87, { size: 36, color: '#fff', bold: true });
    }

    game.draw.text('ダイヤルを止めろ', W / 2, H * 0.93, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lock : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); init(); });
})(game);
