// 789-crowd-pick.js
// クラウドピック — 群衆の中から「特定の特徴」を持つ1人だけタップせよ
// 操作: タップ — 指定された特徴（色/形）に一致する人物だけ選ぶ
// 成功: 30問正解  失敗: 8回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050508',
    panel:   '#0a0a14',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080810'
  };

  var COLORS = ['#ef4444', '#38bdf8', '#fbbf24', '#a78bfa', '#34d399'];
  var COLOR_NAMES = ['赤', '青', '黄', '紫', '緑'];
  var SHAPES = ['circle', 'square', 'triangle'];
  var SHAPE_NAMES = ['まる', 'しかく', 'さんかく'];

  var CROWD_SIZE = 8;
  var figures = [];
  var targetColor = 0;
  var targetShape = 0;
  var useColor = true; // alternate between color and shape rules
  var waitTimer = 0;
  var WAIT_DUR = 0.42;
  var answered = false;
  var correctIdx = -1;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var particles = [];

  function drawShape(cx, cy, r, shape, col, alpha) {
    if (shape === 'circle') {
      game.draw.circle(cx, cy, r, col, alpha);
    } else if (shape === 'square') {
      game.draw.rect(cx - r, cy - r, r * 2, r * 2, col, alpha);
    } else {
      // triangle: 3 circles at vertices
      game.draw.circle(cx, cy - r, r * 0.55, col, alpha);
      game.draw.circle(cx - r * 0.8, cy + r * 0.5, r * 0.55, col, alpha);
      game.draw.circle(cx + r * 0.8, cy + r * 0.5, r * 0.55, col, alpha);
      game.draw.circle(cx, cy + r * 0.05, r * 0.5, col, alpha);
    }
  }

  function getFigureLayout(idx) {
    var cols = 4;
    var col = idx % cols;
    var row = Math.floor(idx / cols);
    var cx = W * 0.12 + col * W * 0.22;
    var cy = H * 0.28 + row * H * 0.22;
    return { cx: cx, cy: cy };
  }

  function newRound() {
    // Alternate rule type
    useColor = (score % 2 === 0);
    targetColor = Math.floor(Math.random() * COLORS.length);
    targetShape = Math.floor(Math.random() * SHAPES.length);

    // Place crowd
    figures = [];
    correctIdx = Math.floor(Math.random() * CROWD_SIZE);
    for (var i = 0; i < CROWD_SIZE; i++) {
      var col, shapeIdx;
      if (i === correctIdx) {
        col = targetColor;
        shapeIdx = targetShape;
      } else {
        // Ensure distractors don't match target rule
        do {
          col = Math.floor(Math.random() * COLORS.length);
          shapeIdx = Math.floor(Math.random() * SHAPES.length);
        } while (
          (useColor && col === targetColor) ||
          (!useColor && shapeIdx === targetShape)
        );
      }
      figures.push({ colorIdx: col, shapeIdx: shapeIdx, bounce: 0 });
    }
    answered = false;
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;
    // Check which figure was tapped
    var hitIdx = -1;
    for (var i = 0; i < figures.length; i++) {
      var pos = getFigureLayout(i);
      var dx = tx - pos.cx;
      var dy = ty - pos.cy;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) return;

    answered = true;
    if (hitIdx === correctIdx) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = '正解！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.6);
      figures[hitIdx].bounce = 0.5;
      var pos2 = getFigureLayout(hitIdx);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: pos2.cx, y: pos2.cy, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.38, col: COLORS[figures[hitIdx].colorIdx] });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 360 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ちがう！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    }

    for (var i = 0; i < figures.length; i++) {
      if (figures[i].bounce > 0) figures[i].bounce -= dt * 4;
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target instruction panel
    game.draw.rect(40, H * 0.1, W - 80, H * 0.13, C.panel, 0.9);
    game.draw.rect(40, H * 0.1, W - 80, 4, '#1e293b', 0.6);

    var ruleLabel, ruleColor;
    if (useColor) {
      ruleLabel = COLOR_NAMES[targetColor] + 'を選べ！';
      ruleColor = COLORS[targetColor];
    } else {
      ruleLabel = SHAPE_NAMES[targetShape] + 'を選べ！';
      ruleColor = C.text;
    }
    game.draw.text(ruleLabel, W / 2, H * 0.155, { size: 52, color: ruleColor, bold: true });
    // Show target example
    var exX = W * 0.78;
    var exY = H * 0.16;
    if (useColor) {
      game.draw.circle(exX, exY, 28, COLORS[targetColor], 0.9);
    } else {
      drawShape(exX, exY, 26, SHAPES[targetShape], C.text, 0.85);
    }

    // Crowd
    for (var ci = 0; ci < figures.length; ci++) {
      var fig = figures[ci];
      var pos = getFigureLayout(ci);
      var sc2 = 1 + fig.bounce * 0.3;
      var r = 58 * sc2;
      drawShape(pos.cx, pos.cy, r, SHAPES[fig.shapeIdx], COLORS[fig.colorIdx], 0.9);

      // Highlight correct if answered
      if (answered && ci === correctIdx) {
        game.draw.circle(pos.cx, pos.cy, r + 18, C.correct, 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
