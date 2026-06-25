// 125-glass-cannon.js
// ガラス砲 — 一発で割れる大砲で正確に敵を撃ち抜くハイリスクな一撃必殺感
// 操作: タップで照準位置を指定、もう一度タップで発射
// 成功: 5体撃破  失敗: 当たらずに自壊 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08060c',
    cannon:  '#475569',
    cannonHi:'#94a3b8',
    glass:   '#7dd3fc',
    glassHi: '#bae6fd',
    bullet:  '#facc15',
    bulletHi:'#fef08a',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var CANNON_X = W / 2;
  var CANNON_Y = H * 0.8;
  var CANNON_R = 40;

  var enemies = []; // { x, y, r, alive }
  var ENEMY_R = 52;
  var bullet = null; // { x, y, vx, vy, r }
  var BULLET_R = 20;
  var BULLET_SPEED = 900;

  var aimX = W / 2;
  var aimY = H * 0.3;
  var phase = 'aim'; // 'aim' | 'fire' | 'result'

  var score = 0;
  var needed = 5;
  var timeLeft = 30;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var shards = [];
  var glassHP = 5; // cannon breaks after 5 misses (shots that miss)
  var shotsFired = 0;

  function spawnEnemies() {
    enemies = [];
    var count = 2 + Math.min(score, 4);
    for (var i = 0; i < count; i++) {
      enemies.push({
        x: 100 + Math.random() * (W - 200),
        y: H * 0.15 + Math.random() * H * 0.35,
        r: ENEMY_R,
        alive: true,
        vx: (Math.random() - 0.5) * 80,
        vy: 0
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'aim') {
      aimX = tx; aimY = ty;
      phase = 'fire';
      game.audio.play('se_tap', 0.4);
    } else if (phase === 'fire') {
      // Fire at aim point
      var dx = aimX - CANNON_X;
      var dy = aimY - CANNON_Y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      bullet = {
        x: CANNON_X, y: CANNON_Y,
        vx: (dx/dist) * BULLET_SPEED,
        vy: (dy/dist) * BULLET_SPEED,
        r: BULLET_R
      };
      shotsFired++;
      game.audio.play('se_tap', 0.8);
      phase = 'moving';
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

    // Move enemies
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      e.x += e.vx * dt;
      if (e.x - e.r < 60) { e.x = 60 + e.r; e.vx = Math.abs(e.vx); }
      if (e.x + e.r > W - 60) { e.x = W - 60 - e.r; e.vx = -Math.abs(e.vx); }
    }

    // Move bullet
    if (bullet && phase === 'moving') {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      // Hit enemy?
      var hit = false;
      for (var j = 0; j < enemies.length; j++) {
        var e2 = enemies[j];
        if (!e2.alive) continue;
        var dx = bullet.x - e2.x, dy = bullet.y - e2.y;
        if (Math.sqrt(dx*dx + dy*dy) < bullet.r + e2.r) {
          e2.alive = false;
          hit = true;
          score++;
          feedbackOk = true;
          feedback = 0.4;
          game.audio.play('se_success');
          // Shards
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            shards.push({ x: e2.x, y: e2.y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.5, color: C.enemyHi });
          }
          bullet = null;
          phase = 'aim';
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 15); }, 500);
            return;
          }
          // Respawn if all dead
          var anyAlive = enemies.some(function(e) { return e.alive; });
          if (!anyAlive) spawnEnemies();
          break;
        }
      }

      // Bullet out of bounds (miss)
      if (!hit && (bullet.y < -50 || bullet.x < -50 || bullet.x > W+50 || bullet.y > H+50)) {
        bullet = null;
        glassHP--;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.5);
        // Glass crack shards
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          shards.push({ x: CANNON_X, y: CANNON_Y, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150, life: 0.4, color: C.glass });
        }
        phase = 'aim';
        if (glassHP <= 0 && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
      }
    }

    // Shards
    for (var si = 0; si < shards.length; si++) {
      shards[si].x += shards[si].vx * dt;
      shards[si].y += shards[si].vy * dt;
      shards[si].vy += 400 * dt;
      shards[si].life -= dt;
    }
    shards = shards.filter(function(s) { return s.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Enemies
    for (var ei = 0; ei < enemies.length; ei++) {
      var en = enemies[ei];
      if (!en.alive) continue;
      game.draw.circle(en.x, en.y, en.r + 8, C.enemyHi, 0.2);
      game.draw.circle(en.x, en.y, en.r, C.enemy, 0.8);
      game.draw.circle(en.x - en.r*0.3, en.y - en.r*0.35, en.r*0.25, '#fff', 0.5);
      game.draw.circle(en.x + en.r*0.2, en.y - en.r*0.25, en.r*0.15, '#fff', 0.4);
    }

    // Aim line
    if (phase === 'aim' || phase === 'fire') {
      var dx3 = aimX - CANNON_X, dy3 = aimY - CANNON_Y;
      var dl = Math.sqrt(dx3*dx3+dy3*dy3);
      if (dl > 0) {
        game.draw.line(CANNON_X, CANNON_Y, CANNON_X + (dx3/dl)*800, CANNON_Y + (dy3/dl)*800, '#ffffff', 1);
      }
      game.draw.circle(aimX, aimY, 28, '#fff', 0.3);
      game.draw.circle(aimX, aimY, 12, '#facc15', 0.9);
    }

    // Bullet
    if (bullet) {
      game.draw.circle(bullet.x, bullet.y, bullet.r + 6, C.bulletHi, 0.4);
      game.draw.circle(bullet.x, bullet.y, bullet.r, C.bullet);
    }

    // Shards
    for (var shi = 0; shi < shards.length; shi++) {
      var sh = shards[shi];
      game.draw.circle(sh.x, sh.y, 8 * sh.life * 2, sh.color, sh.life);
    }

    // Cannon
    var glassAlpha = glassHP / 5;
    game.draw.circle(CANNON_X, CANNON_Y, CANNON_R + 8, C.glass, glassAlpha * 0.3);
    game.draw.circle(CANNON_X, CANNON_Y, CANNON_R, C.cannon);
    game.draw.circle(CANNON_X, CANNON_Y, CANNON_R, C.glass, glassAlpha * 0.4);
    game.draw.circle(CANNON_X - 12, CANNON_Y - 12, 16, C.cannonHi, 0.5);
    // Glass HP
    for (var gi = 0; gi < 5; gi++) {
      game.draw.circle(W/2 + (gi-2)*44, H*0.91, 14, gi < glassHP ? C.glass : '#1a0a2a');
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '撃破！' : 'ミス！', W/2, H*0.65, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    var phaseText = phase === 'aim' ? 'タップで照準' : (phase === 'fire' ? 'もう一度で発射！' : '');
    game.draw.text(phaseText, W / 2, H * 0.88, { size: 48, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.glass : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnEnemies();
  });
})(game);
