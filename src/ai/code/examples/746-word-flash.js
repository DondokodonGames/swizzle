// 746-word-flash.js
// ワードフラッシュ — 瞬時に表示される「左」「右」の文字通りの方向をタップせよ
// 操作: 左半分タップ＝左、右半分タップ＝右
// 成功: 40回成功  失敗: 10回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#070510',
    leftCol: '#3b82f6',
    rightCol:'#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0e0a1e'
  };

  var currentDir = 0; // -1=left, 1=right
  var showTimer  = 0;
  var SHOW_DUR   = 1.0;
  var waitTimer  = 0;
  var WAIT_DUR   = 0.25;
  var answered   = false;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var bgPulse = 0;

  function nextWord() {
    currentDir = Math.random() < 0.5 ? -1 : 1;
    SHOW_DUR = Math.max(0.45, 1.0 - score * 0.012);
    showTimer = SHOW_DUR;
    answered = false;
  }

  game.onTap(function(tx, ty) {
    if (done || answered || showTimer <= 0 || waitTimer > 0) return;
    var tapped = tx < W / 2 ? -1 : 1;
    answered = true;
    if (tapped === currentDir) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = tapped === -1 ? '←左！' : '右！→';
      resultTimer = 0.32;
      game.audio.play('se_tap', 0.1);
      bgPulse = 0.3;
      var cx = tapped === -1 ? W * 0.25 : W * 0.75;
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.35, col: tapped === -1 ? C.leftCol : C.rightCol });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 120); }, 700);
      } else {
        waitTimer = WAIT_DUR;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ちがう！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        waitTimer = WAIT_DUR;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) nextWord();
      return;
    }

    if (showTimer > 0) {
      showTimer -= dt;
      if (showTimer <= 0 && !answered) {
        // Time out — count as error
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '遅い！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.2);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          waitTimer = WAIT_DUR;
        }
      }
    }

    if (bgPulse > 0) bgPulse -= dt * 4;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    if (showTimer > 0 && waitTimer <= 0) {
      var col = currentDir === -1 ? C.leftCol : C.rightCol;
      var txt = currentDir === -1 ? '←　左' : '右　→';
      var timerFrac = showTimer / SHOW_DUR;

      // Direction zone highlight
      var zoneX = currentDir === -1 ? 0 : W / 2;
      game.draw.rect(zoneX, 0, W / 2, H, col, 0.04 + timerFrac * 0.04);

      // Big text
      game.draw.text(txt, W / 2, H * 0.44, { size: 140, color: col, bold: true });

      // Timer bar (shows remaining time for this word)
      var barY = H * 0.62;
      game.draw.rect(W / 2 - 250, barY, 500, 20, '#1a1a2a', 0.9);
      game.draw.rect(W / 2 - 250, barY, 500 * timerFrac, 20, col, 0.9);

      // Zone labels
      game.draw.text('←', W * 0.25, H * 0.72, { size: 80, color: C.leftCol + (currentDir === -1 ? 'ff' : '44'), bold: true });
      game.draw.text('→', W * 0.75, H * 0.72, { size: 80, color: C.rightCol + (currentDir === 1 ? 'ff' : '44'), bold: true });
    } else {
      game.draw.text('・・・', W / 2, H * 0.44, { size: 80, color: C.text + '33', bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 60, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextWord();
  });
})(game);
