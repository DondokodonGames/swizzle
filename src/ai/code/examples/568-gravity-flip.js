// 568-gravity-flip.js
// グラビティフリップ — タップで重力を反転してキャラを上下に誘導する
// 操作: タップで重力の向きを反転
// 成功: 15個のコインを取る  失敗: 5回壁に激突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0d0d1f',
    player:  '#22c55e',
    playerHi:'#86efac',
    coin:    '#f59e0b',
    coinHi:  '#fcd34d',
    wall:    '#6366f1',
    wallHi:  '#a5b4fc',
    spike:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    trail:   '#22c55e44'
  };

  var LANE_X = W * 0.2;
  var LANE_W = W * 0.6;
  var LANE_Y1 = H * 0.15;
  var LANE_Y2 = H * 0.85;
  var PLAYER_R = 36;
  var GRAVITY = 1800;
  var MOVE_SPEED = 400;

  var player = { x: LANE_X + LANE_W / 2, y: H / 2, vy: 0, gravDir: 1 };
  var coins = [];
  var obstacles = [];
  var collected = 0;
  var NEEDED = 15;
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var trailPoints = [];
  var nextCoin = 1.0;
  var nextObs = 2.0;
  var scrollX = 0;
  var scrollSpeed = 280;
  var hitFlash = 0;

  function spawnCoin() {
    var y = LANE_Y1 + PLAYER_R * 2 + Math.random() * (LANE_Y2 - LANE_Y1 - PLAYER_R * 4);
    coins.push({ x: W + 60, y: y, r: 24, taken: false });
  }

  function spawnObstacle() {
    var fromTop = Math.random() < 0.5;
    var obsH = 120 + Math.random() * 200;
    obstacles.push({
      x: W + 60,
      y: fromTop ? LANE_Y1 : LANE_Y2 - obsH,
      w: 50,
      h: obsH
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    player.gravDir *= -1;
    player.vy = player.gravDir * -400; // small impulse on flip
    game.audio.play('se_tap', 0.3);
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
    if (hitFlash > 0) hitFlash -= dt * 4;

    scrollX += scrollSpeed * dt;
    scrollSpeed = Math.min(600, 280 + elapsed * 5);

    // Spawn
    nextCoin -= dt;
    if (nextCoin <= 0) { spawnCoin(); nextCoin = 0.9 + Math.random() * 0.6; }
    nextObs -= dt;
    if (nextObs <= 0) { spawnObstacle(); nextObs = 1.5 + Math.random() * 1.0; }

    // Player physics
    player.vy += GRAVITY * player.gravDir * dt;
    player.vy = Math.max(-1200, Math.min(1200, player.vy));
    player.y += player.vy * dt;

    // Wall collision (top/bottom lanes)
    if (player.y - PLAYER_R < LANE_Y1) {
      player.y = LANE_Y1 + PLAYER_R;
      if (Math.abs(player.vy) > 400) {
        hits++;
        hitFlash = 0.4;
        game.audio.play('se_failure', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.3, col: C.spike });
        }
        if (hits >= MAX_HITS && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      }
      player.vy = 0;
    }
    if (player.y + PLAYER_R > LANE_Y2) {
      player.y = LANE_Y2 - PLAYER_R;
      if (Math.abs(player.vy) > 400) {
        hits++;
        hitFlash = 0.4;
        game.audio.play('se_failure', 0.4);
        if (hits >= MAX_HITS && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      }
      player.vy = 0;
    }

    // Trail
    trailPoints.push({ x: player.x, y: player.y, life: 0.3 });
    for (var ti = trailPoints.length - 1; ti >= 0; ti--) {
      trailPoints[ti].life -= dt * 3;
      if (trailPoints[ti].life <= 0) trailPoints.splice(ti, 1);
    }

    // Coins
    for (var ci = coins.length - 1; ci >= 0; ci--) {
      coins[ci].x -= scrollSpeed * dt;
      var dx = player.x - coins[ci].x, dy = player.y - coins[ci].y;
      if (!coins[ci].taken && Math.sqrt(dx * dx + dy * dy) < PLAYER_R + coins[ci].r) {
        coins[ci].taken = true;
        collected++;
        game.audio.play('se_success', 0.6);
        for (var cpi = 0; cpi < 6; cpi++) {
          var cang = Math.random() * Math.PI * 2;
          particles.push({ x: coins[ci].x, y: coins[ci].y, vx: Math.cos(cang) * 180, vy: Math.sin(cang) * 180, life: 0.4, col: C.coinHi });
        }
        coins.splice(ci, 1);
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(collected * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
        continue;
      }
      if (coins[ci].x < -60) coins.splice(ci, 1);
    }

    // Obstacles
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      obstacles[oi].x -= scrollSpeed * dt;
      var o = obstacles[oi];
      if (player.x + PLAYER_R > o.x && player.x - PLAYER_R < o.x + o.w &&
          player.y + PLAYER_R > o.y && player.y - PLAYER_R < o.y + o.h) {
        hits++;
        hitFlash = 0.4;
        game.audio.play('se_failure', 0.5);
        player.x = o.x - PLAYER_R - 4;
        if (hits >= MAX_HITS && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      }
      if (o.x + o.w < -60) obstacles.splice(oi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane walls
    game.draw.rect(0, 0, W, LANE_Y1, C.wall, 0.9);
    game.draw.rect(0, LANE_Y1, W, 8, C.wallHi, 0.8);
    game.draw.rect(0, LANE_Y2, W, H - LANE_Y2, C.wall, 0.9);
    game.draw.rect(0, LANE_Y2 - 8, W, 8, C.wallHi, 0.8);

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var o2 = obstacles[oi2];
      game.draw.rect(o2.x, o2.y, o2.w, o2.h, C.spike, 0.9);
      game.draw.rect(o2.x + 4, o2.y + 4, o2.w - 8, 12, '#ff9999', 0.4);
    }

    // Coins
    for (var ci2 = 0; ci2 < coins.length; ci2++) {
      var cn = coins[ci2];
      game.draw.circle(cn.x, cn.y, cn.r + 6, C.coin, 0.2 + Math.sin(elapsed * 5 + ci2) * 0.1);
      game.draw.circle(cn.x, cn.y, cn.r, C.coin, 0.9);
      game.draw.circle(cn.x - 6, cn.y - 6, cn.r * 0.3, C.coinHi, 0.5);
    }

    // Trail
    for (var ti2 = 0; ti2 < trailPoints.length; ti2++) {
      var tp = trailPoints[ti2];
      game.draw.circle(tp.x, tp.y, PLAYER_R * 0.5 * tp.life / 0.3, C.trail, tp.life * 0.5);
    }

    // Player
    var pCol = hitFlash > 0 ? C.spike : C.player;
    game.draw.circle(player.x + 4, player.y + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(player.x, player.y, PLAYER_R, pCol, 0.9);
    game.draw.circle(player.x - 10, player.y - 10, PLAYER_R * 0.35, C.playerHi, 0.5);
    // Gravity arrow
    var arrowY = player.gravDir > 0 ? player.y + PLAYER_R + 20 : player.y - PLAYER_R - 20;
    game.draw.text(player.gravDir > 0 ? '▼' : '▲', player.x, arrowY, { size: 30, color: C.playerHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.spike, hitFlash * 0.12);

    // Hits
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 50 + hi * 100, H * 0.955, 20, hi < hits ? C.spike : C.ui, 0.9);
    }

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, LANE_Y1, C.wall, 0.9);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.player : C.spike);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text(collected + ' / ' + NEEDED, W / 2, 80, { size: 44, color: C.coin, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
