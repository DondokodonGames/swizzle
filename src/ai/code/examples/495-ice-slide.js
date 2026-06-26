// 495-ice-slide.js
// アイススライド — 氷の上でキャラが滑り続ける。壁や穴を避けてゴールへ
// 操作: スワイプで進む方向を指定（壁にぶつかるまで止まらない）
// 成功: 10ステージクリア  失敗: 穴に落ちる3回 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020a14',
    ice:    '#e0f2fe',
    iceHi:  '#f0f9ff',
    wall:   '#1e3a5f',
    wallHi: '#2563eb',
    hole:   '#000918',
    player: '#fbbf24',
    playerHi:'#fef08a',
    goal:   '#22c55e',
    goalHi: '#86efac',
    trail:  '#bae6fd',
    danger: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GRID = 6;
  var CELL = 148;
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.18;

  // Map cell types: 0=ice, 1=wall, 2=hole, 3=goal
  var maps = [
    // Stage 1 - simple
    [0,0,0,1,0,0,
     0,1,0,0,0,0,
     0,0,0,0,1,0,
     0,0,1,0,0,0,
     0,0,0,0,0,3,
     0,0,0,0,0,0],
    [1,0,0,0,0,0,
     0,0,1,0,0,1,
     0,0,0,0,0,0,
     1,0,0,2,0,0,
     0,0,0,0,0,0,
     0,0,0,0,0,3],
    [0,0,0,0,1,0,
     0,2,0,0,0,0,
     0,0,1,0,0,0,
     0,0,0,0,2,0,
     1,0,0,0,0,0,
     0,0,0,3,0,0],
    [0,1,0,0,0,0,
     0,0,0,2,0,0,
     0,0,0,0,0,1,
     0,2,0,0,0,0,
     0,0,0,1,0,0,
     3,0,0,0,0,0],
    [0,0,2,0,0,1,
     0,1,0,0,2,0,
     0,0,0,0,0,0,
     1,0,2,0,1,0,
     0,0,0,0,0,0,
     0,0,0,0,3,0],
    [0,0,0,1,0,3,
     0,2,0,0,0,0,
     1,0,0,0,2,0,
     0,0,0,0,0,1,
     0,2,1,0,0,0,
     0,0,0,0,2,0],
    [0,1,0,0,0,0,
     0,0,2,0,1,0,
     3,0,0,0,0,2,
     0,0,1,0,0,0,
     0,2,0,0,2,0,
     0,0,0,1,0,0],
    [0,0,0,0,2,0,
     1,0,2,0,0,0,
     0,0,0,1,0,3,
     0,2,0,0,0,0,
     0,0,0,0,1,0,
     0,1,2,0,0,0],
    [3,0,0,0,2,0,
     0,0,1,0,0,0,
     0,2,0,0,0,1,
     0,0,0,2,0,0,
     0,1,0,0,0,2,
     0,0,0,0,1,0],
    [0,0,2,0,0,0,
     0,1,0,0,2,0,
     0,0,0,0,0,0,
     0,2,1,0,0,0,
     0,0,0,0,1,0,
     3,0,0,2,0,0]
  ];

  var stage = 0;
  var map = [];
  var pr = 0, pc = 0; // player row, col
  var sliding = false;
  var slideDir = null;
  var slideProgress = 0;
  var fromR = 0, fromC = 0;
  var toR = 0, toC = 0;
  var trail = []; // {r,c} cells visited
  var rounds = 0;
  var falls = 0;
  var MAX_FALLS = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.goal;

  function loadStage(s) {
    var raw = maps[s % maps.length];
    map = [];
    for (var i = 0; i < GRID; i++) {
      map.push(raw.slice(i * GRID, (i + 1) * GRID).slice());
    }
    // Find player start (top-left non-wall, non-hole, non-goal area)
    pr = 0; pc = 0;
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        if (map[r][c] === 0) { pr = r; pc = c; break; }
      }
      if (map[pr][pc] === 0) break;
    }
    trail = [{ r: pr, c: pc }];
    sliding = false;
  }

  function cellAt(r, c) {
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return 1; // treat OOB as wall
    return map[r][c];
  }

  function startSlide(dir) {
    if (sliding || done) return;
    var dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    var dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    // Check next cell
    var nr = pr + dr, nc = pc + dc;
    if (cellAt(nr, nc) === 1) return; // blocked immediately
    fromR = pr; fromC = pc;
    toR = nr; toC = nc;
    sliding = true;
    slideProgress = 0;
    game.audio.play('se_tap', 0.3);
  }

  game.onSwipe(function(dir) {
    if (done || sliding) return;
    startSlide(dir);
  });

  game.onTap(function(tx, ty) {
    // tap on grid half to suggest direction
    if (done || sliding) return;
    var cx = OX + pc * CELL + CELL / 2;
    var cy = OY + pr * CELL + CELL / 2;
    var dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      startSlide(dx > 0 ? 'right' : 'left');
    } else {
      startSlide(dy > 0 ? 'down' : 'up');
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

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Update slide
    if (sliding) {
      slideProgress += dt * 6;
      if (slideProgress >= 1) {
        slideProgress = 1;
        pr = toR; pc = toC;
        trail.push({ r: pr, c: pc });
        if (trail.length > 12) trail.shift();

        var cell = cellAt(pr, pc);
        if (cell === 2) {
          // Fell in hole
          falls++;
          sliding = false;
          flashCol = C.danger;
          flashAnim = 0.7;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: OX + pc * CELL + CELL / 2, y: OY + pr * CELL + CELL / 2, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.danger });
          }
          if (falls >= MAX_FALLS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            setTimeout(function() { loadStage(stage); }, 600);
          }
        } else if (cell === 3) {
          // Goal!
          stage++;
          rounds++;
          sliding = false;
          flashCol = C.goal;
          flashAnim = 0.5;
          game.audio.play('se_success', 0.8);
          for (var pi2 = 0; pi2 < 14; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: OX + pc * CELL + CELL / 2, y: OY + pr * CELL + CELL / 2, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.6, col: C.goalHi });
          }
          if (rounds >= 10 && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(rounds * 500 + Math.ceil(timeLeft) * 100); }, 800);
          } else {
            setTimeout(function() { loadStage(stage); }, 600);
          }
        } else {
          // Continue sliding
          var dr2 = toR - fromR, dc2 = toC - fromC;
          var nr2 = pr + dr2, nc2 = pc + dc2;
          if (cellAt(nr2, nc2) !== 1) {
            fromR = pr; fromC = pc;
            toR = nr2; toC = nc2;
            slideProgress = 0;
          } else {
            sliding = false;
          }
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

    // Grid
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;
        var cell2 = map[r][c];
        if (cell2 === 1) {
          // Wall
          game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, C.wall, 0.9);
          game.draw.rect(gx + 3, gy + 3, CELL - 6, 10, C.wallHi, 0.4);
        } else if (cell2 === 2) {
          // Hole
          game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, C.hole, 0.95);
          game.draw.circle(gx + CELL / 2, gy + CELL / 2, CELL * 0.3, '#000', 0.8);
        } else if (cell2 === 3) {
          // Goal
          game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, C.ice, 0.6);
          game.draw.circle(gx + CELL / 2, gy + CELL / 2, CELL * 0.35, C.goal, 0.3 + Math.sin(elapsed * 4) * 0.1);
          game.draw.circle(gx + CELL / 2, gy + CELL / 2, CELL * 0.25, C.goalHi, 0.7);
          game.draw.text('★', gx + CELL / 2, gy + CELL / 2 + 16, { size: 48, color: C.goal });
        } else {
          // Ice
          game.draw.rect(gx + 3, gy + 3, CELL - 6, CELL - 6, C.ice, 0.2);
          game.draw.rect(gx + 3, gy + 3, CELL - 6, 4, C.iceHi, 0.3);
        }
      }
    }

    // Trail
    for (var ti = 0; ti < trail.length; ti++) {
      var t = trail[ti];
      var alpha = (ti / trail.length) * 0.3;
      game.draw.circle(OX + t.c * CELL + CELL / 2, OY + t.r * CELL + CELL / 2, 20, C.trail, alpha);
    }

    // Player (animated during slide)
    var px, py;
    if (sliding) {
      var t2 = slideProgress;
      px = OX + (fromC + (toC - fromC) * t2) * CELL + CELL / 2;
      py = OY + (fromR + (toR - fromR) * t2) * CELL + CELL / 2;
    } else {
      px = OX + pc * CELL + CELL / 2;
      py = OY + pr * CELL + CELL / 2;
    }
    game.draw.circle(px, py, 44, C.playerHi, 0.3);
    game.draw.circle(px, py, 36, C.player, 0.9);
    game.draw.circle(px - 12, py - 12, 10, '#fff', 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.15);

    // Falls display
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 60 + fi * 120, H * 0.955, 22, fi < falls ? C.danger : C.ui, 0.9);
    }

    game.draw.text(rounds + ' / 10', W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    loadStage(0);
  });
})(game);
