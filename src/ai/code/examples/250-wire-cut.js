// 250-wire-cut.js
// ワイヤーカット — 爆弾解除！正しいワイヤーだけを切っていく緊張感
// 操作: スワイプでワイヤーを切る
// 成功: 赤ワイヤーだけを5本切る  失敗: 青・黄・白を切る or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0800',
    bomb:   '#1a1a10',
    bombHi: '#2d2d18',
    red:    '#ef4444',
    redHi:  '#fca5a5',
    blue:   '#3b82f6',
    blueHi: '#93c5fd',
    yellow: '#f59e0b',
    yelHi:  '#fde68a',
    white:  '#e2e8f0',
    whiHi:  '#fff',
    green:  '#22c55e',
    cut:    '#94a3b8',
    ui:     '#475569',
    timer:  '#ef4444'
  };

  var WIRE_COLORS = [
    { name: '赤', col: C.red, hi: C.redHi, correct: true },
    { name: '青', col: C.blue, hi: C.blueHi, correct: false },
    { name: '黄', col: C.yellow, hi: C.yelHi, correct: false },
    { name: '白', col: C.white, hi: C.whiHi, correct: false }
  ];

  var WIRE_COUNT = 6;
  var wires = [];
  var cutCount = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 25;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var sparks = [];

  function initWires() {
    wires = [];
    var positions = [];
    for (var i = 0; i < WIRE_COUNT; i++) positions.push(i);

    // Shuffle
    for (var j = positions.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = positions[j]; positions[j] = positions[k]; positions[k] = tmp;
    }

    // Assign colors ensuring 2-3 red wires
    var redCount = 2 + Math.floor(Math.random() * 2);
    var colorAssign = [];
    for (var ri = 0; ri < redCount; ri++) colorAssign.push(0); // red
    while (colorAssign.length < WIRE_COUNT) colorAssign.push(1 + Math.floor(Math.random() * 3));

    // Shuffle color assignment
    for (var ci = colorAssign.length - 1; ci > 0; ci--) {
      var cj = Math.floor(Math.random() * (ci + 1));
      var ctmp = colorAssign[ci]; colorAssign[ci] = colorAssign[cj]; colorAssign[cj] = ctmp;
    }

    for (var wi = 0; wi < WIRE_COUNT; wi++) {
      var wc = WIRE_COLORS[colorAssign[wi]];
      var yPos = H * 0.28 + wi * 120;
      // Wire goes from left panel to right panel with a slight curve
      var midX = W * 0.3 + Math.random() * W * 0.4;
      var midY = yPos + (Math.random() - 0.5) * 40;
      wires.push({
        color: wc,
        x1: W * 0.08, y1: yPos,
        mx: midX, my: midY,
        x2: W * 0.92, y2: yPos,
        cut: false,
        cutX: 0, cutY: 0
      });
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;

    // Check which wire the swipe crosses
    for (var wi = 0; wi < wires.length; wi++) {
      var wire = wires[wi];
      if (wire.cut) continue;

      // Check if swipe line crosses the wire segment (simplified: check distance to midpoint)
      var wx = wire.mx, wy = wire.my;
      var sdx = x2 - x1, sdy = y2 - y1;
      var slen = Math.sqrt(sdx * sdx + sdy * sdy);
      if (slen < 1) continue;
      var tx2 = wx - x1, ty2 = wy - y1;
      var proj = (tx2 * sdx + ty2 * sdy) / slen;
      var perp = Math.abs(tx2 * sdy - ty2 * sdx) / slen;

      if (perp < 30 && proj >= 0 && proj <= slen) {
        wire.cut = true;
        wire.cutX = wx;
        wire.cutY = wy;

        if (wire.color.correct) {
          cutCount++;
          feedback = '赤を切った！ (' + cutCount + '/' + NEEDED + ')';
          feedbackCol = C.green;
          feedbackTimer = 0.6;
          game.audio.play('se_success', 0.7);
          for (var si = 0; si < 8; si++) {
            var ang = Math.random() * Math.PI * 2;
            sparks.push({ x: wx, y: wy, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: wire.color.hi });
          }
          if (cutCount >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(cutCount * 200 + Math.ceil(timeLeft) * 100); }, 500);
          }
        } else {
          feedback = '間違い！爆発！';
          feedbackCol = C.red;
          feedbackTimer = 0.8;
          game.audio.play('se_failure', 0.8);
          for (var si2 = 0; si2 < 20; si2++) {
            var ang2 = Math.random() * Math.PI * 2;
            sparks.push({ x: wx, y: wy, vx: Math.cos(ang2) * 350, vy: Math.sin(ang2) * 350, life: 0.8, col: C.red });
          }
          done = true;
          setTimeout(function() { game.end.failure(); }, 800);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var si = sparks.length - 1; si >= 0; si--) {
      sparks[si].x += sparks[si].vx * dt;
      sparks[si].y += sparks[si].vy * dt;
      sparks[si].vy += 300 * dt;
      sparks[si].life -= dt;
      if (sparks[si].life <= 0) sparks.splice(si, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bomb body
    game.draw.rect(W * 0.06, H * 0.18, W * 0.88, H * 0.72, C.bomb, 0.9);
    game.draw.rect(W * 0.06, H * 0.18, W * 0.88, 8, C.bombHi, 0.7);
    // Panels
    game.draw.rect(W * 0.06, H * 0.18, W * 0.14, H * 0.72, '#111008', 0.9);
    game.draw.rect(W * 0.8, H * 0.18, W * 0.14, H * 0.72, '#111008', 0.9);

    // Timer display on bomb
    var urgency = timeLeft < 10 ? 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 8)) : 1;
    game.draw.rect(W * 0.25, H * 0.2, W * 0.5, 80, '#0a0600', 0.9);
    game.draw.text(timeLeft.toFixed(1), W / 2, H * 0.24 + 28, { size: 56, color: C.timer, bold: true });

    // Wires
    for (var wi2 = 0; wi2 < wires.length; wi2++) {
      var wire = wires[wi2];
      var wCol = wire.cut ? C.cut : wire.color.col;
      if (!wire.cut) {
        // Full wire
        game.draw.line(wire.x1, wire.y1, wire.mx, wire.my, wCol, 10);
        game.draw.line(wire.mx, wire.my, wire.x2, wire.y2, wCol, 10);
        // Highlight dot at mid
        game.draw.circle(wire.mx, wire.my, 8, wire.color.hi, 0.4);
      } else {
        // Cut wire: two halves with gap
        game.draw.line(wire.x1, wire.y1, wire.cutX - 15, wire.cutY, C.cut, 10);
        game.draw.line(wire.cutX + 15, wire.cutY, wire.x2, wire.y2, C.cut, 10);
        // Frayed ends
        game.draw.circle(wire.cutX - 15, wire.cutY, 6, wire.color.hi, 0.5);
        game.draw.circle(wire.cutX + 15, wire.cutY, 6, wire.color.hi, 0.5);
      }
    }

    // Color legend
    game.draw.text('赤を切れ！', W / 2, H * 0.14, { size: 44, color: C.red, bold: true });

    // Sparks
    for (var si3 = 0; si3 < sparks.length; si3++) {
      var sp = sparks[si3];
      game.draw.circle(sp.x, sp.y, 5 * sp.life / 0.5, sp.col, sp.life * 0.9);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.93, { size: 44, color: feedbackCol, bold: true });
    }

    game.draw.text(cutCount + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.green : C.red);
    game.draw.text(timeLeft.toFixed(1), W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initWires();
  });
})(game);
