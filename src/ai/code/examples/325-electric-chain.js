// 325-electric-chain.js
// エレクトリックチェーン — 電気を流すノードをタップして回路を完成させる
// 操作: タップで電線ノードを順番に繋ぐ（最短経路）
// 成功: 12回路完成  失敗: 5回失敗 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020712',
    wire:   '#1e3a5f',
    wireHi: '#1d4ed8',
    node:   '#334155',
    nodeHi: '#475569',
    power:  '#22d3ee',
    powerHi:'#a5f3fc',
    spark:  '#fbbf24',
    active: '#3b82f6',
    goal:   '#22c55e',
    goalHi: '#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var GRID_COLS = 5;
  var GRID_ROWS = 7;
  var CELL_W = Math.floor(W * 0.8 / GRID_COLS);
  var CELL_H = Math.floor(H * 0.55 / GRID_ROWS);
  var GRID_LEFT = W * 0.1;
  var GRID_TOP = H * 0.22;

  var nodes = [];
  var path = []; // required path of node indices
  var playerPath = []; // player's clicked path so far
  var circuitsDone = 0;
  var NEEDED = 12;
  var failures = 0;
  var MAX_FAIL = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var successAnim = 0;
  var failAnim = 0;

  function nodeAt(col, row) {
    return row * GRID_COLS + col;
  }

  function generateCircuit() {
    nodes = [];
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        nodes.push({
          x: GRID_LEFT + c * CELL_W + CELL_W / 2,
          y: GRID_TOP + r * CELL_H + CELL_H / 2,
          col: c, row: r,
          onPath: false,
          visited: false
        });
      }
    }

    // Generate random path from top row to bottom row
    path = [];
    var startCol = Math.floor(Math.random() * GRID_COLS);
    var curCol = startCol;
    path.push(nodeAt(curCol, 0));
    nodes[nodeAt(curCol, 0)].onPath = true;

    for (var r = 1; r < GRID_ROWS; r++) {
      var moves = [-1, 0, 1];
      var moved = false;
      // Shuffle moves
      for (var m = moves.length - 1; m > 0; m--) {
        var j = Math.floor(Math.random() * (m + 1));
        var tmp = moves[m]; moves[m] = moves[j]; moves[j] = tmp;
      }
      for (var mi = 0; mi < moves.length; mi++) {
        var nc = curCol + moves[mi];
        if (nc >= 0 && nc < GRID_COLS) {
          curCol = nc;
          var ni = nodeAt(curCol, r);
          path.push(ni);
          nodes[ni].onPath = true;
          moved = true;
          break;
        }
      }
      if (!moved) {
        path.push(nodeAt(curCol, r));
        nodes[nodeAt(curCol, r)].onPath = true;
      }
    }

    playerPath = [];
  }

  game.onTap(function(tx, ty) {
    if (done || successAnim > 0 || failAnim > 0) return;

    // Find nearest node
    var best = -1, bestDist = 999;
    for (var ni = 0; ni < nodes.length; ni++) {
      var d = Math.hypot(tx - nodes[ni].x, ty - nodes[ni].y);
      if (d < bestDist) { bestDist = d; best = ni; }
    }
    if (best < 0 || bestDist > CELL_W * 0.7) return;

    var expected = path[playerPath.length];
    if (best === expected) {
      playerPath.push(best);
      nodes[best].visited = true;
      game.audio.play('se_tap', 0.25 + playerPath.length * 0.02);
      // Spark
      particles.push({ x: nodes[best].x, y: nodes[best].y, vx: 0, vy: 0, life: 0.3, col: C.spark, r: 30 });

      if (playerPath.length === path.length) {
        // Circuit complete!
        circuitsDone++;
        successAnim = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: nodes[best].x, y: nodes[best].y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.6, col: C.powerHi });
        }
        if (circuitsDone >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(circuitsDone * 200 + Math.ceil(timeLeft) * 100); }, 600);
          return;
        }
        setTimeout(function() { if (!done) generateCircuit(); }, 700);
      }
    } else {
      // Wrong node
      failures++;
      failAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      for (var pi2 = 0; pi2 < 6; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: nodes[best].x, y: nodes[best].y, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150, life: 0.4, col: C.wrong });
      }
      if (failures >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      // Reset player path
      for (var ni2 = 0; ni2 < nodes.length; ni2++) nodes[ni2].visited = false;
      playerPath = [];
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successAnim > 0) successAnim -= dt * 1.5;
    if (failAnim > 0) failAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid wires (background)
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS - 1; c++) {
        var n1 = nodes[nodeAt(c, r)];
        var n2 = nodes[nodeAt(c + 1, r)];
        game.draw.line(n1.x, n1.y, n2.x, n2.y, C.wire, 3);
      }
    }
    for (var r2 = 0; r2 < GRID_ROWS - 1; r2++) {
      for (var c2 = 0; c2 < GRID_COLS; c2++) {
        var n3 = nodes[nodeAt(c2, r2)];
        var n4 = nodes[nodeAt(c2, r2 + 1)];
        game.draw.line(n3.x, n3.y, n4.x, n4.y, C.wire, 3);
      }
    }

    // Player path highlight
    for (var pp2 = 0; pp2 < playerPath.length - 1; pp2++) {
      var pa = nodes[playerPath[pp2]];
      var pb = nodes[playerPath[pp2 + 1]];
      game.draw.line(pa.x, pa.y, pb.x, pb.y, C.power, 8);
    }

    // Start and end indicators
    if (path.length > 0) {
      var startNode = nodes[path[0]];
      var endNode = nodes[path[path.length - 1]];
      game.draw.circle(startNode.x, startNode.y, 24, C.spark, 0.8);
      game.draw.circle(endNode.x, endNode.y, 24, C.goalHi, 0.8);
      game.draw.text('S', startNode.x, startNode.y + 10, { size: 24, color: '#fff', bold: true });
      game.draw.text('G', endNode.x, endNode.y + 10, { size: 24, color: '#fff', bold: true });
    }

    // Nodes
    for (var ni3 = 0; ni3 < nodes.length; ni3++) {
      var node = nodes[ni3];
      var isVisited = node.visited;
      var isNext = path[playerPath.length] === ni3;
      var col = isVisited ? C.power : (isNext ? C.active : C.node);
      game.draw.circle(node.x, node.y, isNext ? 24 : 18, col, isNext ? 0.9 : 0.7);
      if (isNext) {
        game.draw.circle(node.x, node.y, 18 + 6 * Math.sin(elapsed * 8), C.powerHi, 0.4);
      }
    }

    // Success/fail overlays
    if (successAnim > 0) {
      game.draw.rect(0, 0, W, H, C.goal, successAnim * 0.15);
      game.draw.text('CONNECTED!', W / 2, H * 0.86, { size: 56, color: C.goalHi, bold: true });
    }
    if (failAnim > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, failAnim * 0.15);
    }

    // Particles
    for (var pp3 = 0; pp3 < particles.length; pp3++) {
      var p = particles[pp3];
      var pr = p.r || 8;
      game.draw.circle(p.x, p.y, pr * p.life * 2, p.col, p.life * 0.8);
    }

    // Failures
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 28 + fi * 56, H * 0.92, 16, fi < failures ? C.wrong : '#020712');
    }

    game.draw.text(circuitsDone + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateCircuit();
  });
})(game);
