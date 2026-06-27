// 605-shadow-puppet.js
// シャドーパペット — 影絵を見てその形を指でなぞって再現する
// 操作: スワイプで影の輪郭をなぞる、一致率80%以上で成功
// 成功: 8形クリア  失敗: 6回失敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#08050a',
    shadow:   '#1a1020',
    shadowHi: '#2a1a35',
    trace:    '#ffaa22',
    traceHi:  '#ffdd88',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    screen:   '#000000',
    light:    '#fff8e8',
    text:     '#f1f5f9',
    ui:       '#2a1a3a'
  };

  // Target shapes defined as lists of points (normalized 0-1)
  var SHAPES = [
    // Bird
    [[0.3,0.5],[0.5,0.3],[0.7,0.5],[0.5,0.7],[0.3,0.5],[0.1,0.4],[0.3,0.5]],
    // House
    [[0.2,0.7],[0.5,0.3],[0.8,0.7],[0.7,0.7],[0.7,0.9],[0.3,0.9],[0.3,0.7],[0.2,0.7]],
    // Star
    [[0.5,0.2],[0.6,0.45],[0.85,0.45],[0.65,0.6],[0.75,0.85],[0.5,0.7],[0.25,0.85],[0.35,0.6],[0.15,0.45],[0.4,0.45],[0.5,0.2]],
    // Arrow
    [[0.5,0.2],[0.8,0.5],[0.65,0.5],[0.65,0.8],[0.35,0.8],[0.35,0.5],[0.2,0.5],[0.5,0.2]],
    // Heart approx
    [[0.5,0.8],[0.2,0.55],[0.2,0.35],[0.35,0.2],[0.5,0.35],[0.65,0.2],[0.8,0.35],[0.8,0.55],[0.5,0.8]],
    // Tree
    [[0.5,0.15],[0.25,0.5],[0.38,0.5],[0.38,0.85],[0.62,0.85],[0.62,0.5],[0.75,0.5],[0.5,0.15]],
    // Lightning bolt
    [[0.55,0.1],[0.3,0.5],[0.5,0.5],[0.45,0.9],[0.7,0.5],[0.5,0.5],[0.55,0.1]],
    // Fish
    [[0.15,0.5],[0.3,0.35],[0.65,0.35],[0.85,0.5],[0.65,0.65],[0.3,0.65],[0.15,0.5],[0.05,0.35],[0.05,0.65],[0.15,0.5]]
  ];

  var SHAPE_NAMES = ['鳥', '家', '星', '矢印', 'ハート', '木', '雷', '魚'];

  var PLAY_W = W * 0.75;
  var PLAY_H = H * 0.42;
  var PLAY_OX = (W - PLAY_W) / 2;
  var PLAY_OY = H * 0.22;

  var currentShape = 0;
  var targetPoints = [];
  var tracePoints = [];
  var isTracing = false;
  var traceComplete = false;
  var matchScore = 0;
  var successes = 0;
  var NEEDED = 8;
  var fails = 0;
  var MAX_FAIL = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultText = '';
  var resultTimer = 0;

  function loadShape() {
    var shape = SHAPES[currentShape % SHAPES.length];
    targetPoints = shape.map(function(p) {
      return { x: PLAY_OX + p[0] * PLAY_W, y: PLAY_OY + p[1] * PLAY_H };
    });
    tracePoints = [];
    traceComplete = false;
    matchScore = 0;
    isTracing = false;
  }

  function calcMatchScore() {
    if (tracePoints.length < 5) return 0;
    // Sample target outline points and find nearest trace point
    var totalScore = 0;
    var threshold = 60;
    for (var ti = 0; ti < targetPoints.length; ti++) {
      var tp = targetPoints[ti];
      var minDist = 1e9;
      for (var tri = 0; tri < tracePoints.length; tri++) {
        var dx = tracePoints[tri].x - tp.x, dy = tracePoints[tri].y - tp.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) minDist = d;
      }
      totalScore += Math.max(0, 1 - minDist / threshold);
    }
    return totalScore / targetPoints.length;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || traceComplete) return;
    // Add points along swipe path
    isTracing = true;
    var steps = 10;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      tracePoints.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (traceComplete) {
      // Next shape
      loadShape();
      game.audio.play('se_tap', 0.15);
      return;
    }
    if (isTracing && tracePoints.length > 5) {
      // Evaluate trace
      traceComplete = true;
      matchScore = calcMatchScore();
      var success = matchScore >= 0.75;

      if (success) {
        successes++;
        flashCol = C.correct;
        flashAnim = 0.4;
        resultText = Math.round(matchScore * 100) + '%! 合格!';
        resultTimer = 1.0;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: PLAY_OX + PLAY_W / 2, y: PLAY_OY + PLAY_H / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.traceHi });
        }
        if (successes >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(successes * 600 + Math.ceil(timeLeft) * 100); }, 800);
        } else {
          currentShape++;
          setTimeout(function() { if (!done) loadShape(); }, 1500);
        }
      } else {
        fails++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = Math.round(matchScore * 100) + '% 不合格...';
        resultTimer = 1.0;
        game.audio.play('se_failure', 0.3);
        if (fails >= MAX_FAIL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          setTimeout(function() { if (!done) loadShape(); }, 1500);
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
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Screen backdrop
    game.draw.rect(PLAY_OX - 10, PLAY_OY - 10, PLAY_W + 20, PLAY_H + 20, C.shadowHi, 0.3);
    game.draw.rect(PLAY_OX, PLAY_OY, PLAY_W, PLAY_H, C.screen, 0.9);

    // Light glow
    game.draw.circle(PLAY_OX + PLAY_W / 2, PLAY_OY + PLAY_H * 0.45, PLAY_W * 0.35, C.light, 0.05);

    // Target shape (shadow on screen)
    for (var ti = 0; ti < targetPoints.length - 1; ti++) {
      game.draw.line(targetPoints[ti].x, targetPoints[ti].y, targetPoints[ti + 1].x, targetPoints[ti + 1].y, C.shadow, 8);
    }
    // Fill shadow
    for (var ti2 = 0; ti2 < targetPoints.length - 1; ti2++) {
      game.draw.line(targetPoints[ti2].x, targetPoints[ti2].y, targetPoints[ti2 + 1].x, targetPoints[ti2 + 1].y, C.shadowHi, 3);
    }

    // Player trace
    for (var tri = 0; tri < tracePoints.length - 1; tri++) {
      var alpha = traceComplete ? (matchScore >= 0.75 ? 0.9 : 0.5) : 0.8;
      var col = traceComplete ? (matchScore >= 0.75 ? C.correct : C.wrong) : C.trace;
      game.draw.line(tracePoints[tri].x, tracePoints[tri].y, tracePoints[tri + 1].x, tracePoints[tri + 1].y, col, 5);
    }

    // Instruction
    if (!isTracing && !traceComplete) {
      game.draw.text('スワイプで輪郭をなぞる', W / 2, PLAY_OY + PLAY_H + 50, { size: 36, color: C.ui });
    }
    if (traceComplete && resultTimer > 0) {
      game.draw.text(resultText, W / 2, PLAY_OY + PLAY_H + 50, { size: 44, color: flashCol, bold: true });
      game.draw.text('タップで次へ', W / 2, PLAY_OY + PLAY_H + 110, { size: 32, color: C.ui });
    }

    // Shape name
    var shapeName = SHAPE_NAMES[currentShape % SHAPE_NAMES.length];
    game.draw.text(shapeName + 'の形', W / 2, PLAY_OY - 20, { size: 40, color: C.traceHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 60 + fi * 120, H * 0.955, 22, fi < fails ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.trace : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    loadShape();
  });
})(game);
