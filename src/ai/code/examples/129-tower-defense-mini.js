// 129-tower-defense-mini.js
// ミニ防衛 — 限られたタップで敵の波を食い止める瞬間判断のタワーディフェンス
// 操作: タップで砲台を向けて発射（自動的に近くの敵を狙う）
// 成功: 5波防衛  失敗: 敵がゴールに3体到達 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030810',
    path:    '#0f1a2e',
    pathHi:  '#1a2a42',
    tower:   '#475569',
    towerHi: '#94a3b8',
    cannon:  '#facc15',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    bullet:  '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Path waypoints (enemies walk through these)
  var PATH = [
    {x: 0, y: H*0.3},
    {x: W*0.3, y: H*0.3},
    {x: W*0.3, y: H*0.6},
    {x: W*0.7, y: H*0.6},
    {x: W*0.7, y: H*0.3},
    {x: W, y: H*0.3}
  ];

  var TOWER_X = W/2;
  var TOWER_Y = H*0.75;
  var TOWER_R = 44;
  var CANNON_L = 60;
  var cannonAngle = -Math.PI/2;
  var FIRE_RATE = 1.2; // shots/second
  var fireTimer = 0;
  var BULLET_SPEED = 700;
  var BULLET_R = 12;

  var bullets = [];
  var enemies = []; // { pathIdx, progress, hp, x, y }
  var ENEMY_R = 28;
  var ENEMY_SPEED = 90; // px/s along path
  var ENEMY_HP = 2;

  var wave = 0;
  var TOTAL_WAVES = 5;
  var waveTimer = 0;
  var waveSpawnCount = 0;
  var WAVE_SIZE = 4;
  var SPAWN_INTERVAL = 0.8;
  var enemiesInWave = 0;
  var waveActive = false;
  var breachCount = 0;
  var MAX_BREACH = 3;
  var kills = 0;

  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function getPathPoint(pathIdx, progress) {
    var p1 = PATH[pathIdx];
    var p2 = PATH[pathIdx + 1];
    return {
      x: p1.x + (p2.x - p1.x) * progress,
      y: p1.y + (p2.y - p1.y) * progress
    };
  }

  function getSegLen(idx) {
    var p1 = PATH[idx], p2 = PATH[idx+1];
    var dx = p2.x-p1.x, dy = p2.y-p1.y;
    return Math.sqrt(dx*dx+dy*dy);
  }

  function startWave() {
    wave++;
    waveActive = true;
    waveSpawnCount = 0;
    enemiesInWave = WAVE_SIZE + wave;
    waveTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Aim toward tap
    var dx = tx - TOWER_X, dy = ty - TOWER_Y;
    cannonAngle = Math.atan2(dy, dx);
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Wave management
    if (!waveActive) {
      if (wave < TOTAL_WAVES) {
        waveTimer -= dt;
        if (waveTimer <= 0) startWave();
      } else if (enemies.length === 0 && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(kills * 30 + wave * 100 + Math.ceil(timeLeft) * 10); }, 400);
      }
    }

    if (waveActive) {
      waveTimer -= dt;
      if (waveTimer <= 0 && waveSpawnCount < enemiesInWave) {
        waveTimer = SPAWN_INTERVAL;
        waveSpawnCount++;
        enemies.push({ pathIdx: 0, progress: 0, hp: ENEMY_HP + wave - 1, maxHp: ENEMY_HP + wave - 1 });
      }
      if (waveSpawnCount >= enemiesInWave && enemies.length === 0) {
        waveActive = false;
        waveTimer = 2.0;
        feedbackOk = true;
        feedback = 0.7;
        game.audio.play('se_success');
      }
    }

    // Auto-fire toward closest enemy
    fireTimer -= dt;
    if (fireTimer <= 0 && enemies.length > 0) {
      fireTimer = 1 / FIRE_RATE;
      // Find closest enemy
      var closest = null, closestDist = 9999;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        var pt = getPathPoint(e.pathIdx, e.progress);
        var dx2 = pt.x - TOWER_X, dy2 = pt.y - TOWER_Y;
        var d = Math.sqrt(dx2*dx2 + dy2*dy2);
        if (d < closestDist) { closestDist = d; closest = { e: e, pt: pt }; }
      }
      if (closest) {
        var tdx = closest.pt.x - TOWER_X, tdy = closest.pt.y - TOWER_Y;
        var td = Math.sqrt(tdx*tdx + tdy*tdy);
        cannonAngle = Math.atan2(tdy, tdx);
        bullets.push({
          x: TOWER_X + Math.cos(cannonAngle) * (TOWER_R + 10),
          y: TOWER_Y + Math.sin(cannonAngle) * (TOWER_R + 10),
          vx: Math.cos(cannonAngle) * BULLET_SPEED,
          vy: Math.sin(cannonAngle) * BULLET_SPEED,
          r: BULLET_R
        });
        game.audio.play('se_tap', 0.3);
      }
    }

    // Move enemies
    for (var i2 = 0; i2 < enemies.length; i2++) {
      var en = enemies[i2];
      if (en.pathIdx >= PATH.length - 1) continue;
      var segLen = getSegLen(en.pathIdx);
      en.progress += (ENEMY_SPEED * (1 + wave * 0.1)) / segLen * dt;
      if (en.progress >= 1) {
        en.pathIdx++;
        en.progress -= 1;
        if (en.pathIdx >= PATH.length - 1) {
          // Reached goal
          en.reachedGoal = true;
          breachCount++;
          feedbackOk = false;
          feedback = 0.4;
          game.audio.play('se_failure', 0.6);
          if (breachCount >= MAX_BREACH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }
    enemies = enemies.filter(function(e) { return !e.reachedGoal && e.hp > 0; });

    // Move bullets
    for (var bi = 0; bi < bullets.length; bi++) {
      var b = bullets[bi];
      b.x += b.vx * dt; b.y += b.vy * dt;
      // Hit check
      for (var ei = 0; ei < enemies.length; ei++) {
        var en2 = enemies[ei];
        var pt2 = getPathPoint(en2.pathIdx, en2.progress);
        var dx3 = b.x - pt2.x, dy3 = b.y - pt2.y;
        if (Math.sqrt(dx3*dx3 + dy3*dy3) < BULLET_R + ENEMY_R) {
          en2.hp--;
          b.hit = true;
          if (en2.hp <= 0) {
            kills++;
            for (var pi = 0; pi < 6; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: pt2.x, y: pt2.y, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life: 0.3 });
            }
          }
          break;
        }
      }
    }
    bullets = bullets.filter(function(b) { return !b.hit && b.x > -50 && b.x < W+50 && b.y > -50 && b.y < H+50; });

    // Particles
    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Path
    for (var pi3 = 0; pi3 < PATH.length - 1; pi3++) {
      var p1 = PATH[pi3], p2 = PATH[pi3+1];
      game.draw.line(p1.x, p1.y, p2.x, p2.y, C.path, 60);
      game.draw.line(p1.x, p1.y, p2.x, p2.y, C.pathHi, 4);
    }
    // Goal marker
    game.draw.circle(PATH[PATH.length-1].x, PATH[PATH.length-1].y, 32, C.wrong, 0.7);
    game.draw.text('×', PATH[PATH.length-1].x, PATH[PATH.length-1].y, { size: 48, color: '#fff', bold: true });

    // Enemies
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var en3 = enemies[ei2];
      var pt3 = getPathPoint(en3.pathIdx, en3.progress);
      game.draw.circle(pt3.x, pt3.y, ENEMY_R + 4, C.enemyHi, 0.3);
      game.draw.circle(pt3.x, pt3.y, ENEMY_R, C.enemy, 0.8);
      // HP bar
      var hpW = ENEMY_R * 2 * (en3.hp / en3.maxHp);
      game.draw.rect(pt3.x - ENEMY_R, pt3.y - ENEMY_R - 16, ENEMY_R * 2, 8, '#0a0a0a');
      game.draw.rect(pt3.x - ENEMY_R, pt3.y - ENEMY_R - 16, hpW, 8, C.correct);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      game.draw.circle(bullets[bi2].x, bullets[bi2].y, BULLET_R, C.bullet);
    }

    // Tower
    var cx2 = TOWER_X + Math.cos(cannonAngle) * (TOWER_R + CANNON_L);
    var cy2 = TOWER_Y + Math.sin(cannonAngle) * (TOWER_R + CANNON_L);
    game.draw.line(TOWER_X, TOWER_Y, cx2, cy2, C.cannon, 14);
    game.draw.circle(TOWER_X, TOWER_Y, TOWER_R + 8, C.towerHi, 0.2);
    game.draw.circle(TOWER_X, TOWER_Y, TOWER_R, C.tower);
    game.draw.circle(TOWER_X, TOWER_Y, TOWER_R - 12, C.towerHi, 0.4);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      game.draw.circle(particles[pp].x, particles[pp].y, 6*particles[pp].life*2, C.enemy, particles[pp].life);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '波を撃退！' : '突破された！', W/2, H*0.6, {
        size: 64, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // HUD
    game.draw.text('Wave ' + wave + '/' + TOTAL_WAVES, W/2, 148, { size: 52, color: '#f1f5f9', bold: true });
    for (var bi3 = 0; bi3 < MAX_BREACH; bi3++) {
      game.draw.circle(W/2 + (bi3-1)*52, 216, 18, bi3 < breachCount ? C.wrong : '#0a1020');
    }

    game.draw.text('タップで砲塔を向ける', W/2, H*0.88, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.cannon : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    waveTimer = 1.5;
  });
})(game);
