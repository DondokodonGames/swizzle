// 713-mirror-draw.js
// ミラードロー — 左右対称に配置された図形をタップして全部消せ
// 操作: タップで図形と、その鏡像を同時に消す
// 成功: 20セット消去  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030914',
    shapeA:  '#0ea5e9',
    shapeB:  '#8b5cf6',
    shapeC:  '#f59e0b',
    mirror:  '#334155',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050c18'
  };

  var CX = W / 2;
  var SHAPE_COLORS = [C.shapeA, C.shapeB, C.shapeC, '#10b981', '#f43f5e'];
  var SHAPE_TYPES = ['circle', 'square', 'diamond'];

  var shapes = []; // Each shape has { x, y, r, col, type, paired: idx }
  var pairs = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;
  var popAnim = []; // { x, y, col, life }
  var phase = 'play';
  var clearWait = 0;

  function drawShapeAt(type, cx, cy, r, col, alpha) {
    if (type === 'circle') {
      game.draw.circle(cx, cy, r, col, alpha);
    } else if (type === 'square') {
      game.draw.rect(cx - r, cy - r, r * 2, r * 2, col, alpha);
    } else {
      // Diamond
      game.draw.rect(cx - r * 0.8, cy - 4, r * 1.6, 8, col, alpha);
      game.draw.rect(cx - 4, cy - r * 1.1, 8, r * 2.2, col, alpha);
      for (var di = 0; di < 8; di++) {
        var dp = di / 8;
        var dw = r * 0.8 * Math.sin(dp * Math.PI);
        var dy2 = cy - r * 1.1 + di * r * 0.28;
        game.draw.rect(cx - dw, dy2, dw * 2, r * 0.3, col, alpha * 0.85);
      }
    }
  }

  function spawnRound() {
    shapes = [];
    var count = 2 + Math.min(3, Math.floor(pairs / 4));
    for (var i = 0; i < count; i++) {
      var r = 55 + Math.random() * 40;
      var col = SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)];
      var type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
      // Place left shape
      var leftX = 80 + r + Math.random() * (CX - 80 - r * 2 - 30);
      var ry = 300 + Math.random() * (H * 0.65 - 300);
      // Mirror x
      var rightX = W - leftX;
      shapes.push({ x: leftX, y: ry, r: r, col: col, type: type, alive: true, side: 'L', pairIdx: i });
      shapes.push({ x: rightX, y: ry, r: r, col: col, type: type, alive: true, side: 'R', pairIdx: i });
    }
    clearWait = 0;
    phase = 'play';
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'play') return;
    var hit = -1;
    for (var i = 0; i < shapes.length; i++) {
      if (!shapes[i].alive) continue;
      var dx = tx - shapes[i].x;
      var dy = ty - shapes[i].y;
      if (dx * dx + dy * dy < (shapes[i].r + 20) * (shapes[i].r + 20)) {
        hit = i;
        break;
      }
    }
    if (hit < 0) {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ミス！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
      return;
    }

    var s = shapes[hit];
    var pIdx = s.pairIdx;
    // Remove both shapes in the pair
    var removed = 0;
    for (var j = 0; j < shapes.length; j++) {
      if (shapes[j].pairIdx === pIdx && shapes[j].alive) {
        shapes[j].alive = false;
        removed++;
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          popAnim.push({ x: shapes[j].x, y: shapes[j].y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: shapes[j].col });
        }
      }
    }
    game.audio.play('se_tap', 0.15);
    flashCol = C.correct;
    flashAnim = 0.25;

    // Check if all alive shapes cleared
    var anyAlive = false;
    for (var k = 0; k < shapes.length; k++) {
      if (shapes[k].alive) { anyAlive = true; break; }
    }
    if (!anyAlive) {
      pairs++;
      resultText = 'クリア！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.6);
      if (pairs >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(pairs * 400 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        phase = 'wait';
        clearWait = 0.7;
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

    if (phase === 'wait') {
      clearWait -= dt;
      if (clearWait <= 0) { spawnRound(); }
    }

    for (var pp = popAnim.length - 1; pp >= 0; pp--) {
      popAnim[pp].x += popAnim[pp].vx * dt;
      popAnim[pp].y += popAnim[pp].vy * dt;
      popAnim[pp].life -= dt * 2.5;
      if (popAnim[pp].life <= 0) popAnim.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Mirror axis
    game.draw.line(CX, 180, CX, H * 0.9, C.mirror, 3);
    game.draw.line(CX - 12, 180, CX + 12, 180, C.mirror, 3);
    game.draw.text('↔', CX, 220, { size: 48, color: C.mirror + 'aa' });

    // Shapes
    for (var si = 0; si < shapes.length; si++) {
      var sh = shapes[si];
      if (!sh.alive) continue;
      var pulse = 0.85 + 0.15 * Math.sin(elapsed * 3 + si);
      drawShapeAt(sh.type, sh.x, sh.y, sh.r * pulse, sh.col, 0.88);
      game.draw.circle(sh.x - sh.r * 0.3, sh.y - sh.r * 0.3, sh.r * 0.2, '#fff', 0.2);
    }

    // Pop animations
    for (var pp2 = 0; pp2 < popAnim.length; pp2++) {
      var p2 = popAnim[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.89, { size: 60, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 50 + ei * 100, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(pairs + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnRound();
  });
})(game);
