// 612-pulse-grid.js
// パルスグリッド — 波紋が広がるタイミングに合わせてタップ
// 操作: タップで波紋の中心を叩いて増幅、重なったタイミングでコンボ
// 成功: 400ポイント  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#020408',
    ring1: '#0ea5e9',
    ring2: '#8b5cf6',
    ring3: '#ec4899',
    hit:   '#f59e0b',
    hitHi: '#fde68a',
    good:  '#22c55e',
    text:  '#f1f5f9',
    ui:    '#0a1020',
    miss:  '#ef4444'
  };

  var RING_COLS = [C.ring1, C.ring2, C.ring3];
  var GRID_COLS = 3;
  var GRID_ROWS = 4;
  var CELL_W = W / GRID_COLS;
  var CELL_H = H * 0.7 / GRID_ROWS;
  var GRID_OY = H * 0.18;

  var nodes = [];
  var score = 0;
  var NEEDED = 400;
  var combo = 0;
  var comboTimer = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.good;
  var comboText = '';
  var comboTextTimer = 0;

  function initNodes() {
    nodes = [];
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        nodes.push({
          x: CELL_W * c + CELL_W / 2,
          y: GRID_OY + CELL_H * r + CELL_H / 2,
          col: RING_COLS[(r + c) % RING_COLS.length],
          rings: [], // { r, maxR, life, maxLife }
          pulseTimer: 1 + Math.random() * 2,
          pulseInterval: 1.5 + Math.random() * 1.5,
          active: false // true = ring is at sweet spot
        });
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find closest node
    var best = -1, bestDist = 120;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var dx = tx - n.x, dy = ty - n.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best < 0) { combo = 0; return; }

    var node = nodes[best];
    // Check if any ring is at sweet spot (radius 50-90)
    var hit = false;
    for (var ri = node.rings.length - 1; ri >= 0; ri--) {
      var ring = node.rings[ri];
      var progress = ring.r / ring.maxR;
      if (progress >= 0.45 && progress <= 0.75) {
        hit = true;
        combo++;
        comboTimer = 1.5;
        var pts = 10 * Math.min(combo, 5);
        score += pts;
        node.rings.splice(ri, 1);
        // Amplify with new ring
        node.rings.push({ r: 20, maxR: ring.maxR * 0.8, life: 0.8, maxLife: 0.8 });
        game.audio.play('se_success', 0.4 + Math.min(combo * 0.05, 0.4));

        if (combo >= 4) {
          comboText = combo + 'コンボ! +' + pts;
          comboTextTimer = 0.8;
        }
        flashCol = C.good;
        flashAnim = 0.15;

        for (var p = 0; p < 6; p++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: node.x, y: node.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: node.col });
        }
        break;
      }
    }
    if (!hit) {
      combo = 0;
      flashCol = C.miss;
      flashAnim = 0.1;
      game.audio.play('se_failure', 0.15);
    }

    if (score >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(score + Math.ceil(timeLeft) * 20); }, 700);
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
    if (comboTimer > 0) comboTimer -= dt; else combo = 0;
    if (comboTextTimer > 0) comboTextTimer -= dt;

    for (var ni = 0; ni < nodes.length; ni++) {
      var node = nodes[ni];
      node.pulseTimer -= dt;
      if (node.pulseTimer <= 0) {
        node.pulseTimer = node.pulseInterval;
        var maxR = 90 + Math.random() * 40;
        node.rings.push({ r: 10, maxR: maxR, life: 1.2, maxLife: 1.2 });
        game.audio.play('se_tap', 0.05);
      }
      for (var ri2 = node.rings.length - 1; ri2 >= 0; ri2--) {
        var ring = node.rings[ri2];
        ring.r += (ring.maxR / ring.maxLife) * dt;
        ring.life -= dt;
        if (ring.life <= 0) node.rings.splice(ri2, 1);
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

    // Grid lines
    for (var c = 1; c < GRID_COLS; c++) {
      game.draw.line(c * CELL_W, GRID_OY, c * CELL_W, GRID_OY + CELL_H * GRID_ROWS, C.ui, 2);
    }
    for (var r2 = 1; r2 < GRID_ROWS; r2++) {
      game.draw.line(0, GRID_OY + r2 * CELL_H, W, GRID_OY + r2 * CELL_H, C.ui, 2);
    }

    // Nodes and rings
    for (var ni2 = 0; ni2 < nodes.length; ni2++) {
      var node2 = nodes[ni2];
      // Draw rings
      for (var ri3 = 0; ri3 < node2.rings.length; ri3++) {
        var ring2 = node2.rings[ri3];
        var alpha = ring2.life / ring2.maxLife;
        var progress = ring2.r / ring2.maxR;
        var isSweetSpot = progress >= 0.45 && progress <= 0.75;
        var ringAlpha = isSweetSpot ? alpha * 0.9 : alpha * 0.4;
        game.draw.circle(node2.x, node2.y, ring2.r, node2.col, ringAlpha * 0.3);
        game.draw.circle(node2.x, node2.y, ring2.r + 3, node2.col, ringAlpha * (isSweetSpot ? 0.8 : 0.4));
      }
      // Node center
      game.draw.circle(node2.x, node2.y, 20, node2.col, 0.8);
      game.draw.circle(node2.x, node2.y, 10, '#fff', 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (comboTextTimer > 0) {
      game.draw.text(comboText, W / 2, H * 0.9, { size: 52, color: C.hitHi, bold: true });
    } else {
      game.draw.text('光輪を叩け!', W / 2, H * 0.9, { size: 38, color: C.ui });
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.ring1 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    initNodes();
  });
})(game);
