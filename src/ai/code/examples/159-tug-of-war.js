// 159-tug-of-war.js
// 綱引き — 連打で綱を引き、相手チームを引きずり込む筋肉の燃え感
// 操作: タップ連打で引く
// 成功: 3本先取  失敗: 3本取られる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0605',
    rope:   '#92400e',
    ropeHi: '#d97706',
    player: '#3b82f6',
    playerHi:'#93c5fd',
    enemy:  '#ef4444',
    enemyHi:'#fca5a5',
    center: '#fef08a',
    danger: '#ef4444',
    win:    '#22c55e',
    ui:     '#334155'
  };

  var ROPE_Y = H * 0.5;
  var CENTER_X = W / 2;
  var WIN_DIST = 320; // how far rope must be pulled to win a round
  var MARKER_W = 16;

  var ropeOffset = 0; // positive = player side winning
  var tapPower = 0;   // player tap energy
  var TAP_BOOST = 22;
  var TAP_DECAY = 0.88;
  var AI_POWER_BASE = 14;
  var AI_VARIATION = 8;
  var aiTimer = 0;
  var AI_INTERVAL = 0.08;

  var playerWins = 0;
  var enemyWins = 0;
  var MAX_WINS = 3;
  var roundOver = false;
  var roundTimer = 0;

  var timeLeft = 60;
  var done = false;
  var shakeX = 0;

  function resetRound() {
    ropeOffset = 0;
    tapPower = 0;
    roundOver = false;
    aiTimer = 0;
  }

  game.onTap(function() {
    if (done || roundOver) return;
    tapPower += TAP_BOOST;
    if (tapPower > 120) tapPower = 120;
    game.audio.play('se_tap', 0.25);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (roundOver) {
      roundTimer -= dt;
      if (roundTimer <= 0) resetRound();
    } else {
      // Player pulling
      tapPower *= Math.pow(TAP_DECAY, dt * 60);
      ropeOffset += tapPower * dt;

      // AI pulling
      aiTimer -= dt;
      if (aiTimer <= 0) {
        aiTimer = AI_INTERVAL;
        var difficulty = 1 + (playerWins - enemyWins) * 0.15; // adapts
        var aiForce = (AI_POWER_BASE + Math.random() * AI_VARIATION) * difficulty;
        ropeOffset -= aiForce;
      }

      // Check win
      if (ropeOffset >= WIN_DIST) {
        playerWins++;
        roundOver = true;
        roundTimer = 1.2;
        game.audio.play('se_success');
        shakeX = 18;
        if (playerWins >= MAX_WINS && !done) {
          done = true;
          setTimeout(function() { game.end.success(playerWins * 200 + Math.ceil(timeLeft) * 30); }, 1200);
        }
      } else if (ropeOffset <= -WIN_DIST) {
        enemyWins++;
        roundOver = true;
        roundTimer = 1.2;
        game.audio.play('se_failure', 0.7);
        if (enemyWins >= MAX_WINS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 1200);
        }
      }
    }

    if (shakeX > 0) shakeX *= 0.75;

    // ---- draw ----
    var ox = Math.random() * shakeX * 2 - shakeX;
    game.draw.rect(0, 0, W, H, C.bg);

    // Arena
    game.draw.rect(0, ROPE_Y - 200, W, 400, '#0d0a08', 0.8);
    game.draw.line(0, ROPE_Y - 200, W, ROPE_Y - 200, C.rope, 2);
    game.draw.line(0, ROPE_Y + 200, W, ROPE_Y + 200, C.rope, 2);

    // Pit indicators
    game.draw.rect(0, ROPE_Y - 200, 80, 400, C.player, 0.08);
    game.draw.rect(W - 80, ROPE_Y - 200, 80, 400, C.enemy, 0.08);

    // Rope
    var ropeX = CENTER_X + ropeOffset;
    for (var ri = 0; ri < 16; ri++) {
      var rx = MARKER_W * 2 + ri * ((W - MARKER_W * 4) / 15);
      var ropeAlpha = 0.7;
      var segColor = C.rope;
      game.draw.line(MARKER_W * 2, ROPE_Y + ox, W - MARKER_W * 2, ROPE_Y + ox, C.rope, 28);
      game.draw.line(MARKER_W * 2, ROPE_Y + ox, W - MARKER_W * 2, ROPE_Y + ox, C.ropeHi, 8);
    }

    // Center marker on rope
    var markerX = ropeX + ox;
    game.draw.circle(markerX, ROPE_Y + ox, 32, C.center, 0.9);
    game.draw.circle(markerX, ROPE_Y + ox, 16, '#fff', 0.8);

    // Win zone lines
    game.draw.line(CENTER_X + WIN_DIST, ROPE_Y - 160, CENTER_X + WIN_DIST, ROPE_Y + 160, C.player, 6);
    game.draw.line(CENTER_X - WIN_DIST, ROPE_Y - 160, CENTER_X - WIN_DIST, ROPE_Y + 160, C.enemy, 6);

    // Team figures
    // Player team (left side)
    for (var pi = 0; pi < 3; pi++) {
      var pex = 80 + ropeOffset * 0.4 + ox + pi * 60;
      game.draw.circle(pex, ROPE_Y - 80, 36, C.playerHi, 0.3);
      game.draw.circle(pex, ROPE_Y - 80, 28, C.player, 0.85);
      game.draw.circle(pex, ROPE_Y - 120, 22, C.playerHi, 0.8);
      // Lean angle based on effort
      var lean = Math.min(tapPower / 60, 1) * 20;
      game.draw.line(pex, ROPE_Y - 70, pex - lean, ROPE_Y + 40, C.player, 10);
    }
    // Enemy team (right side)
    for (var ei = 0; ei < 3; ei++) {
      var eex = W - 80 + ropeOffset * 0.4 + ox - ei * 60;
      game.draw.circle(eex, ROPE_Y - 80, 36, C.enemyHi, 0.3);
      game.draw.circle(eex, ROPE_Y - 80, 28, C.enemy, 0.85);
      game.draw.circle(eex, ROPE_Y - 120, 22, C.enemyHi, 0.8);
      game.draw.line(eex, ROPE_Y - 70, eex + 16, ROPE_Y + 40, C.enemy, 10);
    }

    // Round result banner
    if (roundOver) {
      var won = ropeOffset >= WIN_DIST;
      game.draw.rect(W / 2 - 300, H / 2 - 80, 600, 160, won ? C.win : C.danger, 0.9);
      game.draw.text(won ? '勝ち！' : '負け！', W / 2, H / 2, { size: 80, color: '#fff', bold: true });
    }

    // Score
    game.draw.text('あなた', W * 0.2, H * 0.2, { size: 38, color: C.playerHi });
    game.draw.text('相手', W * 0.8, H * 0.2, { size: 38, color: C.enemyHi });
    for (var wi = 0; wi < MAX_WINS; wi++) {
      game.draw.circle(W * 0.15 + wi * 60, H * 0.26, 20, wi < playerWins ? C.player : '#1e293b', 0.9);
      game.draw.circle(W * 0.85 - wi * 60, H * 0.26, 20, wi < enemyWins ? C.enemy : '#1e293b', 0.9);
    }

    // Tap power bar
    var powerRatio = tapPower / 120;
    game.draw.rect(W / 2 - 200, H * 0.82, 400, 28, '#1e293b', 0.8);
    game.draw.rect(W / 2 - 200, H * 0.82, 400 * powerRatio, 28, C.playerHi, 0.9);

    if (!roundOver) game.draw.text('タップ連打！', W / 2, H * 0.91, { size: 48, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.rope : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.35); });
})(game);
