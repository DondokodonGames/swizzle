// 204-tower-defense.js
// タワーディフェンス — タップで砲台を設置し迫ってくる敵の波を食い止める
// 操作: タップで砲台を設置（最大5基）
// 成功: 10波しのぐ  失敗: 敵がゴールに5回到達

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    path:    '#0f1a0a',
    pathHi:  '#1a2e10',
    tower:   '#22c55e',
    towerHi: '#86efac',
    bullet:  '#fde68a',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    base:    '#3b82f6',
    ui:      '#334155'
  };

  // Simple path: enemies walk from top to bottom in a zigzag
  var PATH = [
    { x: W * 0.2, y: -40 },
    { x: W * 0.2, y: H * 0.25 },
    { x: W * 0.8, y: H * 0.25 },
    { x: W * 0.8, y: H * 0.55 },
    { x: W * 0.2, y: H * 0.55 },
    { x: W * 0.2, y: H * 0.85 },
    { x: W * 0.8, y: H * 0.85 },
    { x: W * 0.8, y: H + 40 }
  ];

  var towers = [];
  var MAX_TOWERS = 5;
  var bullets = [];
  var enemies = [];
  var particles = [];
  var wave = 0;
  var MAX_WAVES = 10;
  var lives = 5;
  var waveTimer = 0;
  var WAVE_INTERVAL = 5;
  var enemiesLeft = 0;
  var done = false;
  var elapsed = 0;
  var score = 0;

  function spawnWave() {
    wave++;
    var count = 2 + wave * 2;
    for (var i = 0; i < count; i++) {
      setTimeout(function() {
        enemies.push({
          pathIdx: 0,
          x: PATH[0].x,
          y: PATH[0].y,
          hp: 2 + Math.floor(wave / 3),
          maxHp: 2 + Math.floor(wave / 3),
          speed: 90 + wave * 8
        });
      }, i * 400);
      enemiesLeft++;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (towers.length >= MAX_TOWERS) {
      game.audio.play('se_failure', 0.2);
      return;
    }
    // Don't place on path
    var onPath = false;
    for (var pi = 0; pi < PATH.length - 1; pi++) {
      var px = PATH[pi].x, py = PATH[pi].y;
      var nx = PATH[pi + 1].x, ny = PATH[pi + 1].y;
      var dx = nx - px, dy = ny - py;
      var len = Math.sqrt(dx * dx + dy * dy);
      var t = ((tx - px) * dx + (ty - py) * dy) / (len * len);
      t = Math.max(0, Math.min(1, t));
      var cx = px + t * dx, cy = py + t * dy;
      if (Math.sqrt((tx - cx) * (tx - cx) + (ty - cy) * (ty - cy)) < 60) {
        onPath = true; break;
      }
    }
    if (onPath) { game.audio.play('se_failure', 0.2); return; }
    towers.push({ x: tx, y: ty, fireTimer: 0, FIRE_RATE: 1.2, range: 220 });
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;

    // Wave spawning
    if (wave < MAX_WAVES) {
      waveTimer -= dt;
      if (waveTimer <= 0) {
        spawnWave();
        waveTimer = WAVE_INTERVAL;
      }
    }

    // Move enemies
    for (var ei = enemies.length - 1; ei >= 0; ei--) {
      var e = enemies[ei];
      var target = PATH[Math.min(e.pathIdx + 1, PATH.length - 1)];
      var dx = target.x - e.x, dy = target.y - e.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) {
        e.pathIdx++;
        if (e.pathIdx >= PATH.length - 1) {
          // Reached goal
          lives--;
          enemies.splice(ei, 1);
          enemiesLeft--;
          game.audio.play('se_failure', 0.4);
          if (lives <= 0 && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
          continue;
        }
      } else {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }
    }

    // Tower fire
    for (var ti = 0; ti < towers.length; ti++) {
      var t = towers[ti];
      t.fireTimer -= dt;
      if (t.fireTimer <= 0 && enemies.length > 0) {
        // Find nearest enemy in range
        var nearest = null, nearDist = t.range;
        for (var ei2 = 0; ei2 < enemies.length; ei2++) {
          var dx2 = enemies[ei2].x - t.x, dy2 = enemies[ei2].y - t.y;
          var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d2 < nearDist) { nearest = enemies[ei2]; nearDist = d2; }
        }
        if (nearest) {
          var dx3 = nearest.x - t.x, dy3 = nearest.y - t.y;
          var d3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
          bullets.push({ x: t.x, y: t.y, vx: (dx3 / d3) * 600, vy: (dy3 / d3) * 600, life: 0.6 });
          t.fireTimer = t.FIRE_RATE;
          game.audio.play('se_tap', 0.2);
        }
      }
    }

    // Move bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { bullets.splice(bi, 1); continue; }
      // Hit enemies
      var hit = false;
      for (var ei3 = enemies.length - 1; ei3 >= 0; ei3--) {
        var dx4 = b.x - enemies[ei3].x, dy4 = b.y - enemies[ei3].y;
        if (Math.sqrt(dx4 * dx4 + dy4 * dy4) < 36) {
          enemies[ei3].hp--;
          if (enemies[ei3].hp <= 0) {
            score += 50;
            for (var pp = 0; pp < 5; pp++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: enemies[ei3].x, y: enemies[ei3].y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.4 });
            }
            enemies.splice(ei3, 1);
            enemiesLeft--;
            if (wave >= MAX_WAVES && enemies.length === 0 && enemiesLeft <= 0 && !done) {
              done = true;
              game.audio.play('se_success');
              setTimeout(function() { game.end.success(score + lives * 200); }, 400);
            }
          }
          bullets.splice(bi, 1);
          hit = true;
          break;
        }
      }
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Path
    for (var pi3 = 0; pi3 < PATH.length - 1; pi3++) {
      game.draw.line(PATH[pi3].x, PATH[pi3].y, PATH[pi3 + 1].x, PATH[pi3 + 1].y, C.path, 80);
      game.draw.line(PATH[pi3].x, PATH[pi3].y, PATH[pi3 + 1].x, PATH[pi3 + 1].y, C.pathHi, 4);
    }

    // Goal base
    game.draw.circle(PATH[PATH.length - 1].x, H - 10, 50, C.base, 0.8);

    // Towers
    for (var ti2 = 0; ti2 < towers.length; ti2++) {
      var t2 = towers[ti2];
      game.draw.circle(t2.x, t2.y, t2.range, '#22c55e', 0.04);
      game.draw.circle(t2.x, t2.y, 36, C.towerHi, 0.2);
      game.draw.circle(t2.x, t2.y, 28, C.tower, 0.9);
      game.draw.circle(t2.x, t2.y, 10, '#fff', 0.6);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, 10, C.bullet, 0.9);
    }

    // Enemies
    for (var ei4 = 0; ei4 < enemies.length; ei4++) {
      var e2 = enemies[ei4];
      var hpRatio = e2.hp / e2.maxHp;
      game.draw.circle(e2.x, e2.y, 30, C.enemyHi, 0.2);
      game.draw.circle(e2.x, e2.y, 26, C.enemy, 0.85);
      // HP bar
      game.draw.rect(e2.x - 24, e2.y - 40, 48, 8, '#1a1a1a', 0.8);
      game.draw.rect(e2.x - 24, e2.y - 40, 48 * hpRatio, 8, hpRatio > 0.5 ? '#22c55e' : '#ef4444');
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var part = particles[pp2];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.enemy, part.life);
    }

    // UI
    game.draw.text('波: ' + wave + '/' + MAX_WAVES, W * 0.25, 148, { size: 44, color: '#f1f5f9', bold: true });
    game.draw.text('砲台: ' + towers.length + '/' + MAX_TOWERS, W * 0.75, 148, { size: 44, color: C.towerHi, bold: true });
    for (var li = 0; li < 5; li++) {
      game.draw.circle(W / 2 - 96 + li * 48, 200, 16, li < lives ? C.base : '#1a1a2e');
    }

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * (wave / MAX_WAVES), 72, C.tower);
    game.draw.text(score + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    waveTimer = 1.5; // short delay before first wave
  });
})(game);
