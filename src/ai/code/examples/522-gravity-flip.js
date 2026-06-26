// 522-gravity-flip.js
// グラビティフリップ — タップで重力反転、天井と床を行き来してコインを集める
// 操作: タップで重力逆転
// 成功: 20コイン収集  失敗: 壁に3回衝突 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020816',
    ceiling: '#0c1a3a',
    floor:   '#0c1a3a',
    player:  '#38bdf8',
    playerHi:'#7dd3fc',
    coin:    '#f59e0b',
    coinHi:  '#fde68a',
    spike:   '#ef4444',
    spikeHi: '#fca5a5',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var PLAYER_X = W * 0.2;
  var PLAYER_R = 36;
  var GRAVITY = 2400;
  var WALL_THICKNESS = 80;

  var player = { y: H / 2, vy: 0, gravDir: 1 };
  var coins = [];
  var spikes = [];
  var collected = 0;
  var NEEDED = 20;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flipAnim = 0;
  var invincible = 0;
  var speed = 320;

  function spawnObjects() {
    // Coins at various y positions
    for (var i = 0; i < 3; i++) {
      var y = WALL_THICKNESS + PLAYER_R + Math.random() * (H - 2 * WALL_THICKNESS - 2 * PLAYER_R);
      coins.push({ x: W + 80 + i * 280, y: y, r: 28, angle: Math.random() * Math.PI * 2, collected: false });
    }
    // Spike pair (top and bottom, leave gap in middle)
    if (Math.random() < 0.4) {
      var gapY = WALL_THICKNESS + 80 + Math.random() * (H - 2 * WALL_THICKNESS - 160 - PLAYER_R * 2);
      var gapH = 200 + PLAYER_R * 2;
      spikes.push({ x: W + 200, topH: gapY - WALL_THICKNESS, bottomY: gapY + gapH, bottomH: H - WALL_THICKNESS - (gapY + gapH) });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    player.gravDir = -player.gravDir;
    player.vy *= 0.3;
    flipAnim = 0.3;
    game.audio.play('se_tap', 0.4);
    for (var pi = 0; pi < 5; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: PLAYER_X, y: player.y, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.3, col: C.playerHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      speed = 320 + collected * 8;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (flipAnim > 0) flipAnim -= dt * 4;
    if (invincible > 0) invincible -= dt;

    // Player physics
    player.vy += GRAVITY * player.gravDir * dt;
    player.y += player.vy * dt;

    // Ceiling/floor collision
    var ceilY = WALL_THICKNESS + PLAYER_R;
    var floorY = H - WALL_THICKNESS - PLAYER_R;
    if (player.y < ceilY) {
      player.y = ceilY;
      player.vy = Math.abs(player.vy) * 0.3;
      if (invincible <= 0) {
        hits++;
        invincible = 1.0;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.4);
        if (hits >= MAX_HITS && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      }
    }
    if (player.y > floorY) {
      player.y = floorY;
      player.vy = -Math.abs(player.vy) * 0.3;
      if (invincible <= 0) {
        hits++;
        invincible = 1.0;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.4);
        if (hits >= MAX_HITS && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      }
    }

    // Move coins
    for (var ci = coins.length - 1; ci >= 0; ci--) {
      coins[ci].x -= speed * dt;
      coins[ci].angle += dt * 3;
      if (coins[ci].x < -60) { coins.splice(ci, 1); continue; }
      // Collect
      var dx = PLAYER_X - coins[ci].x, dy = player.y - coins[ci].y;
      if (Math.sqrt(dx*dx+dy*dy) < PLAYER_R + coins[ci].r) {
        collected++;
        game.audio.play('se_tap', 0.5);
        for (var pi2 = 0; pi2 < 6; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: coins[ci].x, y: coins[ci].y, vx: Math.cos(ang2) * 160, vy: Math.sin(ang2) * 160, life: 0.4, col: C.coin });
        }
        coins.splice(ci, 1);
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(collected * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    // Move spikes
    for (var si = spikes.length - 1; si >= 0; si--) {
      spikes[si].x -= speed * dt;
      if (spikes[si].x < -80) { spikes.splice(si, 1); continue; }
      // Spike collision
      if (invincible <= 0) {
        var sk = spikes[si];
        if (Math.abs(PLAYER_X - sk.x) < PLAYER_R + 20) {
          var inTop = player.y - PLAYER_R < WALL_THICKNESS + sk.topH;
          var inBot = player.y + PLAYER_R > sk.bottomY;
          if (inTop || inBot) {
            hits++;
            invincible = 1.0;
            flashAnim = 0.5;
            game.audio.play('se_failure', 0.5);
            if (hits >= MAX_HITS && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
          }
        }
      }
    }

    // Spawn more
    if ((coins.length === 0 || (coins.length > 0 && coins[coins.length - 1].x < W - 200)) && !done) {
      spawnObjects();
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ceiling and floor
    game.draw.rect(0, 0, W, WALL_THICKNESS, C.ceiling, 0.9);
    game.draw.rect(0, H - WALL_THICKNESS, W, WALL_THICKNESS, C.floor, 0.9);
    // Stripe pattern
    for (var ti = 0; ti < W; ti += 80) {
      game.draw.rect((ti + elapsed * speed * 0.5) % W, 0, 40, WALL_THICKNESS, '#0a2040', 0.5);
      game.draw.rect((ti + elapsed * speed * 0.5) % W, H - WALL_THICKNESS, 40, WALL_THICKNESS, '#0a2040', 0.5);
    }

    // Spikes
    for (var si2 = 0; si2 < spikes.length; si2++) {
      var sk2 = spikes[si2];
      game.draw.rect(sk2.x - 20, WALL_THICKNESS, 40, sk2.topH, C.spike, 0.8);
      game.draw.rect(sk2.x - 20, sk2.bottomY, 40, sk2.bottomH, C.spike, 0.8);
    }

    // Coins
    for (var ci2 = 0; ci2 < coins.length; ci2++) {
      var cn = coins[ci2];
      var scaleX = Math.cos(cn.angle);
      var cw = Math.abs(scaleX) * cn.r;
      game.draw.circle(cn.x, cn.y, cn.r + 4, C.coinHi, 0.2);
      game.draw.rect(cn.x - cw, cn.y - cn.r, cw * 2, cn.r * 2, C.coin, 0.9);
      game.draw.circle(cn.x, cn.y, 10, C.coinHi, 0.8);
    }

    // Player
    var invBlink = invincible > 0 ? Math.sin(elapsed * 20) > 0 ? 0.4 : 0.9 : 0.9;
    var playerScale = 1 + flipAnim * 0.3;
    game.draw.circle(PLAYER_X, player.y, PLAYER_R * playerScale + 8, C.playerHi, invBlink * 0.3);
    game.draw.circle(PLAYER_X, player.y, PLAYER_R * playerScale, C.player, invBlink);
    // Gravity arrow
    var arrowDir = player.gravDir;
    game.draw.line(PLAYER_X, player.y, PLAYER_X, player.y + arrowDir * 28, '#fff', 4);
    game.draw.circle(PLAYER_X, player.y + arrowDir * 30, 8, '#fff', 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.wrong, flashAnim * 0.15);

    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 56 + hi * 112, H * 0.955, 20, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnObjects();
  });
})(game);
