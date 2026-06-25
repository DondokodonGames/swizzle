// 243-quickdraw.js
// クイックドロウ — 「DRAW!」の瞬間に素早く銃を抜く西部劇の緊張
// 操作: タップで銃を抜く（早撃ち）
// 成功: 5回連続で相手より早く抜く  失敗: 1回でも負ける or 早撃ちペナルティ3回

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0a00',
    sand:   '#8b6914',
    sandHi: '#d4a017',
    sky:    '#1e3a5f',
    sun:    '#fde68a',
    player: '#22c55e',
    enemy:  '#ef4444',
    gun:    '#94a3b8',
    ui:     '#d4a017',
    text:   '#fde68a',
    flash:  '#fff'
  };

  var STATE = 'WAIT';   // WAIT, READY, DRAW, RESULT
  var waitTime = 0;
  var waitDuration = 0;
  var drawTime = 0;     // how long after DRAW appeared before tap
  var enemyTime = 0;    // enemy reaction time (random)
  var wins = 0;
  var NEEDED = 5;
  var earlyCount = 0;
  var MAX_EARLY = 3;
  var done = false;
  var elapsed = 0;
  var resultMsg = '';
  var resultCol = '#fff';
  var resultTimer = 0;
  var flashTimer = 0;
  var roundNum = 0;
  var enemySpeed = 0.38; // seconds — enemy draw time

  function startRound() {
    STATE = 'WAIT';
    waitDuration = 1.5 + Math.random() * 2.5;
    waitTime = 0;
    drawTime = 0;
    enemyTime = enemySpeed - roundNum * 0.015 + (Math.random() - 0.5) * 0.08;
    enemyTime = Math.max(0.22, enemyTime);
    roundNum++;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (STATE === 'WAIT' || STATE === 'READY') {
      // Too early!
      earlyCount++;
      resultMsg = 'はやまった！ (' + earlyCount + '/' + MAX_EARLY + ')';
      resultCol = '#f59e0b';
      resultTimer = 0.8;
      game.audio.play('se_failure', 0.4);
      if (earlyCount >= MAX_EARLY && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        startRound();
      }
      return;
    }

    if (STATE === 'DRAW') {
      var reaction = drawTime;
      flashTimer = 0.15;
      if (reaction < enemyTime) {
        wins++;
        resultMsg = '勝ち！ ' + Math.round(reaction * 1000) + 'ms';
        resultCol = C.player;
        game.audio.play('se_success', 0.8);
        if (wins >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(wins * 300 + Math.round((1 - reaction) * 500)); }, 600);
          return;
        }
      } else {
        resultMsg = '負け！ ' + Math.round(reaction * 1000) + 'ms';
        resultCol = C.enemy;
        game.audio.play('se_failure', 0.7);
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      STATE = 'RESULT';
      resultTimer = 1.0;
      setTimeout(function() { if (!done) startRound(); }, 1100);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;
    if (flashTimer > 0) flashTimer -= dt;
    if (resultTimer > 0) resultTimer -= dt;

    if (!done) {
      if (STATE === 'WAIT') {
        waitTime += dt;
        if (waitTime >= waitDuration) {
          STATE = 'DRAW';
          drawTime = 0;
        }
      } else if (STATE === 'DRAW') {
        drawTime += dt;
        // Enemy shoots after enemyTime
        if (drawTime > enemyTime + 0.5 && !done) {
          // Player was too slow
          resultMsg = '遅すぎ！ ' + Math.round(drawTime * 1000) + 'ms';
          resultCol = C.enemy;
          game.audio.play('se_failure', 0.7);
          done = true;
          STATE = 'RESULT';
          setTimeout(function() { game.end.failure(); }, 700);
        }
      }
    }

    // ---- draw ----
    // Sky
    game.draw.rect(0, 0, W, H * 0.55, C.sky, 1);
    // Sun
    game.draw.circle(W * 0.85, H * 0.12, 60, C.sun, 0.9);
    game.draw.circle(W * 0.85, H * 0.12, 80, C.sun, 0.2);
    // Ground
    game.draw.rect(0, H * 0.55, W, H * 0.45, C.sand, 1);
    game.draw.rect(0, H * 0.55, W, 8, C.sandHi, 0.5);

    // Flash
    if (flashTimer > 0) {
      game.draw.rect(0, 0, W, H, C.flash, flashTimer * 0.8);
    }

    // Player (left)
    var px = W * 0.2, py = H * 0.5;
    game.draw.circle(px, py - 60, 40, C.player, 0.9);
    game.draw.rect(px - 20, py - 20, 40, 80, C.player, 0.8);
    // Gun
    var gunAngle = (STATE === 'DRAW' || STATE === 'RESULT') ? -0.4 : 0.3;
    var gx = px + Math.cos(gunAngle) * 40;
    var gy = py + Math.sin(gunAngle) * 40;
    game.draw.line(px, py, gx, gy, C.gun, 10);
    game.draw.circle(gx, gy, 8, C.gun, 1);

    // Enemy (right)
    var ex = W * 0.8, ey = H * 0.5;
    game.draw.circle(ex, ey - 60, 40, C.enemy, 0.9);
    game.draw.rect(ex - 20, ey - 20, 40, 80, C.enemy, 0.8);
    var eGunAngle = (STATE === 'DRAW' && drawTime > enemyTime) ? Math.PI + 0.4 : Math.PI - 0.3;
    var egx = ex + Math.cos(eGunAngle) * 40;
    var egy = ey + Math.sin(eGunAngle) * 40;
    game.draw.line(ex, ey, egx, egy, C.gun, 10);
    game.draw.circle(egx, egy, 8, C.gun, 1);

    // State display
    if (STATE === 'WAIT') {
      game.draw.text('・・・', W / 2, H * 0.32, { size: 60, color: C.ui });
    } else if (STATE === 'DRAW') {
      var pulse = 0.7 + 0.3 * Math.abs(Math.sin(elapsed * 20));
      game.draw.text('DRAW !!!', W / 2, H * 0.3, { size: 100, color: C.flash, bold: true });
      game.draw.rect(0, H * 0.3 - 70, W, 110, C.enemy, pulse * 0.15);
      var barW = W * Math.min(1, drawTime / enemyTime);
      game.draw.rect(0, H * 0.42, W, 16, '#333', 0.5);
      game.draw.rect(0, H * 0.42, barW, 16, C.enemy, 0.8);
    }

    if (resultTimer > 0) {
      game.draw.text(resultMsg, W / 2, H * 0.38, { size: 52, color: resultCol, bold: true });
    }

    // Wins
    for (var wi = 0; wi < NEEDED; wi++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 36 + wi * 72, H * 0.87, 22, wi < wins ? C.player : '#1a0a00');
      if (wi < wins) game.draw.text('★', W / 2 - (NEEDED - 1) * 36 + wi * 72, H * 0.87, { size: 26, color: '#fff' });
    }

    // Early penalty
    for (var ei = 0; ei < MAX_EARLY; ei++) {
      game.draw.circle(W * 0.1 + ei * 44, H * 0.93, 14, ei < earlyCount ? '#f59e0b' : '#333');
    }

    game.draw.text(wins + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, 1 - elapsed / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, C.player);
    game.draw.text(Math.ceil(Math.max(0, 60 - elapsed)) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    startRound();
  });
})(game);
