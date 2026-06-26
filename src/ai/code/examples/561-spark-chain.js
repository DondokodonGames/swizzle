// 561-spark-chain.js
// スパークチェーン — 電気スパークが流れるルートをタップで完成させる
// 操作: タップでノードを繋いでスパークのルートを作る
// 成功: 12回ルート完成  失敗: 10回失敗 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000810',
    node:    '#0044aa',
    nodeHi:  '#0088ff',
    nodeGlow:'#0088ff22',
    start:   '#ff6600',
    startHi: '#ffaa44',
    end:     '#22ff88',
    endHi:   '#88ffcc',
    spark:   '#88ddff',
    sparkHi: '#ffffff',
    wire:    '#004488',
    wireHi:  '#0066cc',
    wrong:   '#ff2244',
    correct: '#22ff88',
    text:    '#f1f5f9',
    ui:      '#334466'
  };

  var COLS = 5, ROWS = 7;
  var CELL = 180;
  var OX = (W - (COLS - 1) * CELL) / 2;
  var OY = H * 0.14;
  var NODE_R = 36;

  var nodes = [];
  var correctPath = [];
  var playerPath = [];
  var selectedNode = -1;
  var sparkPos = 0; // animation along path
  var sparkPhase = 'idle'; // 'idle' | 'animating' | 'result'
  var completions = 0;
  var NEEDED = 12;
  var failures = 0;
  var MAX_FAIL = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0;

  function nodeX(i) { return OX + (nodes[i].col) * CELL; }
  function nodeY(i) { return OY + (nodes[i].row) * CELL; }

  function generatePuzzle() {
    nodes = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        nodes.push({ col: c, row: r, isStart: false, isEnd: false });
      }
    }

    // Generate a random path from top to bottom
    correctPath = [];
    var startCol = Math.floor(Math.random() * COLS);
    var endCol = Math.floor(Math.random() * COLS);
    var startIdx = startCol;
    var endIdx = (ROWS - 1) * COLS + endCol;

    nodes[startIdx].isStart = true;
    nodes[endIdx].isEnd = true;

    // Simple path: zigzag from top to bottom
    correctPath = [startIdx];
    var curRow = 0, curCol = startCol;
    while (curRow < ROWS - 1) {
      curRow++;
      if (curCol !== endCol) {
        var diff = endCol - curCol;
        if (Math.abs(diff) > 0 && Math.random() < 0.6) {
          curCol += diff > 0 ? 1 : -1;
        }
      }
      curPath_next: {
        // Shuffle possible moves
        var moves = [0, -1, 1];
        for (var mi = moves.length - 1; mi > 0; mi--) {
          var mj = Math.floor(Math.random() * (mi + 1));
          var tmp = moves[mi]; moves[mi] = moves[mj]; moves[mj] = tmp;
        }
        for (var mi2 = 0; mi2 < moves.length; mi2++) {
          var nc = curCol + moves[mi2];
          if (nc >= 0 && nc < COLS) {
            curCol = nc;
            break;
          }
        }
      }
      correctPath.push(curRow * COLS + curCol);
    }
    // Ensure path ends at endIdx by fixing last node
    correctPath[correctPath.length - 1] = endIdx;
    nodes[endIdx].isEnd = true;

    playerPath = [];
    selectedNode = -1;
    sparkPhase = 'idle';
    sparkPos = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (sparkPhase === 'animating') return;

    // Find tapped node
    var tapped = -1;
    for (var i = 0; i < nodes.length; i++) {
      var nx = nodeX(i), ny = nodeY(i);
      var dx = tx - nx, dy = ty - ny;
      if (Math.sqrt(dx * dx + dy * dy) < NODE_R + 20) {
        tapped = i;
        break;
      }
    }

    if (tapped === -1) { selectedNode = -1; playerPath = []; return; }

    var n = nodes[tapped];
    if (n.isStart && playerPath.length === 0) {
      playerPath = [tapped];
      selectedNode = tapped;
      game.audio.play('se_tap', 0.3);
      return;
    }

    if (playerPath.length === 0) {
      selectedNode = -1;
      return;
    }

    // Check adjacency
    var lastIdx = playerPath[playerPath.length - 1];
    var lastN = nodes[lastIdx];
    var dr = Math.abs(n.row - lastN.row), dc = Math.abs(n.col - lastN.col);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      // Adjacent
      if (playerPath.indexOf(tapped) !== -1) {
        // Already in path — trim
        var cutIdx = playerPath.indexOf(tapped);
        playerPath = playerPath.slice(0, cutIdx + 1);
        selectedNode = tapped;
        game.audio.play('se_tap', 0.2);
        return;
      }
      playerPath.push(tapped);
      selectedNode = tapped;
      game.audio.play('se_tap', 0.3);

      if (n.isEnd) {
        // Check if correct
        var correct = playerPath.length === correctPath.length;
        if (correct) {
          for (var ci = 0; ci < playerPath.length; ci++) {
            if (playerPath[ci] !== correctPath[ci]) { correct = false; break; }
          }
        }
        if (correct) {
          sparkPhase = 'animating';
          sparkPos = 0;
          game.audio.play('se_success', 0.7);
        } else {
          failures++;
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultTimer = 0.8;
          game.audio.play('se_failure', 0.4);
          playerPath = [];
          selectedNode = -1;
          if (failures >= MAX_FAIL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    } else {
      game.audio.play('se_failure', 0.1);
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
    if (resultTimer > 0) resultTimer -= dt;

    if (sparkPhase === 'animating') {
      sparkPos += dt * 6;
      if (sparkPos >= playerPath.length - 1) {
        sparkPos = playerPath.length - 1;
        sparkPhase = 'result';
        completions++;
        flashCol = C.correct;
        flashAnim = 0.5;
        game.audio.play('se_success', 0.9);
        var lastN2 = nodes[playerPath[playerPath.length - 1]];
        for (var pi = 0; pi < 14; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: nodeX(playerPath[playerPath.length-1]), y: nodeY(playerPath[playerPath.length-1]), vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.endHi });
        }
        if (completions >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(completions * 500 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) generatePuzzle(); }, 900);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Wires (all possible connections)
    for (var i = 0; i < nodes.length; i++) {
      var n2 = nodes[i];
      // Right
      if (n2.col < COLS - 1) {
        var r2 = i + 1;
        game.draw.line(nodeX(i), nodeY(i), nodeX(r2), nodeY(r2), C.wire, 4);
      }
      // Down
      if (n2.row < ROWS - 1) {
        var d2 = i + COLS;
        game.draw.line(nodeX(i), nodeY(i), nodeX(d2), nodeY(d2), C.wire, 4);
      }
    }

    // Player path
    for (var pi2 = 1; pi2 < playerPath.length; pi2++) {
      var pa = playerPath[pi2 - 1], pb = playerPath[pi2];
      game.draw.line(nodeX(pa), nodeY(pa), nodeX(pb), nodeY(pb), C.wireHi, 8);
    }

    // Spark animation
    if (sparkPhase === 'animating' && playerPath.length > 1) {
      var sIdx = Math.floor(sparkPos);
      var sFrac = sparkPos - sIdx;
      var sa = playerPath[Math.min(sIdx, playerPath.length - 1)];
      var sb = playerPath[Math.min(sIdx + 1, playerPath.length - 1)];
      var sx = nodeX(sa) + (nodeX(sb) - nodeX(sa)) * sFrac;
      var sy = nodeY(sa) + (nodeY(sb) - nodeY(sa)) * sFrac;
      game.draw.circle(sx, sy, 24, C.sparkHi, 0.9);
      game.draw.circle(sx, sy, 40, C.spark, 0.3);
    }

    // Nodes
    for (var i2 = 0; i2 < nodes.length; i2++) {
      var n3 = nodes[i2];
      var nx2 = nodeX(i2), ny2 = nodeY(i2);
      var inPath = playerPath.indexOf(i2) !== -1;
      var col = n3.isStart ? C.start : n3.isEnd ? C.end : (inPath ? C.nodeHi : C.node);
      game.draw.circle(nx2, ny2, NODE_R + 6, col, 0.15);
      game.draw.circle(nx2, ny2, NODE_R, col, 0.9);
      if (i2 === selectedNode) {
        game.draw.circle(nx2, ny2, NODE_R + 14, C.sparkHi, 0.3 + Math.sin(elapsed * 6) * 0.1);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 40 + fi * 80, H * 0.955, 16, fi < failures ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(completions + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.nodeHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    generatePuzzle();
  });
})(game);
