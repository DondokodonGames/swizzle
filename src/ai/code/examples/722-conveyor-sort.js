// 722-conveyor-sort.js
// コンベアの仕分け — ベルトで流れてくる荷物を色ごとに正しいレーンへ送れ
// 操作: タップで荷物を上下のレーンに振り分け（上半分=上レーン、下半分=下レーン）
// 成功: 35個正確に仕分ける  失敗: 8回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    belt:    '#1c1917',
    boxA:    '#0ea5e9',
    boxB:    '#f97316',
    laneA:   '#0c4a6e',
    laneB:   '#7c2d12',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0608'
  };

  // Two lanes: top (A, blue) and bottom (B, orange)
  var LANE_A_Y = H * 0.30;
  var LANE_B_Y = H * 0.60;
  var BELT_Y   = H * 0.45;   // center belt
  var BOX_W = 110, BOX_H = 90;
  var BOX_SPEED = 320;

  var currentBox = null;  // { type:'A'|'B', x, y, moving, sentDir }
  var spawnTimer = 0.4;
  var sentAnim = null;    // { x, y, vx, vy, type, correct, life }

  var score = 0;
  var NEEDED = 35;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBox() {
    var type = Math.random() < 0.5 ? 'A' : 'B';
    currentBox = { type: type, x: -BOX_W / 2, y: BELT_Y, sent: false };
  }

  function sendBox(dir) { // 'up' or 'down'
    if (!currentBox || currentBox.sent) return;
    currentBox.sent = true;
    var correct = (dir === 'up' && currentBox.type === 'A') || (dir === 'down' && currentBox.type === 'B');
    var targetY = dir === 'up' ? LANE_A_Y : LANE_B_Y;
    sentAnim = {
      x: currentBox.x, y: currentBox.y,
      vx: 0, vy: dir === 'up' ? -700 : 700,
      type: currentBox.type, correct: correct, life: 0.4
    };
    if (correct) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      game.audio.play('se_tap', 0.1);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '逆！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    currentBox = null;
    spawnTimer = 0.3;
  }

  game.onTap(function(tx, ty) {
    if (done || !currentBox || currentBox.sent) return;
    if (ty < H / 2) {
      sendBox('up');
    } else {
      sendBox('down');
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

    if (currentBox && !currentBox.sent) {
      currentBox.x += BOX_SPEED * dt;
      // If box passes center and hasn't been tapped, it auto-misses
      if (currentBox.x > W + BOX_W / 2) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '逃がした！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.3);
        currentBox = null;
        spawnTimer = 0.3;
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    if (spawnTimer > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && !currentBox && !done) spawnBox();
    }
    if (!currentBox && spawnTimer <= 0 && !done) spawnBox();

    if (sentAnim) {
      sentAnim.x += sentAnim.vx * dt;
      sentAnim.y += sentAnim.vy * dt;
      sentAnim.life -= dt * 2.5;
      if (sentAnim.life <= 0) sentAnim = null;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane A (top, blue)
    game.draw.rect(0, LANE_A_Y - 60, W, 120, C.laneA, 0.7);
    game.draw.circle(80, LANE_A_Y, 40, C.boxA, 0.85);
    game.draw.text('A', 80, LANE_A_Y + 16, { size: 48, color: '#fff', bold: true });
    game.draw.text('↑ 青', W * 0.5, LANE_A_Y + 16, { size: 44, color: C.boxA + '88', bold: true });

    // Lane B (bottom, orange)
    game.draw.rect(0, LANE_B_Y - 60, W, 120, C.laneB, 0.7);
    game.draw.circle(80, LANE_B_Y, 40, C.boxB, 0.85);
    game.draw.text('B', 80, LANE_B_Y + 16, { size: 48, color: '#fff', bold: true });
    game.draw.text('↓ 橙', W * 0.5, LANE_B_Y + 16, { size: 44, color: C.boxB + '88', bold: true });

    // Belt (center)
    game.draw.rect(0, BELT_Y - 28, W, 56, C.belt, 0.9);
    // Belt stripes
    for (var bs = 0; bs < 12; bs++) {
      var bsx = (bs * 100 - (elapsed * 320) % 100 + 100) % (W + 100) - 50;
      game.draw.line(bsx, BELT_Y - 28, bsx - 30, BELT_Y + 28, '#2d2825', 8);
    }

    // Sent animation
    if (sentAnim) {
      var sa = sentAnim;
      var sc = sa.type === 'A' ? C.boxA : C.boxB;
      game.draw.rect(sa.x - BOX_W / 2, sa.y - BOX_H / 2, BOX_W, BOX_H,
        sa.correct ? C.correct : C.wrong, sa.life * 2);
    }

    // Current box on belt
    if (currentBox && !currentBox.sent) {
      var bCol = currentBox.type === 'A' ? C.boxA : C.boxB;
      game.draw.rect(currentBox.x - BOX_W / 2 + 4, currentBox.y - BOX_H / 2 + 4, BOX_W, BOX_H, '#000', 0.2);
      game.draw.rect(currentBox.x - BOX_W / 2, currentBox.y - BOX_H / 2, BOX_W, BOX_H, bCol, 0.92);
      game.draw.rect(currentBox.x - BOX_W / 2, currentBox.y - BOX_H / 2, BOX_W, 12, '#ffffff22', 1);
      game.draw.text(currentBox.type, currentBox.x, currentBox.y + 20, { size: 64, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.78, { size: 56, color: C.wrong, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBox();
  });
})(game);
