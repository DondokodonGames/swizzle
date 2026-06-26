// 584-spike-dodge.js
// スパイクドッジ — 上下から迫るスパイクをスワイプで左右に回避
// 操作: 左右スワイプで移動、スパイクの隙間を抜ける
// 成功: 30秒生存  失敗: スパイクに3回刺さる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08030a',
    spike:   '#cc2244',
    spikeHi: '#ff4466',
    player:  '#22aaff',
    playerHi:'#88ddff',
    trail:   '#22aaff33',
    safe:    '#22c55e',
    danger:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#334466'
  };

  var LANES = 5;
  var LANE_W = W / LANES;
  var playerLane = 2;
  var playerX = W / 2;
  var playerY = H / 2;
  var PLAYER_R = 36;
  var spikes = [];
  var hits = 0;
  var MAX_HITS = 3;
  var SURVIVE_TIME = 30;
  var done = false;
  var timeLeft = SURVIVE_TIME;
  var elapsed = 0;
  var particles = [];
  var trail = [];
  var nextSpike = 1.0;
  var hitFlash = 0;
  var invincible = 0;
  var difficulty = 1;

  function laneX(lane) { return (lane + 0.5) * LANE_W; }

  function spawnSpikePair() {
    var lane = Math.floor(Math.random() * LANES);
    // Top spike
    spikes.push({ lane: lane, y: -80, vy: 280 + difficulty * 40, fromTop: true, r: 28 });
    // Sometimes also bottom spike in different lane
    if (Math.random() < 0.5) {
      var lane2 = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
      spikes.push({ lane: lane2, y: H + 80, vy: -(280 + difficulty * 40), fromTop: false, r: 28 });
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (dir === 'left') {
      playerLane = Math.max(0, playerLane - 1);
      game.audio.play('se_tap', 0.2);
    } else if (dir === 'right') {
      playerLane = Math.min(LANES - 1, playerLane + 1);
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    var newLane = Math.floor(tx / LANE_W);
    playerLane = Math.max(0, Math.min(LANES - 1, newLane));
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      difficulty = 1 + elapsed / 10;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(elapsed) * 200 + (MAX_HITS - hits) * 500); }, 700);
        return;
      }
    }
    if (hitFlash > 0) hitFlash -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Move player toward lane
    var targetX = laneX(playerLane);
    playerX += (targetX - playerX) * Math.min(1, dt * 12);

    // Spawn spikes
    nextSpike -= dt;
    if (nextSpike <= 0 && !done) {
      spawnSpikePair();
      nextSpike = Math.max(0.35, 1.0 - elapsed * 0.012);
    }

    // Trail
    trail.push({ x: playerX, y: playerY, life: 0.2 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 4;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Update spikes
    for (var si = spikes.length - 1; si >= 0; si--) {
      var sp = spikes[si];
      sp.y += sp.vy * dt;

      // Hit check
      if (invincible <= 0) {
        var spX = laneX(sp.lane);
        var dx = Math.abs(playerX - spX);
        var dy = Math.abs(playerY - sp.y);
        if (dx < sp.r + PLAYER_R * 0.7 && dy < sp.r + PLAYER_R * 0.7) {
          hits++;
          invincible = 1.2;
          hitFlash = 0.5;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.spikeHi });
          }
          spikes.splice(si, 1);
          if (hits >= MAX_HITS && !done) {
            done = true;
            game.audio.play('se_failure', 0.7);
            setTimeout(function() { game.end.failure(); }, 600);
          }
          continue;
        }
      }

      // Remove if off screen
      if ((sp.fromTop && sp.y > H + 100) || (!sp.fromTop && sp.y < -100)) {
        spikes.splice(si, 1);
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

    // Lane lines
    for (var li = 0; li <= LANES; li++) {
      game.draw.line(li * LANE_W, 0, li * LANE_W, H, '#1a0a20', 1);
    }

    // Lane highlight for player
    game.draw.rect(playerLane * LANE_W + 2, 0, LANE_W - 4, H, C.player, 0.04);

    // Spikes
    for (var si2 = 0; si2 < spikes.length; si2++) {
      var sp2 = spikes[si2];
      var spX2 = laneX(sp2.lane);
      var spY2 = sp2.y;
      var sDir = sp2.fromTop ? 1 : -1;
      var tipY = spY2 + sDir * sp2.r * 2;
      var baseY = spY2 - sDir * sp2.r;

      // Warning zone
      var warnY = sp2.fromTop ? 0 : H;
      game.draw.rect(sp2.lane * LANE_W + 6, Math.min(spY2, warnY), LANE_W - 12, Math.abs(spY2 - warnY), C.spike, 0.08);

      // Spike body
      game.draw.circle(spX2, spY2, sp2.r, C.spike, 0.9);
      game.draw.circle(spX2, spY2, sp2.r * 0.6, C.spikeHi, 0.5);
      // Tip
      game.draw.circle(spX2, tipY, 10, C.spikeHi, 0.9);
      // Shaft
      game.draw.line(spX2, spY2, spX2, tipY, C.spike, 8);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var tp = trail[ti2];
      game.draw.circle(tp.x, tp.y, PLAYER_R * 0.6 * (tp.life / 0.2), C.trail, tp.life * 0.4);
    }

    // Player
    var pCol = hitFlash > 0 ? C.danger : C.player;
    game.draw.circle(playerX + 4, playerY + 4, PLAYER_R, '#000', 0.2);
    game.draw.circle(playerX, playerY, PLAYER_R, pCol, 0.9 - (invincible > 0 && Math.floor(elapsed * 8) % 2 === 0 ? 0.5 : 0));
    game.draw.circle(playerX - 10, playerY - 10, PLAYER_R * 0.35, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.12);

    // Lives
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 60 + hi * 120, H * 0.955, 24, hi < hits ? C.danger : C.safe, 0.9);
    }

    var ratio = Math.max(0, timeLeft / SURVIVE_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('生存中...', W / 2, 80, { size: 36, color: ratio > 0.3 ? C.safe : C.danger });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    playerY = H / 2;
  });
})(game);
