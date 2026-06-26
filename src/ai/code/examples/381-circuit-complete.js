// 381-circuit-complete.js
// 回路完成 — ワイヤーをつなげて電気を流す
// 操作: スワイプで隣のノードに線を引く
// 成功: 5回全ノードを繋げる  失敗: 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030712',
    board:  '#0f1520',
    boardHi:'#1a2535',
    node:   '#334155',
    nodeHi: '#4f5e75',
    nodeOn: '#22c55e',
    nodeOnHi:'#86efac',
    source: '#fbbf24',
    sourceHi:'#fef3c7',
    wire:   '#64748b',
    wireOn: '#22c55e',
    wireOnHi:'#86efac',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 4;
  var CELL = 210;
  var OX = (W - (GRID - 1) * CELL) / 2;
  var OY = H * 0.25;

  var nodes = [];
  var edges = [];    // {a, b, connected}
  var powered = [];
  var level = 0;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var completedLevels = 0;
  var LEVELS = 5;
  var successAnim = 0;

  // Swipe state
  var swipeFromNode = -1;

  function manhattanNeighbors(idx) {
    var r = Math.floor(idx / GRID);
    var c = idx % GRID;
    var nb = [];
    if (r > 0) nb.push(idx - GRID);
    if (r < GRID-1) nb.push(idx + GRID);
    if (c > 0) nb.push(idx - 1);
    if (c < GRID-1) nb.push(idx + 1);
    return nb;
  }

  function setupLevel() {
    nodes = [];
    edges = [];
    powered = [];
    for (var i = 0; i < GRID * GRID; i++) {
      var r = Math.floor(i / GRID);
      var c = i % GRID;
      nodes.push({ x: OX + c * CELL, y: OY + r * CELL, on: false });
    }
    // Source = node 0
    nodes[0].source = true;
    nodes[0].on = true;
    // Random spanning tree-like edges
    var visited = [0];
    var attempts = 0;
    while (visited.length < GRID * GRID && attempts < 1000) {
      attempts++;
      var from = visited[Math.floor(Math.random() * visited.length)];
      var nb = manhattanNeighbors(from);
      var to = nb[Math.floor(Math.random() * nb.length)];
      if (visited.indexOf(to) < 0) {
        visited.push(to);
        edges.push({ a: from, b: to, connected: false });
      }
    }
    // Add a few random extra edges
    for (var ei = 0; ei < 3; ei++) {
      var rndA = Math.floor(Math.random() * GRID * GRID);
      var nb2 = manhattanNeighbors(rndA);
      var rndB = nb2[Math.floor(Math.random() * nb2.length)];
      if (rndA !== rndB && !edgeExists(rndA, rndB)) {
        edges.push({ a: rndA, b: rndB, connected: false });
      }
    }
    updatePower();
  }

  function edgeExists(a, b) {
    for (var i = 0; i < edges.length; i++) {
      if ((edges[i].a === a && edges[i].b === b) || (edges[i].a === b && edges[i].b === a)) return true;
    }
    return false;
  }

  function updatePower() {
    // BFS from source
    var on = new Array(GRID * GRID).fill(false);
    on[0] = true;
    var queue = [0];
    while (queue.length > 0) {
      var cur = queue.shift();
      for (var ei = 0; ei < edges.length; ei++) {
        var e = edges[ei];
        if (!e.connected) continue;
        var other = -1;
        if (e.a === cur) other = e.b;
        else if (e.b === cur) other = e.a;
        if (other >= 0 && !on[other]) {
          on[other] = true;
          queue.push(other);
        }
      }
    }
    for (var ni = 0; ni < nodes.length; ni++) {
      nodes[ni].on = on[ni];
    }
    // Check if all lit
    for (var ni2 = 0; ni2 < nodes.length; ni2++) {
      if (!nodes[ni2].on) return false;
    }
    return true;
  }

  function nodeAtPos(tx, ty) {
    for (var i = 0; i < nodes.length; i++) {
      if (Math.hypot(tx - nodes[i].x, ty - nodes[i].y) < 60) return i;
    }
    return -1;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    swipeFromNode = nodeAtPos(tx, ty);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var from = nodeAtPos(x1, y1);
    var to = nodeAtPos(x2, y2);
    if (from < 0 || to < 0 || from === to) return;
    // Check adjacency
    var nb = manhattanNeighbors(from);
    if (nb.indexOf(to) < 0) return;
    // Find or create edge
    var found = false;
    for (var ei = 0; ei < edges.length; ei++) {
      var e = edges[ei];
      if ((e.a === from && e.b === to) || (e.a === to && e.b === from)) {
        e.connected = !e.connected;
        found = true;
        break;
      }
    }
    if (!found) {
      edges.push({ a: from, b: to, connected: true });
    }
    game.audio.play('se_tap', 0.3);
    var allOn = updatePower();
    if (allOn) {
      completedLevels++;
      successAnim = 1.2;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang)*220, vy: Math.sin(ang)*220, life:0.7, col: C.wireOn });
      }
      if (completedLevels >= LEVELS && !done) {
        done = true;
        setTimeout(function() { game.end.success(completedLevels * 600 + Math.ceil(timeLeft) * 80); }, 1200);
      } else if (!done) {
        setTimeout(function() { setupLevel(); successAnim = 0; }, 1400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successAnim > 0) successAnim -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(80, H * 0.18, W - 160, H * 0.68, C.board, 0.9);

    // Grid lines (faint)
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        game.draw.circle(OX + c * CELL, OY + r * CELL, 4, C.boardHi, 0.5);
      }
    }

    // Edges
    for (var ei = 0; ei < edges.length; ei++) {
      var e = edges[ei];
      var na = nodes[e.a], nb2 = nodes[e.b];
      var bothOn = na.on && nb2.on;
      game.draw.line(na.x, na.y, nb2.x, nb2.y,
        e.connected ? (bothOn ? C.wireOn : C.wire) : C.boardHi,
        e.connected ? (bothOn ? 8 : 6) : 3
      );
      if (e.connected && bothOn) {
        // Energy flow animation
        var frac = (elapsed * 3) % 1;
        var ex2 = na.x + (nb2.x - na.x) * frac;
        var ey2 = na.y + (nb2.y - na.y) * frac;
        game.draw.circle(ex2, ey2, 8, C.wireOnHi, 0.8);
      }
    }

    // Nodes
    for (var ni = 0; ni < nodes.length; ni++) {
      var n = nodes[ni];
      var nc = n.on ? (n.source ? C.source : C.nodeOn) : C.node;
      var nhi = n.on ? (n.source ? C.sourceHi : C.nodeOnHi) : C.nodeHi;
      game.draw.circle(n.x, n.y, 36, nc, 0.9);
      game.draw.circle(n.x, n.y, 22, nhi, 0.85);
      if (n.source) {
        game.draw.text('⚡', n.x, n.y + 12, { size: 28 });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (successAnim > 0) {
      game.draw.text('回路完成！', W / 2, H * 0.87, { size: 56, color: C.wireOnHi, bold: true });
    }

    game.draw.text(completedLevels + ' / ' + LEVELS, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireOn : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    setupLevel();
  });
})(game);
