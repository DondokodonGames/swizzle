// 562-sumo-push.js
// スモウプッシュ — 土俵でスワイプして相手を押し出す
// 操作: スワイプで力士を押し込む方向を決める
// 成功: 5回相手を土俵外へ  失敗: 5回自分が出る or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#1a1208',
    sand:     '#e8c87a',
    sandHi:   '#f0d890',
    dohyo:    '#d4a030',
    dohyoLine:'#8b6020',
    player:   '#2266ff',
    playerHi: '#66aaff',
    enemy:    '#ff4422',
    enemyHi:  '#ffaa88',
    win:      '#22c55e',
    lose:     '#ef4444',
    text:     '#1a1208',
    textHi:   '#f1f5f9',
    ui:       '#374151'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var RING_R = 260;
  var PLAYER_R = 56;

  var player = { x: CX - 80, y: CY, vx: 0, vy: 0 };
  var enemy = { x: CX + 80, y: CY, vx: 0, vy: 0 };
  var playerWins = 0, playerLosses = 0;
  var NEEDED = 5;
  var MAX_LOSS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.win;
  var roundResult = '';
  var roundResultTimer = 0;
  var roundState = 'fighting'; // 'fighting' | 'result'
  var waitTimer = 0;
  var enemyAI = { timer: 0 };

  function resetRound() {
    player.x = CX - 80; player.y = CY; player.vx = 0; player.vy = 0;
    enemy.x = CX + 80; enemy.y = CY; enemy.vx = 0; enemy.vy = 0;
    roundState = 'fighting';
    enemyAI.timer = 0.3;
  }

  game.onSwipe(function(dir) {
    if (done || roundState !== 'fighting') return;
    var PUSH = 800;
    if (dir === 'up')    player.vy -= PUSH;
    if (dir === 'down')  player.vy += PUSH;
    if (dir === 'left')  player.vx -= PUSH;
    if (dir === 'right') player.vx += PUSH;
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (done || roundState !== 'fighting') return;
    var dx = tx - player.x, dy = ty - player.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      player.vx += (dx / len) * 600;
      player.vy += (dy / len) * 600;
    }
    game.audio.play('se_tap', 0.2);
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
    if (roundResultTimer > 0) roundResultTimer -= dt;

    if (roundState === 'result') {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) resetRound();
      return;
    }

    // Enemy AI
    enemyAI.timer -= dt;
    if (enemyAI.timer <= 0) {
      enemyAI.timer = 0.3 + Math.random() * 0.4;
      // Push toward player or away from edge
      var dx2 = player.x - enemy.x, dy2 = player.y - enemy.y;
      var len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      var edgePush = Math.sqrt((enemy.x - CX) * (enemy.x - CX) + (enemy.y - CY) * (enemy.y - CY));
      if (edgePush > RING_R * 0.7) {
        // Move toward center
        var toCX = CX - enemy.x, toCY = CY - enemy.y;
        var tcLen = Math.sqrt(toCX * toCX + toCY * toCY);
        enemy.vx += (toCX / tcLen) * 500;
        enemy.vy += (toCY / tcLen) * 500;
      } else if (len2 > 0) {
        enemy.vx += (dx2 / len2) * 600;
        enemy.vy += (dy2 / len2) * 600;
      }
    }

    // Physics
    var updateChar = function(ch) {
      ch.x += ch.vx * dt;
      ch.y += ch.vy * dt;
      ch.vx *= Math.pow(0.15, dt);
      ch.vy *= Math.pow(0.15, dt);
    };
    updateChar(player);
    updateChar(enemy);

    // Collision between player and enemy
    var dx3 = player.x - enemy.x, dy3 = player.y - enemy.y;
    var dist = Math.sqrt(dx3 * dx3 + dy3 * dy3);
    var minDist = PLAYER_R * 2;
    if (dist < minDist && dist > 0) {
      var push = (minDist - dist) / 2;
      var nx = dx3 / dist, ny = dy3 / dist;
      player.x += nx * push; player.y += ny * push;
      enemy.x -= nx * push; enemy.y -= ny * push;
      // Transfer momentum
      var relVX = player.vx - enemy.vx, relVY = player.vy - enemy.vy;
      var relN = relVX * nx + relVY * ny;
      if (relN < 0) {
        player.vx -= relN * nx * 0.8;
        player.vy -= relN * ny * 0.8;
        enemy.vx += relN * nx * 0.8;
        enemy.vy += relN * ny * 0.8;
      }
    }

    // Check ring out
    var checkOut = function(ch) {
      var dx4 = ch.x - CX, dy4 = ch.y - CY;
      return Math.sqrt(dx4 * dx4 + dy4 * dy4) > RING_R + PLAYER_R * 0.5;
    };

    if (checkOut(player)) {
      playerLosses++;
      roundResult = '負け';
      flashCol = C.lose;
      flashAnim = 0.5;
      roundResultTimer = 1.2;
      game.audio.play('se_failure', 0.6);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.playerHi });
      }
      roundState = 'result'; waitTimer = 1.3;
      if (playerLosses >= MAX_LOSS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    } else if (checkOut(enemy)) {
      playerWins++;
      roundResult = '勝ち!';
      flashCol = C.win;
      flashAnim = 0.5;
      roundResultTimer = 1.2;
      game.audio.play('se_success', 0.8);
      for (var pi2 = 0; pi2 < 12; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(ang2) * 220, vy: Math.sin(ang2) * 220, life: 0.5, col: C.enemyHi });
      }
      roundState = 'result'; waitTimer = 1.3;
      if (playerWins >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(playerWins * 600 + Math.ceil(timeLeft) * 100); }, 700);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Dohyo (ring)
    game.draw.circle(CX, CY, RING_R + 30, C.dohyoLine, 0.9);
    game.draw.circle(CX, CY, RING_R, C.sand, 0.95);
    game.draw.circle(CX, CY, RING_R - 16, C.sandHi, 0.3);
    // Ring border
    for (var ri = 0; ri < 24; ri++) {
      var ra = ri / 24 * Math.PI * 2;
      game.draw.circle(CX + Math.cos(ra) * RING_R, CY + Math.sin(ra) * RING_R, 12, C.dohyoLine, 0.8);
    }
    // Center line
    game.draw.line(CX - 60, CY, CX + 60, CY, C.dohyoLine, 8);

    // Fighters
    game.draw.circle(enemy.x + 6, enemy.y + 6, PLAYER_R, '#661100', 0.3);
    game.draw.circle(enemy.x, enemy.y, PLAYER_R, C.enemy, 0.9);
    game.draw.circle(enemy.x - 14, enemy.y - 16, 18, C.enemyHi, 0.5);
    game.draw.text('敵', enemy.x, enemy.y + 14, { size: 36, color: '#fff', bold: true });

    game.draw.circle(player.x + 6, player.y + 6, PLAYER_R, '#001144', 0.3);
    game.draw.circle(player.x, player.y, PLAYER_R, C.player, 0.9);
    game.draw.circle(player.x - 14, player.y - 16, 18, C.playerHi, 0.5);
    game.draw.text('P', player.x, player.y + 14, { size: 36, color: '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    if (roundResultTimer > 0) {
      game.draw.text(roundResult, W / 2, CY + RING_R + 80, { size: 80, color: flashCol, bold: true });
    }

    // Score
    game.draw.text('勝: ' + playerWins + ' / ' + NEEDED, W / 2, 148, { size: 56, color: C.textHi, bold: true });
    game.draw.text('負: ' + playerLosses + ' / ' + MAX_LOSS, W / 2, 210, { size: 42, color: playerLosses > 0 ? C.lose : C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dohyo : C.lose);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    resetRound();
  });
})(game);
