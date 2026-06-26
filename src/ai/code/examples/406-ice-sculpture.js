// 406-ice-sculpture.js
// 氷彫刻 — 溶けていく氷ブロックを正確な形に削りだす
// 操作: スワイプ方向で氷を削る、シルエット通りに
// 成功: 8つの彫刻完成  失敗: 削りすぎ5回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040b14',
    ice:    '#bae6fd',
    iceHi:  '#e0f2fe',
    iceShadow:'#1e3a5f',
    target: '#22c55e',
    targetHi:'#86efac',
    chisel: '#94a3b8',
    chiselHi:'#f1f5f9',
    chip:   '#7dd3fc',
    over:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  // Shapes defined as grid of cells (5x5)
  var SHAPES = [
    // Cross
    [[0,1,0],[1,1,1],[0,1,0]],
    // L-shape
    [[1,0,0],[1,0,0],[1,1,1]],
    // T-shape
    [[1,1,1],[0,1,0],[0,1,0]],
    // Z-shape
    [[1,1,0],[0,1,0],[0,1,1]],
    // Diamond
    [[0,1,0],[1,1,1],[0,1,0]],
    // Step
    [[1,1,0],[0,1,0],[0,1,1]],
    // Corner
    [[1,1,1],[1,0,0],[1,0,0]],
    // Dot
    [[1,1,1],[1,0,1],[1,1,1]]
  ];

  var GRID_N = 3;
  var CELL_S = 160;
  var GRID_X = W/2 - GRID_N*CELL_S/2;
  var GRID_Y = H*0.28;

  var iceGrid = [];    // current ice block (1=has ice)
  var targetGrid = []; // what we want (1=keep, 0=remove)
  var phase = 'sculpt';
  var sculptIdx = 0;
  var completed = 0;
  var NEEDED = 8;
  var overcuts = 0;
  var MAX_OVER = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var successFlash = 0;
  var meltTimer = 0;
  var lastSwipeDir = '';

  function loadShape(idx) {
    var shape = SHAPES[idx % SHAPES.length];
    targetGrid = [];
    for (var r = 0; r < GRID_N; r++) {
      targetGrid.push(shape[r].slice());
    }
    // Start with full ice block
    iceGrid = [];
    for (var r2 = 0; r2 < GRID_N; r2++) {
      iceGrid.push([1,1,1]);
    }
    phase = 'sculpt';
  }

  function checkComplete() {
    for (var r = 0; r < GRID_N; r++) {
      for (var c = 0; c < GRID_N; c++) {
        if (iceGrid[r][c] !== targetGrid[r][c]) return false;
      }
    }
    return true;
  }

  // Remove ice from edges matching swipe direction
  game.onSwipe(function(dir) {
    if (done || phase !== 'sculpt') return;
    lastSwipeDir = dir;
    game.audio.play('se_tap', 0.4);
    var removed = 0;
    var overcut = false;

    if (dir === 'right') {
      // Remove rightmost ice column
      for (var r = 0; r < GRID_N; r++) {
        for (var c = GRID_N-1; c >= 0; c--) {
          if (iceGrid[r][c] === 1) {
            if (targetGrid[r][c] === 1) overcut = true;
            iceGrid[r][c] = 0;
            removed++;
            particles.push({ x:GRID_X+(c+1)*CELL_S, y:GRID_Y+(r+0.5)*CELL_S, vx:200+Math.random()*150, vy:(Math.random()-0.5)*200, life:0.6, col:C.chip });
            break;
          }
        }
      }
    } else if (dir === 'left') {
      for (var r2 = 0; r2 < GRID_N; r2++) {
        for (var c2 = 0; c2 < GRID_N; c2++) {
          if (iceGrid[r2][c2] === 1) {
            if (targetGrid[r2][c2] === 1) overcut = true;
            iceGrid[r2][c2] = 0;
            particles.push({ x:GRID_X+c2*CELL_S, y:GRID_Y+(r2+0.5)*CELL_S, vx:-200-Math.random()*150, vy:(Math.random()-0.5)*200, life:0.6, col:C.chip });
            break;
          }
        }
      }
    } else if (dir === 'up') {
      for (var c3 = 0; c3 < GRID_N; c3++) {
        for (var r3 = 0; r3 < GRID_N; r3++) {
          if (iceGrid[r3][c3] === 1) {
            if (targetGrid[r3][c3] === 1) overcut = true;
            iceGrid[r3][c3] = 0;
            particles.push({ x:GRID_X+(c3+0.5)*CELL_S, y:GRID_Y+r3*CELL_S, vx:(Math.random()-0.5)*200, vy:-200-Math.random()*150, life:0.6, col:C.chip });
            break;
          }
        }
      }
    } else if (dir === 'down') {
      for (var c4 = 0; c4 < GRID_N; c4++) {
        for (var r4 = GRID_N-1; r4 >= 0; r4--) {
          if (iceGrid[r4][c4] === 1) {
            if (targetGrid[r4][c4] === 1) overcut = true;
            iceGrid[r4][c4] = 0;
            particles.push({ x:GRID_X+(c4+0.5)*CELL_S, y:GRID_Y+(r4+1)*CELL_S, vx:(Math.random()-0.5)*200, vy:200+Math.random()*150, life:0.6, col:C.chip });
            break;
          }
        }
      }
    }

    if (overcut) {
      overcuts++;
      game.audio.play('se_failure', 0.3);
      if (overcuts >= MAX_OVER && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); return; }
    }

    if (checkComplete()) {
      completed++;
      successFlash = 0.8;
      game.audio.play('se_success', 0.6);
      if (completed >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(completed*500+Math.ceil(timeLeft)*80); }, 700); return; }
      setTimeout(function(){ loadShape(sculptIdx++); }, 900);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successFlash > 0) successFlash -= dt * 2;

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy += 300*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target shape (ghost)
    for (var r = 0; r < GRID_N; r++) {
      for (var c = 0; c < GRID_N; c++) {
        var cx = GRID_X + c*CELL_S + CELL_S/2;
        var cy = GRID_Y + r*CELL_S + CELL_S/2;
        if (targetGrid[r][c] === 1) {
          game.draw.rect(cx-CELL_S/2+4, cy-CELL_S/2+4, CELL_S-8, CELL_S-8, C.target, 0.12);
        }
      }
    }

    // Ice blocks
    for (var r2 = 0; r2 < GRID_N; r2++) {
      for (var c2 = 0; c2 < GRID_N; c2++) {
        if (iceGrid[r2][c2] === 1) {
          var cx2 = GRID_X + c2*CELL_S;
          var cy2 = GRID_Y + r2*CELL_S;
          var shouldKeep = targetGrid[r2][c2] === 1;
          game.draw.rect(cx2+4, cy2+4, CELL_S-8, CELL_S-8, C.iceShadow, 0.4);
          game.draw.rect(cx2+2, cy2+2, CELL_S-4, CELL_S-4, C.ice, 0.75);
          game.draw.rect(cx2+8, cy2+8, CELL_S/3, CELL_S/3, C.iceHi, 0.4);
          if (shouldKeep) {
            // Highlight cells that match target
            game.draw.rect(cx2+2, cy2+2, CELL_S-4, CELL_S-4, C.target, 0.08);
          }
        }
      }
    }

    // Target outline label
    game.draw.text('目標', GRID_X + GRID_N*CELL_S + 40, GRID_Y + GRID_N*CELL_S/2, { size: 36, color: C.targetHi });

    // Swipe hints
    var hintCol = C.ui;
    game.draw.text('↑', W/2, GRID_Y - 60, { size: 64, color: hintCol });
    game.draw.text('↓', W/2, GRID_Y + GRID_N*CELL_S + 60, { size: 64, color: hintCol });
    game.draw.text('←', GRID_X - 60, GRID_Y + GRID_N*CELL_S/2, { size: 64, color: hintCol });
    game.draw.text('→', GRID_X + GRID_N*CELL_S + 60, GRID_Y + GRID_N*CELL_S/2, { size: 64, color: hintCol });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10*p.life, p.col, p.life*0.8);
    }

    if (successFlash > 0) game.draw.rect(0, 0, W, H, C.targetHi, successFlash*0.12);

    // Overcut dots
    for (var oi = 0; oi < MAX_OVER; oi++) {
      game.draw.circle(W/2-(MAX_OVER-1)*30+oi*60, H*0.935, 12, oi < overcuts ? C.over : C.ui, 0.9);
    }

    game.draw.text(completed + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.ice : C.over);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    loadShape(0);
  });
})(game);
