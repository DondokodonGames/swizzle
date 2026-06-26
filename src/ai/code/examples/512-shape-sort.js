// 512-shape-sort.js
// シェイプソート — 落ちてくる図形を正しい穴にスワイプで分類
// 操作: 図形をスワイプ左右で正しい穴に落とす
// 成功: 25個正しく分類  失敗: 8個ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030510',
    shapes:  ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'],
    holeRim: '#475569',
    holeBg:  '#0a0a0a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var HOLE_COUNT = 4;
  var HOLE_R = 80;
  var HOLE_Y = H * 0.82;
  var SHAPE_SIZE = 70;
  var SHAPE_TYPES = ['circle', 'rect', 'triangle', 'diamond'];

  var holes = [];
  for (var hi = 0; hi < HOLE_COUNT; hi++) {
    holes.push({
      x: W / (HOLE_COUNT + 1) * (hi + 1),
      y: HOLE_Y,
      r: HOLE_R,
      shapeType: SHAPE_TYPES[hi],
      col: C.shapes[hi]
    });
  }

  var fallingShape = null;
  var correct = 0;
  var NEEDED = 25;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;

  function spawnShape() {
    var typeIdx = Math.floor(Math.random() * SHAPE_TYPES.length);
    fallingShape = {
      x: W / 2,
      y: H * 0.15,
      vy: 0,
      typeIdx: typeIdx,
      type: SHAPE_TYPES[typeIdx],
      col: C.shapes[typeIdx],
      sliding: false,
      slideDir: 0,
      slideTimer: 0
    };
  }

  function drawShape(type, col, cx, cy, size, alpha) {
    if (type === 'circle') {
      game.draw.circle(cx, cy, size, col, alpha);
    } else if (type === 'rect') {
      game.draw.rect(cx - size, cy - size, size * 2, size * 2, col, alpha);
    } else if (type === 'triangle') {
      // Approximate with 3 lines
      game.draw.line(cx, cy - size, cx + size, cy + size, col, 8);
      game.draw.line(cx + size, cy + size, cx - size, cy + size, col, 8);
      game.draw.line(cx - size, cy + size, cx, cy - size, col, 8);
      game.draw.circle(cx, cy, size * 0.7, col, alpha * 0.3);
    } else if (type === 'diamond') {
      game.draw.line(cx, cy - size, cx + size, cy, col, 8);
      game.draw.line(cx + size, cy, cx, cy + size, col, 8);
      game.draw.line(cx, cy + size, cx - size, cy, col, 8);
      game.draw.line(cx - size, cy, cx, cy - size, col, 8);
      game.draw.circle(cx, cy, size * 0.6, col, alpha * 0.3);
    }
  }

  game.onSwipe(function(dir) {
    if (done || !fallingShape) return;
    if (dir === 'left') {
      fallingShape.x = Math.max(HOLE_R, fallingShape.x - W * 0.25);
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'right') {
      fallingShape.x = Math.min(W - HOLE_R, fallingShape.x + W * 0.25);
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onTap(function(tx, ty) {
    if (done || !fallingShape) return;
    // Tap left/right half to move
    if (tx < W / 2) {
      fallingShape.x = Math.max(HOLE_R, fallingShape.x - W * 0.22);
    } else {
      fallingShape.x = Math.min(W - HOLE_R, fallingShape.x + W * 0.22);
    }
    game.audio.play('se_tap', 0.2);
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

    // Update falling shape
    if (fallingShape) {
      fallingShape.vy += 400 * dt;
      fallingShape.vy = Math.min(fallingShape.vy, 800);
      fallingShape.y += fallingShape.vy * dt;

      // Check if near hole Y
      if (fallingShape.y >= HOLE_Y - 20) {
        // Find closest hole
        var bestHole = null, bestDist = Infinity;
        for (var hi2 = 0; hi2 < holes.length; hi2++) {
          var d = Math.abs(fallingShape.x - holes[hi2].x);
          if (d < bestDist) { bestDist = d; bestHole = holes[hi2]; }
        }

        if (bestDist <= HOLE_R + 20) {
          // Drop into hole
          var isCorrect = (bestHole.shapeType === fallingShape.type);
          if (isCorrect) {
            correct++;
            flashCol = C.correct;
            flashAnim = 0.35;
            game.audio.play('se_success', 0.7);
            for (var pi = 0; pi < 8; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: bestHole.x, y: HOLE_Y, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140 - 80, life: 0.4, col: fallingShape.col });
            }
            if (correct >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(correct * 200 + Math.ceil(timeLeft) * 100); }, 700);
            }
          } else {
            misses++;
            flashCol = C.wrong;
            flashAnim = 0.5;
            game.audio.play('se_failure', 0.4);
            if (misses >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 500);
            }
          }
          fallingShape = null;
          if (!done) setTimeout(function() { spawnShape(); }, 300);
        } else {
          // Missed all holes - bounce
          misses++;
          flashCol = C.wrong;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.3);
          fallingShape = null;
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else if (!done) {
            setTimeout(function() { spawnShape(); }, 300);
          }
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Holes
    for (var hi3 = 0; hi3 < holes.length; hi3++) {
      var h = holes[hi3];
      game.draw.circle(h.x, h.y, HOLE_R + 8, h.col, 0.2);
      game.draw.circle(h.x, h.y, HOLE_R, C.holeBg, 0.95);
      // Shape icon in hole
      drawShape(h.shapeType, h.col, h.x, h.y, 36, 0.8);
    }

    // Floor
    game.draw.rect(0, HOLE_Y + HOLE_R, W, 8, C.holeRim, 0.5);

    // Falling shape
    if (fallingShape) {
      // Shadow on floor
      var shadowAlpha = Math.max(0, 0.3 - (HOLE_Y - fallingShape.y) / HOLE_Y * 0.3);
      game.draw.circle(fallingShape.x, HOLE_Y, 40, '#000', shadowAlpha);
      // Shape
      drawShape(fallingShape.type, fallingShape.col, fallingShape.x, fallingShape.y, SHAPE_SIZE, 0.9);
      // Glow
      game.draw.circle(fallingShape.x, fallingShape.y, SHAPE_SIZE + 12, fallingShape.col, 0.15);
    }

    // Guide lines to nearest matching hole
    if (fallingShape) {
      for (var hi4 = 0; hi4 < holes.length; hi4++) {
        if (holes[hi4].shapeType === fallingShape.type) {
          game.draw.line(fallingShape.x, fallingShape.y + SHAPE_SIZE, holes[hi4].x, holes[hi4].y - HOLE_R, holes[hi4].col, 2);
          break;
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 48 + mi * 96, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.shapes[2] : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnShape();
  });
})(game);
