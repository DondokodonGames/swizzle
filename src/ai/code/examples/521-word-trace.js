// 521-word-trace.js
// ワードトレース — 画面に描かれた文字の輪郭を指でなぞる
// 操作: スワイプで文字の輪郭線をなぞる
// 成功: 8文字完成  失敗: 5ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030308',
    guide:   '#1e293b',
    trace:   '#38bdf8',
    traceHi: '#7dd3fc',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    letter:  '#0f172a'
  };

  // Simple digit/letter shapes as sequences of points (normalized 0-1)
  var SHAPES = [
    { name: '○', points: (function() {
      var pts = [];
      for (var i = 0; i <= 16; i++) pts.push({ x: 0.5 + 0.4 * Math.cos(i / 16 * Math.PI * 2), y: 0.5 + 0.4 * Math.sin(i / 16 * Math.PI * 2) });
      return pts;
    })() },
    { name: '△', points: [
      {x:0.5, y:0.1}, {x:0.85, y:0.85}, {x:0.15, y:0.85}, {x:0.5, y:0.1}
    ]},
    { name: '□', points: [
      {x:0.15, y:0.15}, {x:0.85, y:0.15}, {x:0.85, y:0.85}, {x:0.15, y:0.85}, {x:0.15, y:0.15}
    ]},
    { name: '★', points: (function() {
      var pts = [];
      for (var i = 0; i <= 10; i++) {
        var a = i / 10 * Math.PI * 2 - Math.PI / 2;
        var r = (i % 2 === 0) ? 0.4 : 0.18;
        pts.push({ x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) });
      }
      return pts;
    })() },
    { name: '♡', points: (function() {
      var pts = [];
      for (var i = 0; i <= 20; i++) {
        var t = i / 20 * Math.PI * 2;
        var x = 0.5 + 0.35 * (16 * Math.pow(Math.sin(t), 3)) / 16;
        var y = 0.5 - 0.35 * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 13 * 0.7;
        pts.push({ x: x, y: y });
      }
      return pts;
    })() },
    { name: '↑', points: [
      {x:0.5, y:0.1}, {x:0.2, y:0.5}, {x:0.4, y:0.5}, {x:0.4, y:0.9}, {x:0.6, y:0.9}, {x:0.6, y:0.5}, {x:0.8, y:0.5}, {x:0.5, y:0.1}
    ]},
    { name: 'Z', points: [
      {x:0.15, y:0.15}, {x:0.85, y:0.15}, {x:0.15, y:0.85}, {x:0.85, y:0.85}
    ]},
    { name: 'S', points: (function() {
      var pts = [];
      for (var i = 0; i <= 20; i++) {
        var t = i / 20 * Math.PI * 2;
        pts.push({ x: 0.5 + 0.35 * Math.cos(t + Math.PI), y: 0.35 + 0.22 * Math.sin(t) });
      }
      for (var j = 0; j <= 20; j++) {
        var t2 = j / 20 * Math.PI * 2;
        pts.push({ x: 0.5 + 0.35 * Math.cos(t2), y: 0.65 + 0.22 * Math.sin(t2) });
      }
      return pts;
    })() }
  ];

  var AREA_X = 140, AREA_Y = H * 0.22;
  var AREA_W = W - 280, AREA_H = W - 280;

  var currentShapeIdx = 0;
  var shapeOrder = [];
  var tracePoints = [];
  var score = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var isTracing = false;
  var currentCheckPt = 0;
  var matchCount = 0;

  function pickNextShape() {
    if (shapeOrder.length === 0) {
      shapeOrder = SHAPES.map(function(_, i) { return i; }).sort(function() { return Math.random() - 0.5; });
    }
    currentShapeIdx = shapeOrder.shift();
    tracePoints = [];
    isTracing = false;
    currentCheckPt = 0;
    matchCount = 0;
  }

  function shapePoint(ptIdx) {
    var shape = SHAPES[currentShapeIdx];
    var pt = shape.points[ptIdx];
    return { x: AREA_X + pt.x * AREA_W, y: AREA_Y + pt.y * AREA_H };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap counts as a trace point check at the tapped location
    var shape = SHAPES[currentShapeIdx];
    var pts = shape.points;
    var nextPt = currentCheckPt < pts.length ? shapePoint(currentCheckPt) : null;
    if (nextPt) {
      var dx = tx - nextPt.x, dy = ty - nextPt.y;
      if (Math.sqrt(dx*dx+dy*dy) < 80) {
        currentCheckPt++;
        matchCount++;
        game.audio.play('se_tap', 0.2);
        particles.push({ x: nextPt.x, y: nextPt.y, vx: 0, vy: -40, life: 0.5, col: C.traceHi });
        if (currentCheckPt >= pts.length) {
          score++;
          flashCol = C.correct;
          flashAnim = 0.5;
          game.audio.play('se_success', 0.8);
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 600 + Math.ceil(timeLeft) * 100); }, 700);
          } else {
            setTimeout(function() { if (!done) pickNextShape(); }, 700);
          }
        }
      }
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Track trace path via swipe start/end
    tracePoints.push({ x: x1, y: y1 });
    tracePoints.push({ x: x2, y: y2 });
    if (tracePoints.length > 60) tracePoints.shift();

    // Check proximity to shape points
    var shape = SHAPES[currentShapeIdx];
    var pts = shape.points;
    var nextPt = currentCheckPt < pts.length ? shapePoint(currentCheckPt) : null;
    if (nextPt) {
      var dx = x2 - nextPt.x, dy = y2 - nextPt.y;
      if (Math.sqrt(dx*dx+dy*dy) < 80) {
        currentCheckPt++;
        matchCount++;
        game.audio.play('se_tap', 0.2);
        particles.push({ x: nextPt.x, y: nextPt.y, vx: 0, vy: -40, life: 0.5, col: C.traceHi });
        if (currentCheckPt >= pts.length) {
          // Shape complete!
          score++;
          flashCol = C.correct;
          flashAnim = 0.5;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var cx = AREA_X + AREA_W / 2, cy = AREA_Y + AREA_H / 2;
            particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.correct });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 600 + Math.ceil(timeLeft) * 100); }, 700);
          } else {
            setTimeout(function() { if (!done) pickNextShape(); }, 700);
          }
        }
      }
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
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Shape area
    game.draw.rect(AREA_X - 8, AREA_Y - 8, AREA_W + 16, AREA_H + 16, C.guide, 0.3);

    // Draw guide shape
    var shape = SHAPES[currentShapeIdx];
    var pts = shape.points;
    for (var i = 0; i < pts.length - 1; i++) {
      var p1 = shapePoint(i), p2 = shapePoint(i + 1);
      var alpha = i < currentCheckPt ? 0.15 : 0.4;
      game.draw.line(p1.x, p1.y, p2.x, p2.y, C.guide, 8);
      if (i < currentCheckPt) game.draw.line(p1.x, p1.y, p2.x, p2.y, C.correct, 6);
    }

    // Checkpoint dots
    for (var ci = 0; ci < pts.length; ci++) {
      var cp = shapePoint(ci);
      var dotCol = ci < currentCheckPt ? C.correct : (ci === currentCheckPt ? C.traceHi : C.ui);
      game.draw.circle(cp.x, cp.y, ci === currentCheckPt ? 24 : 14, dotCol, ci === currentCheckPt ? 0.9 : 0.6);
      if (ci === currentCheckPt) {
        game.draw.circle(cp.x, cp.y, 32 + Math.sin(elapsed * 4) * 8, C.traceHi, 0.3);
      }
    }

    // Player trace
    for (var ti = 1; ti < tracePoints.length; ti++) {
      var tp1 = tracePoints[ti - 1], tp2 = tracePoints[ti];
      var a = (ti / tracePoints.length) * 0.8;
      game.draw.line(tp1.x, tp1.y, tp2.x, tp2.y, C.trace, 6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Shape name
    game.draw.text(shape.name, W / 2, AREA_Y + AREA_H + 60, { size: 80, color: C.text, bold: true });
    game.draw.text('なぞってください', W / 2, AREA_Y + AREA_H + 140, { size: 36, color: C.ui });

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + mi * 112, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.trace : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    pickNextShape();
  });
})(game);
