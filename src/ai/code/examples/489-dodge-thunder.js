// 489-dodge-thunder.js
// 雷避け — 空から落ちてくる雷をスワイプ左右で避け続ける
// 操作: 左右スワイプで素早く移動
// 成功: 30秒生き延びる  失敗: 3回被雷 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050008',
    storm:  '#0a0018',
    cloud:  '#1a1830',
    cloudHi:'#2d2a50',
    thunder:'#fbbf24',
    thunderHi:'#fef08a',
    thunderGlo:'#7c3aed',
    player: '#22d3ee',
    playerHi:'#a5f3fc',
    hit:    '#ef4444',
    safe:   '#22c55e',
    text:   '#f1f5f9',
    ui:     '#374151',
    rain:   '#1e40af'
  };

  var player = { x: W / 2, y: H * 0.82, r: 36, targetX: W / 2 };
  var thunderbolts = [];
  var raindrops = [];
  var particles = [];
  var hits = 0;
  var MAX_HITS = 3;
  var survived = 0;
  var GOAL = 30;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var nextBolt = 1.2;
  var flashAnim = 0;
  var invincible = 0;
  var clouds = [];

  // Generate clouds
  for (var ci = 0; ci < 5; ci++) {
    clouds.push({ x: Math.random() * W, y: 80 + Math.random() * 180, r: 80 + Math.random() * 60, vx: (Math.random() - 0.5) * 30 });
  }

  // Generate rain
  for (var ri = 0; ri < 60; ri++) {
    raindrops.push({ x: Math.random() * W, y: Math.random() * H, vy: 600 + Math.random() * 300 });
  }

  function spawnBolt() {
    var x = 100 + Math.random() * (W - 200);
    // Warn for 0.5s then strike
    thunderbolts.push({
      x: x,
      warnY: 80 + Math.random() * 200,
      warnTimer: 0.5 + Math.random() * 0.3,
      striking: false,
      strikeTimer: 0,
      segments: []
    });
  }

  function makeBoltSegments(x, fromY, toY) {
    var segs = [];
    var cx = x;
    var steps = 8;
    var prevX = cx;
    var prevY = fromY;
    for (var i = 0; i <= steps; i++) {
      var ny = fromY + (toY - fromY) * (i / steps);
      var nx = x + (Math.random() - 0.5) * 80 * (1 - i / steps) + (Math.random() - 0.5) * 30;
      segs.push({ x1: prevX, y1: prevY, x2: nx, y2: ny });
      prevX = nx; prevY = ny;
    }
    return segs;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') {
      player.targetX = Math.max(player.r + 40, player.targetX - W * 0.25);
    } else if (dir === 'right') {
      player.targetX = Math.min(W - player.r - 40, player.targetX + W * 0.25);
    }
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    player.targetX = Math.max(player.r + 40, Math.min(W - player.r - 40, tx));
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived += dt;
      if (survived >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(survived) * 200 + (MAX_HITS - hits) * 500); }, 700);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Move player smoothly
    player.x += (player.targetX - player.x) * 8 * dt;

    // Spawn bolts
    nextBolt -= dt;
    if (nextBolt <= 0 && !done) {
      spawnBolt();
      if (survived > 10 && Math.random() < 0.4) spawnBolt();
      nextBolt = 0.6 + Math.random() * 0.9;
    }

    // Move clouds
    for (var ci2 = 0; ci2 < clouds.length; ci2++) {
      clouds[ci2].x += clouds[ci2].vx * dt;
      if (clouds[ci2].x < -100) clouds[ci2].x = W + 100;
      if (clouds[ci2].x > W + 100) clouds[ci2].x = -100;
    }

    // Update thunder
    for (var ti = thunderbolts.length - 1; ti >= 0; ti--) {
      var bolt = thunderbolts[ti];
      if (!bolt.striking) {
        bolt.warnTimer -= dt;
        if (bolt.warnTimer <= 0) {
          bolt.striking = true;
          bolt.strikeTimer = 0.25;
          bolt.segments = makeBoltSegments(bolt.x, bolt.warnY, player.y);
          game.audio.play('se_failure', 0.4);

          // Check hit
          if (invincible <= 0 && Math.abs(bolt.x - player.x) < player.r + 30) {
            hits++;
            flashAnim = 0.8;
            invincible = 1.5;
            game.audio.play('se_failure', 0.7);
            for (var pi = 0; pi < 12; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.thunder });
            }
            if (hits >= MAX_HITS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 600);
            }
          }
        }
      } else {
        bolt.strikeTimer -= dt;
        if (bolt.strikeTimer <= 0) thunderbolts.splice(ti, 1);
      }
    }

    // Rain
    for (var ri2 = 0; ri2 < raindrops.length; ri2++) {
      raindrops[ri2].y += raindrops[ri2].vy * dt;
      if (raindrops[ri2].y > H + 20) raindrops[ri2].y = -20;
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
    game.draw.rect(0, 0, W, H, C.storm, 0.4);

    // Rain
    for (var ri3 = 0; ri3 < raindrops.length; ri3++) {
      var r3 = raindrops[ri3];
      game.draw.line(r3.x, r3.y, r3.x - 3, r3.y + 18, C.rain, 2);
    }

    // Clouds
    for (var ci3 = 0; ci3 < clouds.length; ci3++) {
      var cl = clouds[ci3];
      game.draw.circle(cl.x, cl.y, cl.r, C.cloud, 0.9);
      game.draw.circle(cl.x - cl.r * 0.4, cl.y - cl.r * 0.2, cl.r * 0.7, C.cloud, 0.9);
      game.draw.circle(cl.x + cl.r * 0.35, cl.y + cl.r * 0.1, cl.r * 0.6, C.cloudHi, 0.6);
    }

    // Thunder warnings and strikes
    for (var ti2 = 0; ti2 < thunderbolts.length; ti2++) {
      var bolt2 = thunderbolts[ti2];
      if (!bolt2.striking) {
        // Warning glow
        var warnPulse = Math.sin(elapsed * 20) * 0.3 + 0.7;
        game.draw.line(bolt2.x, bolt2.warnY, bolt2.x, player.y, C.thunderGlo, 8);
        game.draw.circle(bolt2.x, player.y, 50, C.thunderGlo, warnPulse * 0.15);
        game.draw.circle(bolt2.x, bolt2.warnY, 20, C.thunder, warnPulse * 0.7);
      } else {
        // Strike
        for (var si3 = 0; si3 < bolt2.segments.length; si3++) {
          var seg = bolt2.segments[si3];
          game.draw.line(seg.x1, seg.y1, seg.x2, seg.y2, C.thunderHi, 10);
          game.draw.line(seg.x1, seg.y1, seg.x2, seg.y2, '#fff', 4);
        }
        game.draw.circle(bolt2.x, player.y, 60, C.thunder, bolt2.strikeTimer * 2);
      }
    }

    // Player
    var invBlink = invincible > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 1;
    if (invBlink > 0.3) {
      game.draw.circle(player.x, player.y, player.r + 10, C.playerHi, 0.25);
      game.draw.circle(player.x, player.y, player.r, C.player, 0.9);
      game.draw.circle(player.x - player.r * 0.25, player.y - player.r * 0.25, player.r * 0.3, '#fff', 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.thunder, flashAnim * 0.15);

    // Survival bar
    var survRatio = Math.min(1, survived / GOAL);
    game.draw.rect(0, H * 0.9, W * survRatio, 14, C.safe, 0.8);
    game.draw.text(Math.floor(survived) + 's / ' + GOAL + 's', W / 2, H * 0.88, { size: 44, color: C.text, bold: true });

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 60 + hi * 120, H * 0.955, 24, hi < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.thunderGlo : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
