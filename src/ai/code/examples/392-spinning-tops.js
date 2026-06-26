// 392-spinning-tops.js
// コマ対決 — 回転するコマを弾いて相手を場外へ
// 操作: スワイプでコマを弾く方向と強さを決める
// 成功: 相手コマを5回場外へ  失敗: 自分が5回場外 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0a1e',
    arena:  '#1a1040',
    arenaHi:'#2d1a60',
    ring:   '#6d28d9',
    ringHi: '#8b5cf6',
    player: '#22d3ee',
    playerHi:'#cffafe',
    enemy:  '#f97316',
    enemyHi:'#fed7aa',
    spark:  '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var ARENA_X = W / 2;
  var ARENA_Y = H * 0.48;
  var ARENA_R = 340;

  var player = { x: W/2 - 80, y: H*0.48, vx: 0, vy: 0, spin: 8, r: 44 };
  var enemy  = { x: W/2 + 80, y: H*0.48, vx: 0, vy: 0, spin: 7, r: 44 };

  var playerWins = 0;
  var enemyWins = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var phase = 'ready'; // ready, playing, reset
  var resetTimer = 0;
  var swipeStart = null;

  function resetRound() {
    player.x = W/2 - 80; player.y = H*0.48; player.vx = 0; player.vy = 0; player.spin = 6 + Math.random()*4;
    enemy.x = W/2 + 80;  enemy.y = H*0.48;  enemy.vx = (Math.random()-0.5)*200; enemy.vy = (Math.random()-0.5)*200; enemy.spin = 6 + Math.random()*4;
    phase = 'ready';
  }

  function spawnSparks(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random()*Math.PI*2;
      particles.push({ x:x, y:y, vx:Math.cos(ang)*(150+Math.random()*200), vy:Math.sin(ang)*(150+Math.random()*200), life:0.6, col:col });
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || phase !== 'ready') return;
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx*dx + dy*dy);
    if (len < 20) return;
    var speed = Math.min(len * 2.5, 700);
    player.vx = dx / len * speed;
    player.vy = dy / len * speed;
    phase = 'playing';
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (phase === 'playing') {
      // Move player
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.vx *= (1 - 0.8*dt);
      player.vy *= (1 - 0.8*dt);
      player.spin *= (1 - 0.5*dt);

      // Move enemy (simple AI)
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.vx *= (1 - 0.7*dt);
      enemy.vy *= (1 - 0.7*dt);

      // Collision between tops
      var dx = enemy.x - player.x, dy = enemy.y - player.y;
      var dist = Math.sqrt(dx*dx+dy*dy);
      if (dist < player.r + enemy.r && dist > 0) {
        spawnSparks((player.x+enemy.x)/2, (player.y+enemy.y)/2, C.spark, 8);
        game.audio.play('se_tap', 0.6);
        var nx = dx/dist, ny = dy/dist;
        var relVx = player.vx - enemy.vx, relVy = player.vy - enemy.vy;
        var dot = relVx*nx + relVy*ny;
        if (dot > 0) {
          player.vx -= dot*nx*1.5; player.vy -= dot*ny*1.5;
          enemy.vx += dot*nx*1.5;  enemy.vy += dot*ny*1.5;
        }
        var overlap = (player.r + enemy.r - dist) / 2;
        player.x -= nx*overlap; player.y -= ny*overlap;
        enemy.x  += nx*overlap; enemy.y  += ny*overlap;
      }

      // Check arena bounds
      var pd = Math.sqrt(Math.pow(player.x-ARENA_X,2)+Math.pow(player.y-ARENA_Y,2));
      var ed = Math.sqrt(Math.pow(enemy.x-ARENA_X,2)+Math.pow(enemy.y-ARENA_Y,2));
      if (pd > ARENA_R) {
        enemyWins++;
        spawnSparks(player.x, player.y, C.player, 15);
        game.audio.play('se_failure', 0.5);
        if (enemyWins >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); }
        phase = 'reset'; resetTimer = 1.2;
      } else if (ed > ARENA_R) {
        playerWins++;
        spawnSparks(enemy.x, enemy.y, C.enemy, 15);
        game.audio.play('se_success', 0.5);
        if (playerWins >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(playerWins*400+Math.ceil(timeLeft)*80); }, 500); }
        phase = 'reset'; resetTimer = 1.2;
      }

      // Arena bounce for enemy
      if (ed > ARENA_R - 10 && ed > 0) {
        var enx = (enemy.x-ARENA_X)/ed, eny = (enemy.y-ARENA_Y)/ed;
        var edot = enemy.vx*enx + enemy.vy*eny;
        if (edot > 0) { enemy.vx -= edot*enx*1.8; enemy.vy -= edot*eny*1.8; }
      }
    }

    if (phase === 'reset') {
      resetTimer -= dt;
      if (resetTimer <= 0) resetRound();
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    // Arena
    game.draw.circle(ARENA_X, ARENA_Y, ARENA_R + 16, C.ringHi, 0.15);
    game.draw.circle(ARENA_X, ARENA_Y, ARENA_R, C.arena, 0.95);
    game.draw.circle(ARENA_X, ARENA_Y, ARENA_R, C.ring, 0.0);
    // Ring edge
    for (var ri = 0; ri < 36; ri++) {
      var ra = ri / 36 * Math.PI * 2;
      var rx = ARENA_X + Math.cos(ra)*ARENA_R, ry = ARENA_Y + Math.sin(ra)*ARENA_R;
      game.draw.circle(rx, ry, 8, C.ring, 0.6);
    }
    game.draw.circle(ARENA_X, ARENA_Y, 20, C.ringHi, 0.3);

    // Enemy top
    var eSpin = elapsed * enemy.spin;
    game.draw.circle(enemy.x, enemy.y, enemy.r+6, C.enemyHi, 0.15);
    game.draw.circle(enemy.x, enemy.y, enemy.r, C.enemy, 0.9);
    game.draw.line(enemy.x, enemy.y, enemy.x+Math.cos(eSpin)*enemy.r*0.7, enemy.y+Math.sin(eSpin)*enemy.r*0.7, C.enemyHi, 4);
    game.draw.circle(enemy.x, enemy.y, 10, C.enemyHi, 0.9);

    // Player top
    var pSpin = elapsed * player.spin;
    game.draw.circle(player.x, player.y, player.r+6, C.playerHi, 0.15);
    game.draw.circle(player.x, player.y, player.r, C.player, 0.9);
    game.draw.line(player.x, player.y, player.x+Math.cos(pSpin)*player.r*0.7, player.y+Math.sin(pSpin)*player.r*0.7, C.playerHi, 4);
    game.draw.circle(player.x, player.y, 10, C.playerHi, 0.9);

    if (phase === 'ready') {
      game.draw.text('スワイプで弾く！', W/2, H*0.82, { size: 44, color: C.playerHi });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.9);
    }

    // Score dots
    for (var wi = 0; wi < NEEDED; wi++) {
      var bx = W/2 - (NEEDED-1)*28 + wi*56;
      game.draw.circle(bx, H*0.88, 12, wi < playerWins ? C.player : C.ui, 0.9);
    }
    for (var wi2 = 0; wi2 < NEEDED; wi2++) {
      var bx2 = W/2 - (NEEDED-1)*28 + wi2*56;
      game.draw.circle(bx2, H*0.905, 12, wi2 < enemyWins ? C.enemy : C.ui, 0.9);
    }

    game.draw.text(playerWins + ' vs ' + enemyWins, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.ring : C.enemy);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    resetRound();
  });
})(game);
