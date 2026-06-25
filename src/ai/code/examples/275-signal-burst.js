// 275-signal-burst.js
// シグナルバースト — 電波塔のスイッチをオンにして全基地に信号を届ける
// 操作: タップで中継塔のスイッチを入れ、信号を繋げる
// 成功: 8基地全てに信号を届ける  失敗: 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030a08',
    line:   '#1e3a1e',
    active: '#22c55e',
    actHi:  '#86efac',
    inactive:'#1e293b',
    inHi:   '#334155',
    source: '#fde68a',
    srcHi:  '#fef3c7',
    base:   '#3b82f6',
    baseHi: '#93c5fd',
    signal: '#4ade80',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Nodes: {x, y, type:'source'|'relay'|'base', active, powered, connections:[idx]}
  var nodes = [];
  var signals = []; // animated pulses
  var powered = []; // set of powered node indices
  var round = 1;
  var ROUNDS = 3;
  var roundCleared = false;
  var clearTimer = 0;
  var done = false;
  var timeLeft = 20;
  var elapsed = 0;
  var totalPowered = 0;
  var NEEDED_BASES = 8;

  function buildLevel(lvl) {
    nodes = [];
    signals = [];
    powered = [];
    roundCleared = false;

    // Source always at center-ish
    nodes.push({ x: W / 2, y: H * 0.45, type: 'source', active: true, powered: true });

    var relayCount = 4 + lvl;
    var baseCount = NEEDED_BASES / ROUNDS;

    // Spread relays
    for (var ri = 0; ri < relayCount; ri++) {
      var ang2 = (ri / relayCount) * Math.PI * 2 + lvl * 0.5;
      var dist2 = 200 + Math.random() * 200;
      nodes.push({
        x: W / 2 + Math.cos(ang2) * dist2,
        y: H * 0.45 + Math.sin(ang2) * dist2 * 0.7,
        type: 'relay', active: false, powered: false
      });
    }

    // Bases
    for (var bi = 0; bi < baseCount; bi++) {
      var ang3 = (bi / baseCount) * Math.PI * 2 + lvl * 0.8 + 0.4;
      var dist3 = 380 + Math.random() * 80;
      nodes.push({
        x: Math.max(100, Math.min(W - 100, W / 2 + Math.cos(ang3) * dist3)),
        y: Math.max(H * 0.18, Math.min(H * 0.78, H * 0.45 + Math.sin(ang3) * dist3 * 0.65)),
        type: 'base', active: false, powered: false
      });
    }

    // Connect: each relay to nearest few nodes
    for (var ni = 0; ni < nodes.length; ni++) {
      nodes[ni].connections = [];
      var distances = [];
      for (var nj = 0; nj < nodes.length; nj++) {
        if (ni === nj) continue;
        var dx = nodes[ni].x - nodes[nj].x, dy = nodes[ni].y - nodes[nj].y;
        distances.push({ idx: nj, d: Math.sqrt(dx * dx + dy * dy) });
      }
      distances.sort(function(a, b) { return a.d - b.d; });
      var maxConn = nodes[ni].type === 'relay' ? 3 : 2;
      for (var k = 0; k < Math.min(maxConn, distances.length); k++) {
        if (distances[k].d < 380) nodes[ni].connections.push(distances[k].idx);
      }
    }
  }

  function propagate() {
    var changed = true;
    while (changed) {
      changed = false;
      for (var ni = 0; ni < nodes.length; ni++) {
        if (!nodes[ni].powered) continue;
        for (var ci = 0; ci < nodes[ni].connections.length; ci++) {
          var target = nodes[nodes[ni].connections[ci]];
          if ((target.type === 'relay' && target.active) || target.type === 'base') {
            if (!target.powered) {
              target.powered = true;
              changed = true;
              signals.push({ fromX: nodes[ni].x, fromY: nodes[ni].y, toX: target.x, toY: target.y, t: 0, speed: 3 });
            }
          }
        }
      }
    }
  }

  function countPoweredBases() {
    var count = 0;
    for (var ni = 0; ni < nodes.length; ni++) {
      if (nodes[ni].type === 'base' && nodes[ni].powered) count++;
    }
    return count;
  }

  game.onTap(function(tx, ty) {
    if (done || roundCleared) return;
    for (var ni = 0; ni < nodes.length; ni++) {
      var n = nodes[ni];
      if (n.type !== 'relay') continue;
      var dx = tx - n.x, dy = ty - n.y;
      if (dx * dx + dy * dy < 50 * 50) {
        n.active = !n.active;
        if (!n.active) n.powered = false;
        // Recompute all
        for (var nj = 0; nj < nodes.length; nj++) {
          if (nodes[nj].type !== 'source') nodes[nj].powered = false;
        }
        propagate();
        game.audio.play('se_tap', 0.3);
        var pb = countPoweredBases();
        totalPowered = pb + (round - 1) * (NEEDED_BASES / ROUNDS);
        if (pb >= NEEDED_BASES / ROUNDS && !roundCleared) {
          roundCleared = true;
          clearTimer = 1.2;
          game.audio.play('se_success', 0.7);
        }
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    for (var si = signals.length - 1; si >= 0; si--) {
      signals[si].t += dt * signals[si].speed;
      if (signals[si].t >= 1) signals.splice(si, 1);
    }

    if (roundCleared) {
      clearTimer -= dt;
      if (clearTimer <= 0) {
        if (round >= ROUNDS) {
          done = true;
          setTimeout(function() { game.end.success(totalPowered * 150 + Math.ceil(timeLeft) * 120); }, 400);
          return;
        }
        round++;
        timeLeft = 20;
        buildLevel(round);
        propagate();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Connection lines
    for (var ni = 0; ni < nodes.length; ni++) {
      for (var ci = 0; ci < nodes[ni].connections.length; ci++) {
        var nj2 = nodes[ni].connections[ci];
        var powered2 = nodes[ni].powered && nodes[nj2].powered;
        game.draw.line(nodes[ni].x, nodes[ni].y, nodes[nj2].x, nodes[nj2].y,
          powered2 ? C.active : C.line, powered2 ? 5 : 3);
      }
    }

    // Signals
    for (var si2 = 0; si2 < signals.length; si2++) {
      var sg = signals[si2];
      var sx = sg.fromX + (sg.toX - sg.fromX) * sg.t;
      var sy = sg.fromY + (sg.toY - sg.fromY) * sg.t;
      game.draw.circle(sx, sy, 14, C.signal, 0.9);
      game.draw.circle(sx, sy, 22, C.signal, 0.3);
    }

    // Nodes
    for (var ni2 = 0; ni2 < nodes.length; ni2++) {
      var n2 = nodes[ni2];
      var isPowered = n2.powered;
      if (n2.type === 'source') {
        game.draw.circle(n2.x, n2.y, 44, C.source, 0.3);
        game.draw.circle(n2.x, n2.y, 34, C.source, 0.9);
        game.draw.circle(n2.x, n2.y, 18, C.srcHi, 0.9);
      } else if (n2.type === 'relay') {
        var col2 = n2.active ? (isPowered ? C.active : C.actHi) : C.inactive;
        var hiCol2 = n2.active ? C.actHi : C.inHi;
        game.draw.rect(n2.x - 30, n2.y - 30, 60, 60, col2, 0.85);
        game.draw.rect(n2.x - 30, n2.y - 30, 60, 10, hiCol2, 0.5);
        game.draw.text(n2.active ? 'ON' : 'OFF', n2.x, n2.y + 8, { size: 28, color: '#fff', bold: true });
        if (isPowered) game.draw.circle(n2.x, n2.y, 44, C.signal, 0.15);
      } else {
        var bcol = isPowered ? C.base : C.inactive;
        var bhi = isPowered ? C.baseHi : C.inHi;
        game.draw.circle(n2.x, n2.y, 34, bcol, 0.85);
        game.draw.circle(n2.x, n2.y, 34, bhi, 0.2);
        game.draw.text('基地', n2.x, n2.y + 10, { size: 26, color: '#fff', bold: true });
        if (isPowered) game.draw.circle(n2.x, n2.y, 48, C.signal, 0.2);
      }
    }

    if (roundCleared) {
      game.draw.text('ラウンド ' + round + ' クリア！', W / 2, H * 0.87, { size: 52, color: C.actHi, bold: true });
    }

    game.draw.text('ラウンド ' + round + ' / ' + ROUNDS, W / 2, 148, { size: 52, color: C.text, bold: true });
    game.draw.text('中継塔をタップしてONに', W / 2, H * 0.93, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : C.base);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    buildLevel(1);
    propagate();
  });
})(game);
