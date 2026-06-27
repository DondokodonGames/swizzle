// 589-wire-cross.js
// ワイヤークロス — 交差する電線を繋ぎ直して回路を完成させる
// 操作: スワイプで線の端点をドラッグして別の端点に繋ぐ
// 成功: 10回路完成  失敗: 8回失敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050810',
    grid:    '#0a1020',
    wire:    '#3366ff',
    wireHi:  '#88aaff',
    active:  '#ffaa00',
    activeHi:'#ffdd88',
    done:    '#22c55e',
    doneHi:  '#86efac',
    wrong:   '#ef4444',
    node:    '#ffffff',
    text:    '#f1f5f9',
    ui:      '#1a2a4a'
  };

  var PAD = 120;
  var COLS = 4;
  var NODE_R = 38;
  var nodes = [];
  var connections = [];
  var activeNode = -1;
  var puzzlesDone = 0;
  var NEEDED = 10;
  var fails = 0;
  var MAX_FAIL = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.done;

  function generatePuzzle() {
    nodes = [];
    connections = [];
    activeNode = -1;

    // 4 pairs of nodes to connect
    var PAIRS = 4;
    var leftX = PAD + 80;
    var rightX = W - PAD - 80;
    var spacing = (H * 0.6) / (PAIRS + 1);
    var startY = H * 0.2;

    // Left nodes (sources)
    var rightOrder = [0, 1, 2, 3];
    // Shuffle right order to create crossings
    for (var i = rightOrder.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = rightOrder[i]; rightOrder[i] = rightOrder[j]; rightOrder[j] = tmp;
    }

    for (var pi = 0; pi < PAIRS; pi++) {
      nodes.push({
        x: leftX, y: startY + spacing * (pi + 1),
        pair: pi, side: 'left', connected: false, id: pi * 2
      });
      nodes.push({
        x: rightX, y: startY + spacing * (rightOrder[pi] + 1),
        pair: pi, side: 'right', connected: false, id: pi * 2 + 1
      });
    }

    // Colors per pair
    var pairCols = ['#ff4466', '#44aaff', '#44ffaa', '#ffcc00'];
    for (var ni = 0; ni < nodes.length; ni++) {
      nodes[ni].col = pairCols[nodes[ni].pair];
    }
  }

  function checkComplete() {
    for (var ni = 0; ni < nodes.length; ni++) {
      if (!nodes[ni].connected) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Select node
    var hit = -1;
    for (var ni = 0; ni < nodes.length; ni++) {
      var n = nodes[ni];
      if (n.connected) continue;
      var dx = tx - n.x, dy = ty - n.y;
      if (dx * dx + dy * dy < (NODE_R + 30) * (NODE_R + 30)) {
        hit = ni;
        break;
      }
    }
    if (hit >= 0) {
      if (activeNode < 0) {
        activeNode = hit;
        game.audio.play('se_tap', 0.2);
      } else if (activeNode === hit) {
        activeNode = -1;
      } else {
        // Try to connect
        var a = nodes[activeNode], b = nodes[hit];
        if (a.pair === b.pair && a.side !== b.side) {
          // Correct connection!
          a.connected = true;
          b.connected = true;
          connections.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, col: a.col, pair: a.pair });
          activeNode = -1;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            particles.push({ x: mx, y: my, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: a.col });
          }
          if (checkComplete()) {
            puzzlesDone++;
            flashCol = C.done;
            flashAnim = 0.4;
            game.audio.play('se_success', 0.8);
            if (puzzlesDone >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(puzzlesDone * 400 + Math.ceil(timeLeft) * 80); }, 700);
            } else {
              setTimeout(function() { if (!done) generatePuzzle(); }, 900);
            }
          }
        } else {
          // Wrong
          fails++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          activeNode = -1;
          game.audio.play('se_failure', 0.3);
          if (fails >= MAX_FAIL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    } else {
      activeNode = -1;
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

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid lines
    for (var gi = 0; gi < 12; gi++) {
      game.draw.line(0, H * 0.15 + gi * (H * 0.7 / 12), W, H * 0.15 + gi * (H * 0.7 / 12), C.grid, 1);
    }

    // Completed connections
    for (var ci = 0; ci < connections.length; ci++) {
      var conn = connections[ci];
      // Draw wire with curve-ish look via midpoint
      var mx = W / 2;
      game.draw.line(conn.ax, conn.ay, mx, (conn.ay + conn.by) / 2, conn.col, 6);
      game.draw.line(mx, (conn.ay + conn.by) / 2, conn.bx, conn.by, conn.col, 6);
      game.draw.line(conn.ax, conn.ay, mx, (conn.ay + conn.by) / 2, C.wireHi, 2);
      game.draw.line(mx, (conn.ay + conn.by) / 2, conn.bx, conn.by, C.wireHi, 2);
    }

    // Active line preview
    if (activeNode >= 0) {
      var an = nodes[activeNode];
      // Pulse
      game.draw.circle(an.x, an.y, NODE_R + 20 + Math.sin(elapsed * 8) * 8, C.active, 0.3);
    }

    // Nodes
    for (var ni2 = 0; ni2 < nodes.length; ni2++) {
      var n2 = nodes[ni2];
      if (n2.connected) {
        game.draw.circle(n2.x, n2.y, NODE_R, C.done, 0.8);
        game.draw.circle(n2.x, n2.y, NODE_R * 0.5, C.doneHi, 0.6);
        continue;
      }
      var isActive = (ni2 === activeNode);
      game.draw.circle(n2.x + 4, n2.y + 4, NODE_R, '#000', 0.3);
      game.draw.circle(n2.x, n2.y, NODE_R, n2.col, isActive ? 1.0 : 0.8);
      game.draw.circle(n2.x - NODE_R * 0.25, n2.y - NODE_R * 0.25, NODE_R * 0.3, '#fff', 0.4);
      if (isActive) {
        game.draw.circle(n2.x, n2.y, NODE_R + 14, C.active, 0.4);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 44 + fi * 88, H * 0.955, 18, fi < fails ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(puzzlesDone + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.wire : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    generatePuzzle();
  });
})(game);
