// 137-ant-highway.js
// アリの道 — 行列を乱す障害物をタップで除去してアリたちをゴールへ導く誘導ゲーム
// 操作: タップで障害物を除去（障害物は自動再生成）
// 成功: 50匹のアリをゴールへ  失敗: 20匹が迷子 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030804',
    path:    '#0a1808',
    pathHi:  '#14280c',
    ant:     '#22c55e',
    antHead: '#86efac',
    block:   '#ef4444',
    blockHi: '#fca5a5',
    goal:    '#facc15',
    goalHi:  '#fef08a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Path is a winding route from left to right
  var PATH_POINTS = [
    {x: 0, y: H*0.5},
    {x: W*0.2, y: H*0.5},
    {x: W*0.2, y: H*0.3},
    {x: W*0.5, y: H*0.3},
    {x: W*0.5, y: H*0.65},
    {x: W*0.8, y: H*0.65},
    {x: W*0.8, y: H*0.4},
    {x: W, y: H*0.4}
  ];

  function getPathAt(t) {
    // t: 0-1 along total path
    var totalLen = 0;
    var segLens = [];
    for (var i = 0; i < PATH_POINTS.length-1; i++) {
      var dx = PATH_POINTS[i+1].x - PATH_POINTS[i].x;
      var dy = PATH_POINTS[i+1].y - PATH_POINTS[i].y;
      var l = Math.sqrt(dx*dx+dy*dy);
      segLens.push(l);
      totalLen += l;
    }
    var target = t * totalLen;
    var cumLen = 0;
    for (var i2 = 0; i2 < segLens.length; i2++) {
      if (cumLen + segLens[i2] >= target) {
        var frac = (target - cumLen) / segLens[i2];
        return {
          x: PATH_POINTS[i2].x + (PATH_POINTS[i2+1].x - PATH_POINTS[i2].x) * frac,
          y: PATH_POINTS[i2].y + (PATH_POINTS[i2+1].y - PATH_POINTS[i2].y) * frac
        };
      }
      cumLen += segLens[i2];
    }
    return PATH_POINTS[PATH_POINTS.length-1];
  }

  var ants = []; // { t: 0-1 progress, speed, lost }
  var ANT_SPEED = 0.08; // t/second
  var SPAWN_INTERVAL = 0.4;
  var spawnTimer = 0;
  var ANT_R = 10;

  var blocks = []; // { t: position on path, r }
  var BLOCK_R = 28;
  var MAX_BLOCKS = 4;
  var blockRespawnTimer = 0;
  var BLOCK_RESPAWN = 3.0;

  var arrived = 0;
  var lost = 0;
  var needed = 50;
  var maxLost = 20;
  var totalSpawned = 0;
  var timeLeft = 40;
  var done = false;
  var particles = [];

  function spawnBlock() {
    if (blocks.length >= MAX_BLOCKS) return;
    var t = 0.1 + Math.random() * 0.8;
    // Don't overlap existing blocks
    for (var bi = 0; bi < blocks.length; bi++) {
      if (Math.abs(blocks[bi].t - t) < 0.1) return;
    }
    blocks.push({ t: t, r: BLOCK_R });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var bi = blocks.length-1; bi >= 0; bi--) {
      var b = blocks[bi];
      var bPos = getPathAt(b.t);
      var dx = tx - bPos.x, dy = ty - bPos.y;
      if (Math.sqrt(dx*dx+dy*dy) < b.r + 24) {
        blocks.splice(bi, 1);
        game.audio.play('se_tap', 0.7);
        // Small particles
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: bPos.x, y: bPos.y, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100, life: 0.3 });
        }
        return;
      }
    }
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

    // Spawn ants
    spawnTimer -= dt;
    if (spawnTimer <= 0 && totalSpawned < needed + maxLost) {
      spawnTimer = SPAWN_INTERVAL;
      ants.push({ t: 0, speed: ANT_SPEED * (0.8 + Math.random() * 0.4), lost: false });
      totalSpawned++;
    }

    // Block respawn
    blockRespawnTimer -= dt;
    if (blockRespawnTimer <= 0) {
      blockRespawnTimer = BLOCK_RESPAWN;
      spawnBlock();
    }

    // Move ants
    for (var ai = ants.length-1; ai >= 0; ai--) {
      var ant = ants[ai];
      if (ant.lost) continue;
      // Check if blocked
      var blocked = false;
      for (var bi = 0; bi < blocks.length; bi++) {
        if (Math.abs(ant.t - blocks[bi].t) < 0.04) {
          blocked = true;
          break;
        }
      }
      if (!blocked) ant.t += ant.speed * dt;
      if (ant.t >= 1) {
        ant.t = 1;
        arrived++;
        ant.done = true;
        if (arrived >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(arrived*10 + Math.ceil(timeLeft)*8); }, 400);
        }
      }
      // If ant has been stuck too long... (simple: check if t not advanced)
    }

    // Ants that are waiting too long get lost (simplified: lost ones that fall behind spawn point)
    // Actually count stragglers: ants that are stuck at blocks too long
    // Simple: check if any ant has been at same t for > 8s (approximated by counting blocked ants at very low t)
    var stuckCount = ants.filter(function(a) { return !a.lost && !a.done && a.t < 0.05; }).length;
    if (stuckCount > 5) {
      // Some ants get lost
      for (var ai2 = 0; ai2 < ants.length; ai2++) {
        if (!ants[ai2].lost && !ants[ai2].done && ants[ai2].t < 0.05) {
          ants[ai2].lost = true;
          lost++;
          if (lost >= maxLost && !done) {
            done = true;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
      }
    }

    ants = ants.filter(function(a) { return !a.done; });

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Path
    for (var pi2 = 0; pi2 < PATH_POINTS.length-1; pi2++) {
      game.draw.line(PATH_POINTS[pi2].x, PATH_POINTS[pi2].y, PATH_POINTS[pi2+1].x, PATH_POINTS[pi2+1].y, C.path, 48);
      game.draw.line(PATH_POINTS[pi2].x, PATH_POINTS[pi2].y, PATH_POINTS[pi2+1].x, PATH_POINTS[pi2+1].y, C.pathHi, 4);
    }

    // Goal
    var goalPos = PATH_POINTS[PATH_POINTS.length-1];
    var gPulse = 0.5 + 0.4 * Math.abs(Math.sin(timeLeft*2));
    game.draw.circle(goalPos.x, goalPos.y, 40, C.goal, gPulse*0.5);
    game.draw.circle(goalPos.x, goalPos.y, 24, C.goalHi, 0.9);
    game.draw.text('▶', goalPos.x, goalPos.y, { size: 32, color: '#000', bold: true });

    // Ants
    for (var ai3 = 0; ai3 < ants.length; ai3++) {
      var ant2 = ants[ai3];
      if (ant2.lost) continue;
      var pos = getPathAt(ant2.t);
      // Ant body (2 circles)
      game.draw.circle(pos.x, pos.y, ANT_R, C.ant, 0.9);
      game.draw.circle(pos.x, pos.y - ANT_R, ANT_R * 0.7, C.antHead, 0.8);
    }

    // Blocks
    for (var bi2 = 0; bi2 < blocks.length; bi2++) {
      var bPos2 = getPathAt(blocks[bi2].t);
      var bPulse = 0.6 + 0.4 * Math.abs(Math.sin(timeLeft*3 + bi2));
      game.draw.circle(bPos2.x, bPos2.y, BLOCK_R + 8, C.blockHi, bPulse * 0.25);
      game.draw.circle(bPos2.x, bPos2.y, BLOCK_R, C.block, 0.85);
      game.draw.text('✕', bPos2.x, bPos2.y, { size: 36, color: '#fff', bold: true });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 6*part.life*3, C.block, part.life);
    }

    // Score
    game.draw.text(arrived + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var li = 0; li < 5; li++) {
      game.draw.circle(W/2+(li-2)*52, 218, 18, li < Math.floor(lost/4) ? C.wrong : '#0a1020');
    }

    game.draw.text('障害物をタップで除去！', W/2, H*0.88, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.ant : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spawnBlock();
    spawnBlock();
  });
})(game);
