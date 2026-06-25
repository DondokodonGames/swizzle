// 245-tower-defense-micro.js
// マイクロタワー — 1本の道を進む敵に砲台を置いてせき止める超ミニタワーディフェンス
// 操作: タップで砲台を設置（3個まで）
// 成功: 20体の敵を全員倒す  失敗: 5体逃がす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060a0c',
    path:   '#1e293b',
    pathHi: '#334155',
    tower:  '#22c55e',
    twrHi:  '#86efac',
    bullet: '#fde68a',
    enemy:  '#ef4444',
    enmHi:  '#fca5a5',
    life:   '#22c55e',
    dead:   '#475569',
    ui:     '#475569'
  };

  // Path waypoints
  var PATH = [
    { x: -60, y: H * 0.25 },
    { x: W * 0.25, y: H * 0.25 },
    { x: W * 0.25, y: H * 0.55 },
    { x: W * 0.75, y: H * 0.55 },
    { x: W * 0.75, y: H * 0.25 },
    { x: W + 60, y: H * 0.25 }
  ];

  var towers = [];
  var MAX_TOWERS = 3;
  var enemies = [];
  var bullets = [];
  var killed = 0;
  var escaped = 0;
  var NEEDED = 20;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.8;
  var spawnedCount = 0;

  function spawnEnemy() {
    enemies.push({
      x: PATH[0].x,
      y: PATH[0].y,
      waypoint: 1,
      speed: 90 + spawnedCount * 2,
      hp: 2 + Math.floor(spawnedCount / 5),
      maxHp: 2 + Math.floor(spawnedCount / 5),
      r: 22
    });
    spawnedCount++;
  }

  function isOnPath(x, y) {
    for (var i = 0; i < PATH.length - 1; i++) {
      var ax = PATH[i].x, ay = PATH[i].y;
      var bx = PATH[i + 1].x, by = PATH[i + 1].y;
      var dx = bx - ax, dy = by - ay;
      var len = Math.sqrt(dx * dx + dy * dy);
      var nx = -dy / len, ny = dx / len;
      var px = x - ax, py = y - ay;
      var dist = Math.abs(px * nx + py * ny);
      if (dist < 60) return true;
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Don't place on path
    if (isOnPath(tx, ty)) return;
    if (towers.length >= MAX_TOWERS) return;
    if (ty < 160 || ty > H - 40) return;
    towers.push({ x: tx, y: ty, range: 200, fireRate: 1.2, fireTimer: 0 });
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn
    if (!done && spawnedCount < 25) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = SPAWN_INTERVAL;
      }
    }

    // Move enemies
    for (var ei = enemies.length - 1; ei >= 0; ei--) {
      var e = enemies[ei];
      if (e.waypoint >= PATH.length) {
        // Escaped
        escaped++;
        enemies.splice(ei, 1);
        game.audio.play('se_failure', 0.3);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
        continue;
      }
      var target = PATH[e.waypoint];
      var dx = target.x - e.x;
      var dy = target.y - e.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) {
        e.waypoint++;
      } else {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }
    }

    // Towers shoot
    for (var ti = 0; ti < towers.length; ti++) {
      var t = towers[ti];
      t.fireTimer -= dt;
      if (t.fireTimer > 0) continue;
      // Find nearest enemy in range
      var nearest = null;
      var nearDist = Infinity;
      for (var ei2 = 0; ei2 < enemies.length; ei2++) {
        var e2 = enemies[ei2];
        var ddx = t.x - e2.x, ddy = t.y - e2.y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < t.range && d < nearDist) { nearDist = d; nearest = e2; }
      }
      if (nearest) {
        var bdx = nearest.x - t.x, bdy = nearest.y - t.y;
        var blen = Math.sqrt(bdx * bdx + bdy * bdy);
        bullets.push({ x: t.x, y: t.y, vx: (bdx / blen) * 400, vy: (bdy / blen) * 400, life: 0.6 });
        t.fireTimer = 1 / t.fireRate;
        game.audio.play('se_tap', 0.15);
      }
    }

    // Move bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      var hit = false;
      for (var ei3 = enemies.length - 1; ei3 >= 0; ei3--) {
        var e3 = enemies[ei3];
        var ddx2 = b.x - e3.x, ddy2 = b.y - e3.y;
        if (ddx2 * ddx2 + ddy2 * ddy2 < (e3.r + 6) * (e3.r + 6)) {
          e3.hp--;
          hit = true;
          if (e3.hp <= 0) {
            killed++;
            enemies.splice(ei3, 1);
            if (killed >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success');
              setTimeout(function() { game.end.success(killed * 80 + Math.ceil(timeLeft) * 60); }, 400);
            }
          }
          break;
        }
      }
      if (hit || b.life <= 0) bullets.splice(bi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw path
    for (var pi = 0; pi < PATH.length - 1; pi++) {
      var ax = PATH[pi].x, ay = PATH[pi].y;
      var bx = PATH[pi + 1].x, by = PATH[pi + 1].y;
      game.draw.line(ax, ay, bx, by, C.path, 100);
      game.draw.line(ax, ay, bx, by, C.pathHi, 4);
    }

    // Towers
    for (var ti2 = 0; ti2 < towers.length; ti2++) {
      var t2 = towers[ti2];
      game.draw.circle(t2.x, t2.y, t2.range, C.twrHi, 0.06);
      game.draw.circle(t2.x, t2.y, 28, C.tower, 0.9);
      game.draw.circle(t2.x, t2.y, 12, '#fff', 0.5);
    }

    // Tower slots indicator
    game.draw.text('砲台: ' + towers.length + '/' + MAX_TOWERS, W * 0.5, H * 0.85, { size: 40, color: C.ui });
    if (towers.length < MAX_TOWERS) {
      game.draw.text('タップで設置', W * 0.5, H * 0.9, { size: 36, color: C.twrHi });
    }

    // Enemies
    for (var ei4 = 0; ei4 < enemies.length; ei4++) {
      var e4 = enemies[ei4];
      game.draw.circle(e4.x, e4.y, e4.r + 4, C.enmHi, 0.2);
      game.draw.circle(e4.x, e4.y, e4.r, C.enemy, 0.9);
      var hpW = e4.r * 2 * (e4.hp / e4.maxHp);
      game.draw.rect(e4.x - e4.r, e4.y - e4.r - 10, e4.r * 2, 6, '#333', 0.8);
      game.draw.rect(e4.x - e4.r, e4.y - e4.r - 10, hpW, 6, C.life, 0.9);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, 7, C.bullet, 0.9);
    }

    // Escaped dots
    for (var esc = 0; esc < MAX_ESCAPE; esc++) {
      game.draw.circle(W * 0.1 + esc * 44, H * 0.96, 14, esc < escaped ? C.enemy : '#111');
    }

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tower : C.enemy);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 1.0;
  });
})(game);
