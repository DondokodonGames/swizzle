// 429-sumo-push.js
// 相撲押し出し — 連打でパワーを溜めて相手を押し出す
// 操作: 左右交互に素早くタップしてパワーアップ
// 成功: 相手を土俵外に3回押し出す  失敗: 自分が3回押し出される

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0a00',
    ring:   '#d97706',
    ringHi: '#fbbf24',
    ringLo: '#92400e',
    clay:   '#fde68a',
    player: '#3b82f6',
    playerHi:'#93c5fd',
    enemy:  '#ef4444',
    enemyHi:'#fca5a5',
    belt:   '#1e40af',
    beltE:  '#991b1b',
    power:  '#22c55e',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444'
  };

  var RING_R = 320;
  var CX = W / 2;
  var CY = H * 0.52;

  var playerX = CX - 100;
  var enemyX = CX + 100;
  var playerPower = 0;
  var enemyPower = 0;
  var velocity = 0;  // positive = player pushing right, negative = enemy pushing left

  var lastTapSide = -1;  // 0=left, 1=right, alternation required
  var tapCombo = 0;
  var comboTimer = 0;
  var COMBO_WINDOW = 0.6;

  var playerWins = 0;
  var enemyWins = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.power;
  var particles = [];
  var roundAnim = 0;
  var roundResult = '';

  function resetRound() {
    playerX = CX - 100;
    enemyX = CX + 100;
    playerPower = 0;
    enemyPower = 0;
    velocity = 0;
    lastTapSide = -1;
    tapCombo = 0;
    comboTimer = 0;
  }

  function checkOut() {
    var changed = false;
    if (playerX < CX - RING_R + 50) {
      enemyWins++;
      flashCol = C.wrong;
      flashAnim = 0.8;
      roundResult = '負け！';
      game.audio.play('se_failure', 0.6);
      changed = true;
    } else if (enemyX > CX + RING_R - 50) {
      playerWins++;
      flashCol = C.power;
      flashAnim = 0.8;
      roundResult = '勝ち！';
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random()*Math.PI*2;
        particles.push({ x:enemyX, y:CY, vx:Math.cos(ang)*200, vy:Math.sin(ang)*200, life:0.7, col:C.ringHi });
      }
      changed = true;
    }
    if (changed) {
      roundAnim = 1.0;
      if (playerWins >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(playerWins * 600 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
      if (enemyWins >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      setTimeout(function() { resetRound(); roundAnim = 0; }, 1000);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    var side = tx < W/2 ? 0 : 1;

    // Must alternate sides
    if (side === lastTapSide) {
      tapCombo = Math.max(0, tapCombo - 1);
    } else {
      tapCombo++;
      lastTapSide = side;
      comboTimer = COMBO_WINDOW;
    }

    var power = 1 + tapCombo * 0.3;
    playerPower += power * 15;
    game.audio.play('se_tap', 0.2 + Math.min(0.4, tapCombo * 0.05));

    // Push effect
    velocity += power * 25;
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (roundAnim > 0) roundAnim -= dt * 1.5;

    comboTimer -= dt;
    if (comboTimer <= 0) {
      tapCombo = Math.max(0, tapCombo - 1);
    }

    // Enemy AI — pushes back with increasing difficulty
    var aiSpeed = 20 + elapsed * 0.3;
    var aiPush = aiSpeed * dt;
    enemyPower += aiPush;
    velocity -= aiPush * (1 + (playerX - (CX - 100)) / 300);  // pushes harder when player is at edge

    // Decay velocity toward center contest
    velocity *= (1 - dt * 2.5);

    // Apply to positions
    var pushDist = velocity * dt;
    playerX += pushDist;
    enemyX += pushDist;

    // Keep relative distance
    var dist = enemyX - playerX;
    if (dist < 160) {
      var overlap = (160 - dist) / 2;
      playerX -= overlap;
      enemyX += overlap;
    }

    checkOut();

    // Power decay
    playerPower *= (1 - dt * 1.5);
    enemyPower *= (1 - dt * 1.5);

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ring
    game.draw.circle(CX, CY, RING_R + 24, C.ringLo, 0.9);
    game.draw.circle(CX, CY, RING_R, C.ring, 0.7);
    game.draw.circle(CX, CY, RING_R - 20, C.clay, 0.5);
    // Ring lines
    for (var rl = 0; rl < 8; rl++) {
      var ra = rl * Math.PI / 4;
      game.draw.line(CX, CY, CX + Math.cos(ra)*RING_R, CY + Math.sin(ra)*RING_R, C.ringLo, 3);
    }

    // Center line
    game.draw.line(CX, CY - RING_R, CX, CY + RING_R, C.ringLo, 4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Wrestlers
    // Enemy (red)
    var eSize = 60 + Math.sin(elapsed * 3) * 4;
    game.draw.circle(enemyX, CY, eSize + 10, C.enemyHi, 0.1);
    game.draw.circle(enemyX, CY, eSize, C.enemy, 0.9);
    game.draw.circle(enemyX, CY - 30, 32, C.enemy, 0.8);
    game.draw.rect(enemyX - 24, CY - 10, 48, 14, C.beltE, 0.9);

    // Player (blue)
    var pSize = 60 + (playerPower * 0.1);
    game.draw.circle(playerX, CY, pSize + 10, C.playerHi, 0.1);
    game.draw.circle(playerX, CY, pSize, C.player, 0.9);
    game.draw.circle(playerX, CY - 30, 32, C.player, 0.8);
    game.draw.rect(playerX - 24, CY - 10, 48, 14, C.belt, 0.9);

    // Power bar
    var pRatio = Math.min(1, playerPower / 200);
    game.draw.rect(60, H*0.79, W/2 - 80, 24, '#0a1020', 0.8);
    game.draw.rect(60, H*0.79, (W/2 - 80) * pRatio, 24, C.power, 0.85);
    game.draw.text('パワー', W/4 + 10, H*0.79 - 24, { size: 36, color: C.power });

    // Tap hint
    if (tapCombo === 0) {
      game.draw.text('← → 交互タップ', W/2, H*0.82, { size: 36, color: C.ui });
    } else {
      game.draw.text('コンボ x' + tapCombo, W/2, H*0.82, { size: 40, color: C.power, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (roundAnim > 0 && roundResult) {
      game.draw.text(roundResult, W/2, H/2 - 80, { size: 80, color: flashCol, bold: true });
    }

    // Score
    game.draw.text(playerWins + ' - ' + enemyWins, W/2, 148, { size: 64, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ring : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    resetRound();
  });
})(game);
