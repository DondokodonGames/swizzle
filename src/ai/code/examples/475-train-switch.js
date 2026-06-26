// 475-train-switch.js
// 列車の分岐 — 正しいホームに列車を導くためスイッチを切り替える
// 操作: タップで線路の分岐スイッチを切り替え
// 成功: 15本の列車を正しいホームへ  失敗: 3本脱線 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050810',
    rail:   '#374151',
    railHi: '#6b7280',
    tie:    '#292524',
    train0: '#ef4444',
    train1: '#3b82f6',
    train2: '#22c55e',
    train3: '#f59e0b',
    home0:  '#7f1d1d',
    home1:  '#1e3a5f',
    home2:  '#14532d',
    home3:  '#78350f',
    switch2:'#fbbf24',
    switchOn:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  // Layout: track enters from top, splits into 4 platforms at bottom
  // One switch at center splits L/R, each side has another switch splitting top/bottom
  // switchA: 0=left, 1=right
  // switchB: 0=top, 1=bottom (left side)
  // switchC: 0=top, 1=bottom (right side)

  var switchA = 0; // 0=left branch, 1=right branch
  var switchB = 0; // 0=platform 0 (red), 1=platform 1 (blue) — left
  var switchC = 0; // 0=platform 2 (green), 1=platform 3 (yellow) — right

  var PLAT_COLS = [W * 0.15, W * 0.38, W * 0.62, W * 0.85];
  var PLAT_Y = H * 0.78;
  var MERGE_Y = H * 0.35;
  var SPLIT_Y_LEFT = H * 0.56;
  var SPLIT_Y_RIGHT = H * 0.56;
  var ENTRY_X = W / 2;
  var ENTRY_Y = H * 0.14;

  var PLAT_COLORS = [C.train0, C.train1, C.train2, C.train3];
  var HOME_COLORS = [C.home0, C.home1, C.home2, C.home3];

  var trains = [];
  var derailed = 0;
  var MAX_DERAIL = 3;
  var delivered = 0;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var nextSpawn = 1.5;
  var particles = [];

  function getTargetPlatform(train) {
    // Based on switch settings
    if (switchA === 0) {
      // Going left
      if (switchB === 0) return 0;
      else return 1;
    } else {
      // Going right
      if (switchC === 0) return 2;
      else return 3;
    }
  }

  function spawnTrain() {
    var targetPlatform = Math.floor(Math.random() * 4);
    trains.push({
      x: ENTRY_X,
      y: ENTRY_Y - 60,
      targetPlatform: targetPlatform,
      col: PLAT_COLORS[targetPlatform],
      speed: 380 + Math.random() * 80,
      phase: 'descending', // descending → at_switch → at_split → arriving
      arrived: false,
      derailed: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Switch A at center (H * 0.35)
    var swAx = W / 2, swAy = MERGE_Y;
    if (Math.abs(tx - swAx) < 60 && Math.abs(ty - swAy) < 60) {
      switchA = 1 - switchA;
      game.audio.play('se_tap', 0.4);
      return;
    }

    // Switch B left (H * 0.56)
    var swBx = (PLAT_COLS[0] + PLAT_COLS[1]) / 2, swBy = SPLIT_Y_LEFT;
    if (Math.abs(tx - swBx) < 60 && Math.abs(ty - swBy) < 60) {
      switchB = 1 - switchB;
      game.audio.play('se_tap', 0.4);
      return;
    }

    // Switch C right (H * 0.56)
    var swCx = (PLAT_COLS[2] + PLAT_COLS[3]) / 2, swCy = SPLIT_Y_RIGHT;
    if (Math.abs(tx - swCx) < 60 && Math.abs(ty - swCy) < 60) {
      switchC = 1 - switchC;
      game.audio.play('se_tap', 0.4);
      return;
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

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done && trains.length < 3) {
      spawnTrain();
      nextSpawn = 1.2 + Math.random() * 1.0;
    }

    // Move trains
    for (var ti = trains.length - 1; ti >= 0; ti--) {
      var tr = trains[ti];
      if (tr.arrived || tr.derailed) continue;

      // Determine target X based on switches
      var targetX;
      if (tr.y < MERGE_Y) {
        targetX = ENTRY_X;
        tr.y += tr.speed * dt;
        if (tr.y >= MERGE_Y) tr.y = MERGE_Y;
      } else if (tr.y >= MERGE_Y && tr.y < SPLIT_Y_LEFT) {
        // After main switch — go left or right
        var targetBranchX = (switchA === 0) ? (PLAT_COLS[0] + PLAT_COLS[1]) / 2 : (PLAT_COLS[2] + PLAT_COLS[3]) / 2;
        tr.x += (targetBranchX - tr.x) * dt * 3;
        tr.y += tr.speed * dt;
        if (tr.y >= SPLIT_Y_LEFT) tr.y = SPLIT_Y_LEFT;
      } else if (tr.y >= SPLIT_Y_LEFT && tr.y < PLAT_Y) {
        // After secondary switch
        var destPlatIdx;
        if (tr.x < W / 2) {
          // Left branch
          destPlatIdx = (switchB === 0) ? 0 : 1;
        } else {
          // Right branch
          destPlatIdx = (switchC === 0) ? 2 : 3;
        }
        tr.x += (PLAT_COLS[destPlatIdx] - tr.x) * dt * 3;
        tr.y += tr.speed * dt;
        if (tr.y >= PLAT_Y) {
          tr.y = PLAT_Y;
          // Check if correct platform
          if (destPlatIdx === tr.targetPlatform) {
            tr.arrived = true;
            delivered++;
            game.audio.play('se_tap', 0.5);
            for (var pi = 0; pi < 8; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: tr.x, y: tr.y, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.5, col: tr.col });
            }
            if (delivered >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.8);
              setTimeout(function() { game.end.success(delivered * 200 + Math.ceil(timeLeft) * 100); }, 700);
            }
          } else {
            // Wrong platform — derailed
            tr.derailed = true;
            derailed++;
            game.audio.play('se_failure', 0.5);
            for (var pi2 = 0; pi2 < 12; pi2++) {
              var ang2 = Math.random() * Math.PI * 2;
              particles.push({ x: tr.x, y: tr.y, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200 - 100, life: 0.8, col: C.wrong });
            }
            if (derailed >= MAX_DERAIL && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 600);
            }
          }
          trains.splice(ti, 1);
        }
      }
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

    // Track layout
    // Main track from top to switch A
    game.draw.line(ENTRY_X, ENTRY_Y, ENTRY_X, MERGE_Y, C.rail, 20);
    game.draw.line(ENTRY_X, ENTRY_Y, ENTRY_X, MERGE_Y, C.railHi, 6);

    // Left branch: switch A to switch B
    var leftBranchX = (PLAT_COLS[0] + PLAT_COLS[1]) / 2;
    var rightBranchX = (PLAT_COLS[2] + PLAT_COLS[3]) / 2;
    game.draw.line(ENTRY_X, MERGE_Y, leftBranchX, SPLIT_Y_LEFT, switchA === 0 ? C.switchOn : C.rail, 18);
    game.draw.line(ENTRY_X, MERGE_Y, rightBranchX, SPLIT_Y_RIGHT, switchA === 1 ? C.switchOn : C.rail, 18);

    // Left sub-branches
    game.draw.line(leftBranchX, SPLIT_Y_LEFT, PLAT_COLS[0], PLAT_Y, switchB === 0 ? C.switchOn : C.rail, 16);
    game.draw.line(leftBranchX, SPLIT_Y_LEFT, PLAT_COLS[1], PLAT_Y, switchB === 1 ? C.switchOn : C.rail, 16);

    // Right sub-branches
    game.draw.line(rightBranchX, SPLIT_Y_RIGHT, PLAT_COLS[2], PLAT_Y, switchC === 0 ? C.switchOn : C.rail, 16);
    game.draw.line(rightBranchX, SPLIT_Y_RIGHT, PLAT_COLS[3], PLAT_Y, switchC === 1 ? C.switchOn : C.rail, 16);

    // Platforms
    for (var pi3 = 0; pi3 < 4; pi3++) {
      game.draw.rect(PLAT_COLS[pi3] - 70, PLAT_Y - 20, 140, 120, HOME_COLORS[pi3], 0.9);
      game.draw.rect(PLAT_COLS[pi3] - 70, PLAT_Y - 20, 140, 8, PLAT_COLORS[pi3], 0.8);
    }

    // Switch diamonds
    var switchNodes = [
      { x: W / 2, y: MERGE_Y, on: true, col: C.switch2 },
      { x: leftBranchX, y: SPLIT_Y_LEFT, on: true, col: C.switch2 },
      { x: rightBranchX, y: SPLIT_Y_RIGHT, on: true, col: C.switch2 }
    ];
    for (var si = 0; si < switchNodes.length; si++) {
      var sn = switchNodes[si];
      game.draw.circle(sn.x, sn.y, 36, C.bg, 1.0);
      game.draw.circle(sn.x, sn.y, 34, sn.col, 0.9);
      game.draw.circle(sn.x, sn.y, 20, '#fff', 0.6);
    }
    // Labels
    game.draw.text(switchA === 0 ? '←' : '→', W / 2, MERGE_Y + 14, { size: 44, color: '#000', bold: true });
    game.draw.text(switchB === 0 ? '←' : '→', leftBranchX, SPLIT_Y_LEFT + 14, { size: 40, color: '#000', bold: true });
    game.draw.text(switchC === 0 ? '←' : '→', rightBranchX, SPLIT_Y_RIGHT + 14, { size: 40, color: '#000', bold: true });

    // Trains
    for (var ti2 = 0; ti2 < trains.length; ti2++) {
      var tr2 = trains[ti2];
      // Train body
      game.draw.rect(tr2.x - 44, tr2.y - 36, 88, 72, tr2.col, 0.9);
      game.draw.rect(tr2.x - 44, tr2.y - 36, 88, 12, '#fff', 0.2);
      // Target platform color shown at top
      game.draw.rect(tr2.x - 44, tr2.y - 44, 88, 12, tr2.col, 0.6);
      // Windows
      game.draw.rect(tr2.x - 32, tr2.y - 22, 24, 20, '#fff', 0.4);
      game.draw.rect(tr2.x + 8, tr2.y - 22, 24, 20, '#fff', 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Derail dots
    for (var di = 0; di < MAX_DERAIL; di++) {
      game.draw.circle(W * 0.15 + di * (W * 0.35 / (MAX_DERAIL - 1)), H * 0.955, 18, di < derailed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(delivered + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.switchOn : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnTrain();
  });
})(game);
