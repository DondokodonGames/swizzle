// 648-tower-defense.js
// タワーディフェンス — 敵の侵入を止めろ、砲台を配置してウェーブを乗り切れ
// 操作: タップで砲台を配置
// 成功: 5ウェーブ撃退  失敗: 敵が5体突破 or 120秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040801',
    path:    '#1a1205',
    pathHi:  '#2a1c08',
    tower:   '#16a34a',
    towerHi: '#4ade80',
    bullet:  '#fbbf24',
    enemy:   '#dc2626',
    enemyHi: '#fca5a5',
    boss:    '#7c3aed',
    bossHi:  '#c4b5fd',
    base:    '#1d4ed8',
    baseHi:  '#93c5fd',
    text:    '#f1f5f9',
    ui:      '#050a02',
    safe:    '#22c55e'
  };

  // Path: enemies walk down-left zigzag
  var PATH = [
    {x: W * 0.8, y: H * 0.1},
    {x: W * 0.8, y: H * 0.28},
    {x: W * 0.2, y: H * 0.28},
    {x: W * 0.2, y: H * 0.48},
    {x: W * 0.8, y: H * 0.48},
    {x: W * 0.8, y: H * 0.68},
    {x: W * 0.2, y: H * 0.68},
    {x: W * 0.2, y: H * 0.85}
  ];

  var towers = [];
  var enemies = [];
  var bullets = [];
  var particles = [];

  var gold = 80;
  var TOWER_COST = 25;
  var lives = 5;
  var wave = 0;
  var TOTAL_WAVES = 5;
  var waveTimer = 0;
  var WAVE_INTERVAL = 5;
  var waveActive = false;
  var enemiesInWave = 0;
  var enemiesSpawned = 0;
  var spawnTimer = 0;

  var done = false;
  var timeLeft = 120;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.enemy;

  function startWave() {
    wave++;
    waveActive = true;
    enemiesInWave = 3 + wave * 2;
    enemiesSpawned = 0;
    spawnTimer = 0;
    waveTimer = WAVE_INTERVAL;
    game.audio.play('se_failure', 0.15);
  }

  function spawnEnemy() {
    var isBoss = wave >= 3 && enemiesSpawned === enemiesInWave - 1;
    enemies.push({
      pathIdx: 0,
      t: 0,
      x: PATH[0].x,
      y: PATH[0].y,
      speed: isBoss ? 60 : (80 + wave * 10),
      maxHp: isBoss ? (20 + wave * 10) : (3 + wave * 2),
      hp: isBoss ? (20 + wave * 10) : (3 + wave * 2),
      r: isBoss ? 42 : 28,
      isBoss: isBoss,
      reward: isBoss ? 20 : 8
    });
    enemiesSpawned++;
  }

  function placeTower(tx, ty) {
    // Check not on path
    for (var pi = 0; pi < PATH.length - 1; pi++) {
      var a = PATH[pi], b = PATH[pi + 1];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var nx = (tx - a.x) * dx / len + (ty - a.y) * dy / len;
      nx = Math.max(0, Math.min(len, nx));
      var clx = a.x + dx / len * nx, cly = a.y + dy / len * nx;
      if (Math.sqrt((tx - clx) * (tx - clx) + (ty - cly) * (ty - cly)) < 80) return;
    }
    towers.push({ x: tx, y: ty, range: 220, fireRate: 1.5, cooldown: 0, level: 1 });
    gold -= TOWER_COST;
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (gold >= TOWER_COST) {
      placeTower(tx, ty);
    }
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Wave management
    if (!waveActive) {
      waveTimer -= dt;
      if (waveTimer <= 0 && wave < TOTAL_WAVES) startWave();
    }

    // Spawn enemies
    if (waveActive && enemiesSpawned < enemiesInWave) {
      spawnTimer += dt;
      if (spawnTimer >= 1.2) {
        spawnTimer = 0;
        spawnEnemy();
      }
    }

    // Update enemies
    for (var ei = enemies.length - 1; ei >= 0; ei--) {
      var e = enemies[ei];
      var target = PATH[e.pathIdx + 1];
      if (!target) {
        // Reached end — lose a life
        lives--;
        flashCol = C.enemy;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.4);
        enemies.splice(ei, 1);
        if (lives <= 0 && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }
      var dx = target.x - e.x, dy = target.y - e.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 12) {
        e.pathIdx++;
      } else {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }
    }

    // Check wave clear
    if (waveActive && enemiesSpawned >= enemiesInWave && enemies.length === 0) {
      waveActive = false;
      waveTimer = WAVE_INTERVAL;
      gold += 20 + wave * 5;
      game.audio.play('se_success', 0.5);
      if (wave >= TOTAL_WAVES) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(wave * 500 + Math.ceil(timeLeft) * 50 + lives * 300); }, 700);
      }
    }

    // Tower shooting
    for (var ti = 0; ti < towers.length; ti++) {
      var tow = towers[ti];
      tow.cooldown -= dt;
      if (tow.cooldown > 0) continue;
      // Find nearest enemy in range
      var closest = null, closestDist = tow.range;
      for (var ei2 = 0; ei2 < enemies.length; ei2++) {
        var e2 = enemies[ei2];
        var dx2 = e2.x - tow.x, dy2 = e2.y - tow.y;
        var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d2 < closestDist) { closestDist = d2; closest = ei2; }
      }
      if (closest !== null) {
        var target2 = enemies[closest];
        bullets.push({ x: tow.x, y: tow.y, tx: target2.x, ty: target2.y, targetIdx: closest, speed: 700, dmg: 1 });
        tow.cooldown = 1 / tow.fireRate;
      }
    }

    // Update bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      var dx3 = b.tx - b.x, dy3 = b.ty - b.y;
      var d3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
      if (d3 < 20) {
        // Hit
        if (b.targetIdx < enemies.length) {
          var hitEnemy = enemies[b.targetIdx];
          hitEnemy.hp -= b.dmg;
          if (hitEnemy.hp <= 0) {
            gold += hitEnemy.reward;
            for (var p = 0; p < 4; p++) {
              var pa = Math.random() * Math.PI * 2;
              particles.push({ x: hitEnemy.x, y: hitEnemy.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: hitEnemy.isBoss ? C.bossHi : C.enemyHi });
            }
            enemies.splice(b.targetIdx, 1);
          }
        }
        bullets.splice(bi, 1);
        continue;
      }
      b.x += (dx3 / d3) * b.speed * dt;
      b.y += (dy3 / d3) * b.speed * dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Path
    for (var pi2 = 0; pi2 < PATH.length - 1; pi2++) {
      var a2 = PATH[pi2], b2 = PATH[pi2 + 1];
      game.draw.line(a2.x, a2.y, b2.x, b2.y, C.path, 90);
      game.draw.line(a2.x, a2.y, b2.x, b2.y, C.pathHi, 4);
    }

    // Start/end markers
    game.draw.circle(PATH[0].x, PATH[0].y, 32, C.enemy, 0.7);
    game.draw.text('敵', PATH[0].x, PATH[0].y + 12, { size: 32, color: '#fff' });
    game.draw.circle(PATH[PATH.length-1].x, PATH[PATH.length-1].y, 32, C.base, 0.7);
    game.draw.text('基', PATH[PATH.length-1].x, PATH[PATH.length-1].y + 12, { size: 32, color: '#fff' });

    // Tower ranges (subtle)
    for (var ti2 = 0; ti2 < towers.length; ti2++) {
      var t2 = towers[ti2];
      game.draw.circle(t2.x, t2.y, t2.range, C.safe, 0.04);
      game.draw.circle(t2.x + 4, t2.y + 4, 36, '#000', 0.3);
      game.draw.circle(t2.x, t2.y, 36, C.tower, 0.9);
      game.draw.circle(t2.x, t2.y, 24, C.towerHi, 0.6);
      game.draw.line(t2.x, t2.y - 36, t2.x, t2.y - 60, C.towerHi, 8);
    }

    // Enemies
    for (var ei3 = 0; ei3 < enemies.length; ei3++) {
      var e3 = enemies[ei3];
      var hpRatio = e3.hp / e3.maxHp;
      game.draw.circle(e3.x + 4, e3.y + 4, e3.r, '#000', 0.3);
      game.draw.circle(e3.x, e3.y, e3.r, e3.isBoss ? C.boss : C.enemy, 0.9);
      game.draw.circle(e3.x - e3.r * 0.3, e3.y - e3.r * 0.3, e3.r * 0.25, e3.isBoss ? C.bossHi : C.enemyHi, 0.5);
      // HP bar
      game.draw.rect(e3.x - e3.r, e3.y - e3.r - 12, e3.r * 2, 8, '#111', 0.8);
      game.draw.rect(e3.x - e3.r, e3.y - e3.r - 12, e3.r * 2 * hpRatio, 8, hpRatio > 0.5 ? C.safe : C.enemy, 0.9);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      game.draw.circle(bullets[bi2].x, bullets[bi2].y, 10, C.bullet, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // HUD
    game.draw.text('G: ' + gold, 80, 148, { size: 44, color: C.bullet, bold: true });
    game.draw.text('Wave ' + wave + '/' + TOTAL_WAVES, W / 2, 148, { size: 44, color: C.text, bold: true });
    game.draw.text('♥ ' + lives, W - 80, 148, { size: 44, color: C.enemy, bold: true });
    if (!waveActive && wave < TOTAL_WAVES) {
      game.draw.text('次: ' + Math.ceil(waveTimer) + 's', W / 2, 195, { size: 36, color: C.towerHi });
    }
    if (gold < TOWER_COST) {
      game.draw.text('Gold不足', W / 2, H * 0.93, { size: 32, color: C.enemy });
    } else {
      game.draw.text('タップで砲台(' + TOWER_COST + 'G)', W / 2, H * 0.93, { size: 32, color: C.towerHi });
    }

    var ratio = Math.max(0, timeLeft / 120);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.enemy);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    waveTimer = 3;
  });
})(game);
