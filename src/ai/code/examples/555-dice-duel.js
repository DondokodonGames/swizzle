// 555-dice-duel.js
// ダイスデュエル — サイコロを振って合計が目標に近い方が勝ち、タップで止める
// 操作: タップでサイコロを止める
// 成功: 10ラウンド勝利  失敗: 10ラウンド敗北 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#1a0a08',
    die:     '#f0e8d4',
    dieHi:   '#fff8f0',
    dieSh:   '#8b6914',
    dot:     '#1a0808',
    player:  '#3b82f6',
    playerHi:'#93c5fd',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    target:  '#f59e0b',
    win:     '#22c55e',
    lose:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    table:   '#2d1a08'
  };

  var DIE_SIZE = 180;
  var DOT_POSITIONS = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
  };

  var PLAYER_DIE_X = W * 0.28;
  var ENEMY_DIE_X = W * 0.72;
  var PLAYER_DIE_Y = H * 0.45;
  var ENEMY_DIE_Y = H * 0.45;

  var playerDie = 1, playerRolling = true, playerStopped = false;
  var enemyDie = 1, enemyRolling = true;
  var rollSpeed = 15; // face changes per second
  var target = 0;

  var winsP = 0, winsE = 0;
  var roundsPlayed = 0;
  var NEEDED_WIN = 10;
  var ROUNDS = 20;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.win;
  var resultText = '', resultTimer = 0;
  var roundState = 'rolling'; // 'rolling' | 'result' | 'wait'
  var waitTimer = 0;
  var rollTimer = 0;
  var enemyStopTimer = 0;

  function newRound() {
    target = 3 + Math.floor(Math.random() * 4); // 3-6
    playerDie = 1; playerRolling = true; playerStopped = false;
    enemyDie = 1; enemyRolling = true;
    roundState = 'rolling';
    rollTimer = 0;
    enemyStopTimer = 0.8 + Math.random() * 1.5;
  }

  function drawDie(x, y, face, col, alpha) {
    // Shadow
    game.draw.rect(x - DIE_SIZE / 2 + 10, y - DIE_SIZE / 2 + 10, DIE_SIZE, DIE_SIZE, C.dieSh, alpha * 0.4);
    // Body
    game.draw.rect(x - DIE_SIZE / 2, y - DIE_SIZE / 2, DIE_SIZE, DIE_SIZE, col, alpha * 0.95);
    // Highlight
    game.draw.rect(x - DIE_SIZE / 2 + 8, y - DIE_SIZE / 2 + 8, DIE_SIZE * 0.4, DIE_SIZE * 0.2, C.dieHi, alpha * 0.3);
    // Dots
    var dotPos = DOT_POSITIONS[face] || DOT_POSITIONS[1];
    var DOT_R = 18;
    var DOT_SPREAD = 52;
    for (var di = 0; di < dotPos.length; di++) {
      var dp = dotPos[di];
      game.draw.circle(x + dp[0] * DOT_SPREAD, y + dp[1] * DOT_SPREAD, DOT_R, C.dot, alpha * 0.9);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (roundState === 'rolling' && playerRolling) {
      playerStopped = true;
      playerRolling = false;
      game.audio.play('se_tap', 0.5);
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
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (resultTimer > 0) resultTimer -= dt;

    rollTimer += dt;

    if (roundState === 'rolling') {
      // Roll dice
      if (playerRolling) {
        if (Math.floor(rollTimer * rollSpeed) !== Math.floor((rollTimer - dt) * rollSpeed)) {
          playerDie = 1 + Math.floor(Math.random() * 6);
        }
      }
      if (enemyRolling) {
        if (Math.floor(rollTimer * rollSpeed) !== Math.floor((rollTimer - dt) * rollSpeed)) {
          enemyDie = 1 + Math.floor(Math.random() * 6);
        }
        enemyStopTimer -= dt;
        if (enemyStopTimer <= 0) {
          enemyRolling = false;
        }
      }

      // Both stopped
      if (!playerRolling && !enemyRolling) {
        roundState = 'result';
        roundsPlayed++;
        var pDiff = Math.abs(playerDie - target);
        var eDiff = Math.abs(enemyDie - target);
        if (pDiff < eDiff) {
          winsP++;
          resultText = 'WIN!';
          flashCol = C.win;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: PLAYER_DIE_X, y: PLAYER_DIE_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.win });
          }
        } else if (eDiff < pDiff) {
          winsE++;
          resultText = 'LOSE';
          flashCol = C.lose;
          game.audio.play('se_failure', 0.5);
        } else {
          resultText = 'DRAW';
          flashCol = C.target;
          game.audio.play('se_tap', 0.3);
        }
        flashAnim = 0.4;
        resultTimer = 1.2;
        waitTimer = 1.5;

        if (winsP >= NEEDED_WIN && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(winsP * 400 + Math.ceil(timeLeft) * 100); }, 800);
        } else if (winsE >= NEEDED_WIN && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    } else if (roundState === 'result') {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) {
        newRound();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.3, W, H * 0.55, C.table, 0.6);

    // Target
    game.draw.text('目標: ' + target, W / 2, H * 0.3, { size: 52, color: C.target, bold: true });
    game.draw.text('近い方が勝ち', W / 2, H * 0.3 + 60, { size: 34, color: C.ui });

    // Labels
    game.draw.text('あなた', PLAYER_DIE_X, PLAYER_DIE_Y - DIE_SIZE / 2 - 60, { size: 40, color: C.playerHi });
    game.draw.text('敵', ENEMY_DIE_X, ENEMY_DIE_Y - DIE_SIZE / 2 - 60, { size: 40, color: C.enemyHi });

    // Player die
    var pAlpha = playerRolling ? 0.7 + Math.sin(elapsed * 12) * 0.2 : 1.0;
    drawDie(PLAYER_DIE_X, PLAYER_DIE_Y, playerDie, playerRolling ? C.die : C.playerHi, pAlpha);
    if (playerRolling) {
      game.draw.text('タップ!', PLAYER_DIE_X, PLAYER_DIE_Y + DIE_SIZE / 2 + 48, { size: 40, color: C.player, bold: true });
    } else {
      game.draw.text('' + playerDie, PLAYER_DIE_X, PLAYER_DIE_Y + DIE_SIZE / 2 + 48, { size: 48, color: C.playerHi, bold: true });
    }

    // Enemy die
    var eAlpha = enemyRolling ? 0.7 + Math.sin(elapsed * 10 + 1) * 0.2 : 1.0;
    drawDie(ENEMY_DIE_X, ENEMY_DIE_Y, enemyDie, enemyRolling ? C.die : C.enemyHi, eAlpha);
    if (!enemyRolling) {
      game.draw.text('' + enemyDie, ENEMY_DIE_X, ENEMY_DIE_Y + DIE_SIZE / 2 + 48, { size: 48, color: C.enemyHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.78, { size: 80, color: flashCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Score
    game.draw.text('勝: ' + winsP + '  負: ' + winsE, W / 2, 148, { size: 52, color: C.text, bold: true });
    game.draw.text('目標 ' + NEEDED_WIN + '勝', W / 2, 208, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.lose);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    newRound();
  });
})(game);
