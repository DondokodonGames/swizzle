// 124-electric-fence.js
// 電気フェンス — 感電しないよう隙間をくぐり抜けながらゴールへ向かう緊張感
// 操作: タップで上下位置切替（3レーン）
// 成功: ゴールラインを通過  失敗: 電流に触れる or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050810',
    wire:    '#475569',
    wireHi:  '#94a3b8',
    electric:'#facc15',
    electricHi:'#fef08a',
    player:  '#22d3ee',
    playerHi:'#67e8f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    goal:    '#22c55e',
    ui:      '#334155'
  };

  var LANES = 3;
  var laneY = [H * 0.3, H * 0.5, H * 0.7];
  var currentLane = 1; // start in middle
  var PLAYER_X = W * 0.18;
  var PLAYER_R = 30;

  var obstacles = []; // { x, gapLane } — wire panel with gap in one lane
  var PANEL_W = 28;
  var SCROLL_SPEED = 300;
  var LANE_GAP = 80;
  var spawnTimer = 1.2;

  var goalX = W * 0.88;
  var goalPassed = false;
  var progress = 0; // 0-1 virtual distance
  var TOTAL_DIST = 20; // number of panels to pass

  var timeLeft = 25;
  var done = false;
  var deathFlash = 0;
  var particles = [];
  var passed = 0; // panels successfully passed

  function spawnPanel() {
    var gapLane = Math.floor(Math.random() * LANES);
    obstacles.push({ x: W + PANEL_W, gapLane: gapLane });
  }

  game.onTap(function() {
    if (done) return;
    currentLane = (currentLane + 1) % LANES;
    game.audio.play('se_tap', 0.5);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') currentLane = Math.max(0, currentLane - 1);
    if (dir === 'down') currentLane = Math.min(LANES - 1, currentLane + 1);
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

    // Move obstacles
    for (var i = 0; i < obstacles.length; i++) {
      obstacles[i].x -= SCROLL_SPEED * dt;
    }

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 0.8 + Math.random() * 0.5;
      spawnPanel();
    }

    // Collision + pass detection
    var py = laneY[currentLane];
    for (var j = obstacles.length - 1; j >= 0; j--) {
      var obs = obstacles[j];
      // Player in panel zone?
      if (Math.abs(PLAYER_X - obs.x) < PANEL_W * 0.5 + PLAYER_R) {
        // Check if player is in gap lane
        if (currentLane !== obs.gapLane) {
          // Hit!
          if (!done) {
            done = true;
            deathFlash = 0.6;
            game.audio.play('se_failure');
            for (var pi = 0; pi < 16; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: PLAYER_X, y: py, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250, life: 0.5 });
            }
            setTimeout(function() { game.end.failure(); }, 700);
          }
          return;
        }
      }
      // Panel passed player
      if (obs.x + PANEL_W < PLAYER_X - PLAYER_R && !obs.counted) {
        obs.counted = true;
        passed++;
        if (passed >= TOTAL_DIST && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(passed * 30 + Math.ceil(timeLeft) * 20); }, 400);
        }
      }
      if (obs.x + PANEL_W < -50) obstacles.splice(j, 1);
    }

    // Particles
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 500 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane lines
    for (var li = 0; li < LANES; li++) {
      game.draw.line(0, laneY[li], W, laneY[li], '#0f1a2a', 2);
    }

    // Panels (wired fences)
    for (var oi = 0; oi < obstacles.length; oi++) {
      var obs2 = obstacles[oi];
      for (var li2 = 0; li2 < LANES; li2++) {
        if (li2 === obs2.gapLane) continue; // gap
        var oy = laneY[li2] - LANE_GAP / 2;
        // Wire panel with electric effect
        var ePulse = 0.6 + 0.4 * Math.abs(Math.sin(timeLeft * 12 + obs2.x * 0.01));
        game.draw.rect(obs2.x - PANEL_W / 2, oy, PANEL_W, LANE_GAP, C.electric, ePulse * 0.4);
        game.draw.rect(obs2.x - PANEL_W / 2, oy, PANEL_W, LANE_GAP, C.electricHi, ePulse * 0.2);
        // Wire edges
        game.draw.line(obs2.x, oy, obs2.x, oy + LANE_GAP, C.wire, 4);
      }
      // Gap indicator
      game.draw.text('↔', obs2.x, laneY[obs2.gapLane], { size: 32, color: C.correct });
    }

    // Player
    var playerY = laneY[currentLane];
    game.draw.circle(PLAYER_X, playerY, PLAYER_R + 8, C.playerHi, 0.3);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player);
    game.draw.circle(PLAYER_X - 8, playerY - 8, 10, '#fff', 0.5);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 6 * part.life * 2, C.electric, part.life);
    }

    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.electric, deathFlash * 0.3);
    }

    // Progress
    var prog = Math.min(1, passed / TOTAL_DIST);
    game.draw.rect(100, H * 0.92, W - 200, 20, '#0a1020');
    game.draw.rect(100, H * 0.92, (W - 200) * prog, 20, C.goal, 0.8);

    game.draw.text(passed + ' / ' + TOTAL_DIST, W / 2, 148, { size: 56, color: '#f1f5f9', bold: true });
    game.draw.text('タップ/スワイプでレーン変更', W / 2, H * 0.89, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.electric : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnPanel();
    spawnPanel();
  });
})(game);
