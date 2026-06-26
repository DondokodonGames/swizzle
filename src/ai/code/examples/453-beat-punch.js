// 453-beat-punch.js
// ビートパンチ — リズムに合わせてパンチを打ち込む格闘ゲーム
// 操作: タップでパンチ（タイミングが合うと大ダメージ）
// 成功: 相手のHPを0に  失敗: 自分のHPが0 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#100020',
    arena:  '#1a0035',
    arenaHi:'#2d004f',
    player: '#3b82f6',
    playerHi:'#93c5fd',
    enemy:  '#ef4444',
    enemyHi:'#fca5a5',
    beat:   '#fbbf24',
    beatHi: '#fef08a',
    hit:    '#fff',
    hpGood: '#22c55e',
    hpLow:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var BEAT_INTERVAL = 0.55;
  var beatTimer = 0;
  var beatCount = 0;
  var beatAnim = 0;

  var playerHP = 100;
  var enemyHP = 100;
  var lastTapBeat = -5;
  var punchAnim = 0;
  var enemyPunchAnim = 0;
  var hitFeedback = '';
  var hitTimer = 0;
  var hitCol = C.beat;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.player;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // How close to beat?
    var beatPhase = beatTimer / BEAT_INTERVAL;
    var distToBeat = Math.min(beatPhase, 1 - beatPhase);
    punchAnim = 0.3;

    var damage = 0;
    if (distToBeat < 0.1) {
      damage = 25;
      hitFeedback = 'PERFECT!';
      hitCol = C.beatHi;
      flashCol = C.beat;
    } else if (distToBeat < 0.2) {
      damage = 15;
      hitFeedback = 'GOOD!';
      hitCol = C.hpGood;
      flashCol = C.hpGood;
    } else {
      damage = 5;
      hitFeedback = 'miss...';
      hitCol = C.ui;
      flashCol = C.ui;
    }
    enemyHP = Math.max(0, enemyHP - damage);
    hitTimer = 0.5;
    flashAnim = 0.3;
    game.audio.play('se_tap', 0.4 + damage/50);

    for (var pi = 0; pi < Math.floor(damage/5); pi++) {
      var ang = (Math.random() - 0.5) * Math.PI + Math.PI;
      particles.push({ x: W * 0.7, y: H * 0.4, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.4, col: C.enemyHi });
    }

    if (enemyHP <= 0 && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(Math.ceil(playerHP) * 500 + Math.ceil(timeLeft) * 80); }, 700);
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
    if (hitTimer > 0) hitTimer -= dt;
    if (punchAnim > 0) punchAnim -= dt * 4;
    if (enemyPunchAnim > 0) enemyPunchAnim -= dt * 4;
    if (beatAnim > 0) beatAnim -= dt * 6;

    // Beat
    beatTimer += dt;
    if (beatTimer >= BEAT_INTERVAL) {
      beatTimer -= BEAT_INTERVAL;
      beatCount++;
      beatAnim = 0.5;

      // Enemy attacks on every 3rd beat
      if (beatCount % 3 === 0 && !done) {
        enemyPunchAnim = 0.4;
        var eDamage = 8 + Math.random() * 7;
        playerHP = Math.max(0, playerHP - eDamage);
        game.audio.play('se_failure', 0.3);
        for (var pi2 = 0; pi2 < 5; pi2++) {
          var ang2 = (Math.random() - 0.5) * Math.PI;
          particles.push({ x: W * 0.3, y: H * 0.4, vx: Math.cos(ang2)*180, vy: Math.sin(ang2)*180, life: 0.4, col: C.playerHi });
        }
        if (playerHP <= 0 && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H*0.55, W, H*0.45, C.arena, 0.5);
    game.draw.line(0, H*0.55, W, H*0.55, C.arenaHi, 3);

    // Beat indicator
    var bPhase = beatTimer / BEAT_INTERVAL;
    var bSize = 60 + beatAnim * 40;
    game.draw.circle(W/2, H * 0.75, bSize * 1.3, C.beat, beatAnim * 0.3);
    game.draw.circle(W/2, H * 0.75, bSize, C.beat, 0.2 + bPhase * 0.1);
    // Beat ring expanding
    game.draw.circle(W/2, H * 0.75, 60 + bPhase * 200, C.beatHi, (1 - bPhase) * 0.3);
    game.draw.text('♪', W/2, H * 0.75 + 20, { size: 60, color: C.beat, bold: true });

    // Player fighter (left)
    var px = W * 0.22 + punchAnim * 80;
    var py = H * 0.38;
    game.draw.circle(px, py - 60, 45, C.player, 0.9);
    game.draw.circle(px, py, 35, C.playerHi, 0.5);
    game.draw.circle(px + punchAnim * 60, py - 40, 24, C.playerHi, 0.9);

    // Enemy fighter (right)
    var ex = W * 0.78 - enemyPunchAnim * 80;
    var ey = H * 0.38;
    game.draw.circle(ex, ey - 60, 45, C.enemy, 0.9);
    game.draw.circle(ex, ey, 35, C.enemyHi, 0.5);
    game.draw.circle(ex - enemyPunchAnim * 60, ey - 40, 24, C.enemyHi, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // HP bars
    var barW = W * 0.38;
    var barH2 = 22;
    var barY = H * 0.62;
    // Player HP
    var pRatio = playerHP / 100;
    game.draw.rect(W*0.05, barY, barW, barH2, C.ui, 0.5);
    game.draw.rect(W*0.05, barY, barW * pRatio, barH2, pRatio > 0.3 ? C.hpGood : C.hpLow, 0.9);
    game.draw.text('HP', W*0.05 + barW/2, barY + 16, { size: 24, color: '#fff', bold: true });
    // Enemy HP
    var eRatio = enemyHP / 100;
    game.draw.rect(W*0.57, barY, barW, barH2, C.ui, 0.5);
    game.draw.rect(W*0.57, barY, barW * eRatio, barH2, eRatio > 0.3 ? C.hpGood : C.hpLow, 0.9);
    game.draw.text('Enemy', W*0.57 + barW/2, barY + 16, { size: 24, color: '#fff', bold: true });

    // Hit feedback
    if (hitTimer > 0) {
      game.draw.text(hitFeedback, W/2, H * 0.68, { size: 52, color: hitCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.hpLow);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
