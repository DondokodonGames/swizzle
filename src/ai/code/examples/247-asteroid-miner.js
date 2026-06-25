// 247-asteroid-miner.js
// アステロイドマイナー — 軌道を回る小惑星にタイミングよく採掘ドリルを打ち込む
// 操作: タップで採掘ドリル発射
// 成功: 鉱石を50個採掘  失敗: 外れ5回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02030a',
    star:   '#e2e8f0',
    asteroid:'#64748b',
    astHi:  '#94a3b8',
    ore:    '#f59e0b',
    oreHi:  '#fde68a',
    drill:  '#22c55e',
    drillHi:'#86efac',
    miss:   '#ef4444',
    ui:     '#334155'
  };

  var stars = [];
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 1 });
  }

  var CENTER_X = W / 2;
  var CENTER_Y = H / 2 + 50;

  // Asteroids in orbit
  var asteroids = [];
  var ASTEROID_COUNT = 5;
  for (var ai = 0; ai < ASTEROID_COUNT; ai++) {
    var baseAngle = (ai / ASTEROID_COUNT) * Math.PI * 2;
    var orbitR = 200 + (ai % 3) * 80;
    asteroids.push({
      angle: baseAngle,
      orbitR: orbitR,
      speed: (0.6 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1),
      r: 44 + (ai % 3) * 12,
      ore: 3 + ai,
      maxOre: 3 + ai,
      hit: false,
      hitTimer: 0
    });
  }

  var drills = [];
  var mined = 0;
  var NEEDED = 50;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // Fire drill from center toward tap point
    var dx = tx - CENTER_X;
    var dy = ty - CENTER_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 10) return;
    drills.push({
      x: CENTER_X, y: CENTER_Y,
      vx: (dx / len) * 600,
      vy: (dy / len) * 600,
      life: 0.8,
      hit: false
    });
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Move asteroids
    for (var ai2 = 0; ai2 < asteroids.length; ai2++) {
      var a = asteroids[ai2];
      a.angle += a.speed * dt;
      a.x = CENTER_X + Math.cos(a.angle) * a.orbitR;
      a.y = CENTER_Y + Math.sin(a.angle) * a.orbitR;
      if (a.hitTimer > 0) a.hitTimer -= dt;
    }

    // Move drills
    for (var di = drills.length - 1; di >= 0; di--) {
      var d = drills[di];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;

      var hitSomething = false;
      for (var ai3 = 0; ai3 < asteroids.length; ai3++) {
        var a2 = asteroids[ai3];
        if (a2.ore <= 0) continue;
        var ddx = d.x - a2.x, ddy = d.y - a2.y;
        if (ddx * ddx + ddy * ddy < (a2.r + 8) * (a2.r + 8)) {
          a2.ore--;
          a2.hitTimer = 0.3;
          mined++;
          hitSomething = true;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 5; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: d.x, y: d.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5, col: C.oreHi });
          }
          if (mined >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(mined * 60 + Math.ceil(timeLeft) * 80); }, 400);
          }
          break;
        }
      }

      if (!hitSomething && (d.life <= 0 || d.x < 0 || d.x > W || d.y < 0 || d.y > H)) {
        if (!d.hit && d.life <= 0) {
          misses++;
          game.audio.play('se_failure', 0.3);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        drills.splice(di, 1);
      } else if (hitSomething) {
        d.hit = true;
        drills.splice(di, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      game.draw.circle(stars[si2].x, stars[si2].y, stars[si2].r, C.star, 0.6);
    }

    // Orbit rings
    for (var ai4 = 0; ai4 < asteroids.length; ai4++) {
      var a3 = asteroids[ai4];
      game.draw.circle(CENTER_X, CENTER_Y, a3.orbitR, C.ui, 0.15);
    }

    // Center ship
    game.draw.circle(CENTER_X, CENTER_Y, 18, '#f1f5f9', 0.9);
    game.draw.circle(CENTER_X, CENTER_Y, 8, C.drill, 1);
    game.draw.text('⊕', CENTER_X, CENTER_Y, { size: 28, color: C.drill });

    // Asteroids
    for (var ai5 = 0; ai5 < asteroids.length; ai5++) {
      var a4 = asteroids[ai5];
      var lit = a4.hitTimer > 0;
      var col = a4.ore > 0 ? (lit ? C.astHi : C.asteroid) : C.ui;
      game.draw.circle(a4.x, a4.y, a4.r + 4, C.astHi, 0.15);
      game.draw.circle(a4.x, a4.y, a4.r, col, 0.9);
      if (a4.ore > 0) {
        game.draw.text(a4.ore + '', a4.x, a4.y + 14, { size: 40, color: lit ? '#fff' : C.oreHi, bold: true });
        // Ore dot ring
        var dotR = a4.r - 10;
        for (var oi = 0; oi < Math.min(a4.ore, 6); oi++) {
          var oang = (oi / Math.min(a4.ore, 6)) * Math.PI * 2;
          game.draw.circle(a4.x + Math.cos(oang) * dotR, a4.y + Math.sin(oang) * dotR, 6, C.ore, 0.8);
        }
      }
    }

    // Drills
    for (var di2 = 0; di2 < drills.length; di2++) {
      var dr = drills[di2];
      game.draw.circle(dr.x, dr.y, 8, C.drillHi, 0.9);
      game.draw.line(dr.x, dr.y, dr.x - dr.vx * 0.04, dr.y - dr.vy * 0.04, C.drill, 3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 6 * p.life / 0.5, p.col, p.life);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 26 + mi * 52, H * 0.88, 15, mi < misses ? C.miss : '#050a10');
    }

    game.draw.text(mined + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.drill : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
