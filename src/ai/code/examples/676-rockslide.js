// 676-rockslide.js
// 落石回避 — 上から降ってくる岩をかわして走り抜けろ
// 操作: タップで左右に移動
// 成功: 60秒生き残る  失敗: 5回被弾

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0603',
    mountain:'#1c1008',
    ground:  '#2d1a09',
    groundHi:'#4a2e0f',
    rock:    '#78350f',
    rockHi:  '#92400e',
    rockShadow:'#451a03',
    player:  '#22c55e',
    playerHi:'#86efac',
    danger:  '#ef4444',
    dust:    '#d97706',
    text:    '#f1f5f9',
    ui:      '#0c0703'
  };

  var PLAYER_Y = H * 0.82;
  var PLAYER_R = 48;
  var playerX = W / 2;
  var targetX = W / 2;
  var LANES = [W * 0.2, W * 0.5, W * 0.8];
  var currentLane = 1;

  var rocks = [];
  var spawnTimer = 0;
  var SPAWN_RATE = 1.1;

  var hits = 0;
  var MAX_HIT = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var shakeFx = 0;
  var iframes = 0; // invincibility frames after hit

  function spawnRock() {
    var lane = Math.floor(Math.random() * 3);
    var size = 36 + Math.random() * 40;
    rocks.push({
      x: LANES[lane] + (Math.random() - 0.5) * 80,
      y: -size,
      r: size,
      speed: 500 + Math.random() * 300 + elapsed * 6
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dir = tx < W / 2 ? -1 : 1;
    currentLane = Math.max(0, Math.min(2, currentLane + dir));
    targetX = LANES[currentLane];
    game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        game.end.success(Math.floor(elapsed * 80) + (MAX_HIT - hits) * 500);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (shakeFx > 0) shakeFx -= dt * 5;
    if (iframes > 0) iframes -= dt;

    playerX += (targetX - playerX) * Math.min(1, dt * 12);

    spawnTimer += dt;
    var rate = Math.max(0.5, SPAWN_RATE - elapsed * 0.012);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      spawnRock();
      if (elapsed > 20 && Math.random() < 0.3) spawnRock();
    }

    for (var i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      r.y += r.speed * dt;

      if (iframes <= 0) {
        var dx = playerX - r.x, dy = PLAYER_Y - r.y;
        if (dx * dx + dy * dy < (PLAYER_R + r.r - 10) * (PLAYER_R + r.r - 10)) {
          hits++;
          iframes = 1.5;
          flashAnim = 0.5;
          shakeFx = 0.3;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: PLAYER_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.dust });
          }
          rocks.splice(i, 1);
          if (hits >= MAX_HIT && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
          continue;
        }
      }

      if (r.y > H + r.r) {
        rocks.splice(i, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var shake = shakeFx > 0 ? (Math.random() - 0.5) * 20 * shakeFx : 0;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.5, C.mountain, 0.6);

    // Mountain silhouette
    game.draw.line(0, H * 0.4, W * 0.3, H * 0.15, C.mountain, 80);
    game.draw.line(W * 0.3, H * 0.15, W * 0.6, H * 0.3, C.mountain, 80);
    game.draw.line(W * 0.6, H * 0.3, W, H * 0.1, C.mountain, 80);

    // Ground
    game.draw.rect(0, PLAYER_Y + PLAYER_R + shake, W, H - (PLAYER_Y + PLAYER_R), C.ground, 0.9);
    game.draw.rect(0, PLAYER_Y + PLAYER_R + shake, W, 12, C.groundHi, 0.7);

    // Lane guides
    for (var li = 0; li < 3; li++) {
      for (var lj = 0; lj < 8; lj++) {
        var ly = (elapsed * 300 + lj * 120) % H;
        game.draw.line(LANES[li], ly + shake, LANES[li], ly + 50 + shake, '#ffffff11', 3);
      }
    }

    // Rocks
    for (var ri = 0; ri < rocks.length; ri++) {
      var rock = rocks[ri];
      var ry2 = rock.y + shake;
      game.draw.circle(rock.x + 8, ry2 + 8, rock.r, C.rockShadow, 0.5);
      game.draw.circle(rock.x, ry2, rock.r, C.rock, 0.9);
      game.draw.circle(rock.x - rock.r * 0.3, ry2 - rock.r * 0.3, rock.r * 0.25, C.rockHi, 0.5);
    }

    // Player
    var playerAlpha = iframes > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 0.9;
    game.draw.circle(playerX + 4, PLAYER_Y + 4 + shake, PLAYER_R, '#000', 0.3);
    game.draw.circle(playerX, PLAYER_Y + shake, PLAYER_R, C.player, playerAlpha);
    game.draw.circle(playerX - PLAYER_R * 0.3, PLAYER_Y - PLAYER_R * 0.3 + shake, PLAYER_R * 0.25, C.playerHi, playerAlpha * 0.5);

    // Direction hints
    game.draw.text('◀', W * 0.12, H * 0.9, { size: 56, color: '#ffffff22' });
    game.draw.text('▶', W * 0.88, H * 0.9, { size: 56, color: '#ffffff22' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.danger, flashAnim * 0.1);

    // Hit indicators
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 52 + hi * 104, H * 0.955, 22, hi < hits ? C.danger : C.ui, 0.9);
    }

    var survivedRatio = elapsed / 60;
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * survivedRatio, 12, C.player);
    game.draw.text(Math.ceil(timeLeft) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('生存時間', W / 2, 80, { size: 28, color: '#ffffff44' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
