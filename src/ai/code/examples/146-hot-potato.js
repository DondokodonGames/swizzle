// 146-hot-potato.js
// 爆弾パス — 爆発する前に爆弾を投げ続けるスリリングなカウントゲーム
// 操作: タップで爆弾を受け取る/投げる
// 成功: 爆弾を20回投げる  失敗: 爆弾を持ったまま爆発 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0608',
    bomb:    '#1f2937',
    bombHi:  '#374151',
    fuse:    '#f59e0b',
    spark:   '#fef08a',
    player:  '#3b82f6',
    playerHi:'#93c5fd',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155',
    smoke:   '#6b7280'
  };

  var BOMB_R = 44;
  var FUSE_MAX = 3.5; // seconds
  var fuse = FUSE_MAX;
  var fuseDecay = 1.0; // multiplier, increases each throw

  // Positions: player at bottom, 3 enemies at top
  var PLAYER = { x: W/2, y: H*0.78, r: 52 };
  var ENEMIES = [
    { x: W*0.2, y: H*0.22, r: 44 },
    { x: W*0.5, y: H*0.18, r: 44 },
    { x: W*0.8, y: H*0.22, r: 44 }
  ];

  var bombX = W/2, bombY = H*0.5;
  var bombHolder = 'none'; // 'player', 0/1/2 (enemy index), 'flying'
  var flyTarget = null, flyFrom = null, flyProgress = 0;
  var FLY_SPEED = 2.2; // per second (0-1)

  var score = 0;
  var needed = 20;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var sparkAngle = 0;

  function startThrow(from, to) {
    flyFrom = {x: from.x, y: from.y};
    flyTarget = {x: to.x, y: to.y, holder: to.holder};
    flyProgress = 0;
    bombHolder = 'flying';
    score++;
    feedbackOk = true;
    feedback = 0.3;
    game.audio.play('se_tap', 0.6);
    // Increase fuse decay
    fuseDecay = 1.0 + score * 0.04;
    if (fuseDecay > 2.5) fuseDecay = 2.5;
    if (score >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(score*30 + Math.ceil(timeLeft)*15); }, 400);
    }
  }

  function enemyThrow() {
    // Enemy with bomb throws to player
    for (var ei = 0; ei < ENEMIES.length; ei++) {
      if (bombHolder === ei) {
        startThrow(ENEMIES[ei], {x: PLAYER.x, y: PLAYER.y, holder: 'player'});
        return;
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || bombHolder === 'flying') return;
    if (bombHolder === 'player') {
      // Find tapped enemy
      for (var ei = 0; ei < ENEMIES.length; ei++) {
        var dx = tx - ENEMIES[ei].x, dy = ty - ENEMIES[ei].y;
        if (Math.sqrt(dx*dx+dy*dy) < ENEMIES[ei].r + 40) {
          startThrow(PLAYER, {x: ENEMIES[ei].x, y: ENEMIES[ei].y, holder: ei});
          fuse = FUSE_MAX * 0.8; // partial reset
          return;
        }
      }
      // Tap anywhere to throw to random enemy
      var rnd = Math.floor(Math.random() * ENEMIES.length);
      startThrow(PLAYER, {x: ENEMIES[rnd].x, y: ENEMIES[rnd].y, holder: rnd});
      fuse = FUSE_MAX * 0.8;
    }
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

    sparkAngle += dt * 8;

    // Update fuse
    if (bombHolder === 'player' || typeof bombHolder === 'number') {
      fuse -= dt * fuseDecay;
      if (fuse <= 0 && !done) {
        fuse = 0;
        done = true;
        // BOOM
        game.audio.play('se_failure');
        for (var pi = 0; pi < 20; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: bombX, y: bombY, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300, life: 0.6, big: true });
        }
        setTimeout(function() { game.end.failure(); }, 800);
      }
    }

    // Fly animation
    if (bombHolder === 'flying') {
      flyProgress += FLY_SPEED * dt;
      if (flyProgress >= 1) {
        flyProgress = 1;
        bombHolder = flyTarget.holder;
        bombX = flyTarget.x;
        bombY = flyTarget.y;
        // If enemy has it, schedule throw back
        if (typeof bombHolder === 'number') {
          var delay = 0.3 + Math.random() * 0.4;
          var captured = bombHolder;
          setTimeout(function() {
            if (bombHolder === captured) enemyThrow();
          }, delay * 1000);
        }
      } else {
        var arc = Math.sin(flyProgress * Math.PI) * -200;
        bombX = flyFrom.x + (flyTarget.x - flyFrom.x) * flyProgress;
        bombY = flyFrom.y + (flyTarget.y - flyFrom.y) * flyProgress + arc;
      }
    } else {
      if (bombHolder === 'player') { bombX = PLAYER.x; bombY = PLAYER.y - BOMB_R - 20; }
      else if (typeof bombHolder === 'number') { bombX = ENEMIES[bombHolder].x; bombY = ENEMIES[bombHolder].y - BOMB_R - 10; }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Player
    var playerCol = bombHolder === 'player' ? C.playerHi : C.player;
    game.draw.circle(PLAYER.x, PLAYER.y, PLAYER.r + 8, playerCol, 0.2);
    game.draw.circle(PLAYER.x, PLAYER.y, PLAYER.r, playerCol, 0.9);
    game.draw.text('🙂', PLAYER.x, PLAYER.y, { size: 52, color: '#fff' });

    // Enemies
    for (var ei2 = 0; ei2 < ENEMIES.length; ei2++) {
      var ec = typeof bombHolder === 'number' && bombHolder === ei2 ? C.enemyHi : C.enemy;
      game.draw.circle(ENEMIES[ei2].x, ENEMIES[ei2].y, ENEMIES[ei2].r + 6, ec, 0.2);
      game.draw.circle(ENEMIES[ei2].x, ENEMIES[ei2].y, ENEMIES[ei2].r, ec, 0.85);
      game.draw.text('😈', ENEMIES[ei2].x, ENEMIES[ei2].y, { size: 44, color: '#fff' });
    }

    // Bomb
    var fuseRatio = fuse / FUSE_MAX;
    var bombDanger = fuseRatio < 0.25;
    game.draw.circle(bombX, bombY, BOMB_R + 8, bombDanger ? C.wrong : C.bombHi, 0.3);
    game.draw.circle(bombX, bombY, BOMB_R, C.bomb, 0.95);
    game.draw.circle(bombX - BOMB_R*0.3, bombY - BOMB_R*0.35, BOMB_R*0.18, '#fff', 0.2);

    // Fuse
    var fuseLen = fuseRatio * 60;
    game.draw.line(bombX, bombY - BOMB_R, bombX + Math.sin(sparkAngle)*16, bombY - BOMB_R - fuseLen, C.fuse, 5);
    // Spark at tip
    var spx = bombX + Math.sin(sparkAngle)*16;
    var spy = bombY - BOMB_R - fuseLen;
    game.draw.circle(spx, spy, 10, C.spark, bombDanger ? 0.9 : 0.6);
    game.draw.circle(spx, spy, 5, '#fff', 0.9);

    // Fuse gauge
    game.draw.rect(W*0.1, H*0.88, W*0.8, 20, '#0a0808');
    game.draw.rect(W*0.1, H*0.88, W*0.8*fuseRatio, 20, bombDanger ? C.wrong : C.fuse, 0.9);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      var s = part.big ? 20 : 8;
      game.draw.circle(part.x, part.y, s*part.life*2, C.fuse, part.life * 0.8);
    }

    // Tap hint
    if (bombHolder === 'player') {
      game.draw.text('敵をタップして投げる！', W/2, H*0.7, { size: 40, color: C.ui });
    }

    // Score
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.player : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    // Player starts with bomb
    bombHolder = 'player';
    fuse = FUSE_MAX;
  });
})(game);
