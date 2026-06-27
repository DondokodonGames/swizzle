// 782-shadow-match.js
// シャドウマッチ — シルエットが示す形をタップで選べ
// 操作: タップ — 4択から正しいシルエットの正体を選ぶ
// 成功: 25問正解  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050508',
    shadow:  '#0a0a14',
    shadowHi:'#14142a',
    panel:   '#0d1117',
    panelHi: '#1a2233',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080810',
    reveal:  '#fbbf24'
  };

  // Shape definitions: each shape is an array of [x, y] normalized to [-1, 1]
  var SHAPES = [
    { name: 'まる', color: '#38bdf8',
      draw: function(cx, cy, r, alpha) {
        game.draw.circle(cx, cy, r, '#38bdf8', alpha);
      }
    },
    { name: 'さんかく', color: '#f97316',
      draw: function(cx, cy, r, alpha) {
        game.draw.circle(cx, cy - r * 0.3, r * 0.6, '#f97316', alpha);
        game.draw.circle(cx - r * 0.7, cy + r * 0.5, r * 0.5, '#f97316', alpha);
        game.draw.circle(cx + r * 0.7, cy + r * 0.5, r * 0.5, '#f97316', alpha);
        game.draw.circle(cx, cy + r * 0.55, r * 0.65, '#f97316', alpha);
      }
    },
    { name: 'しかく', color: '#a78bfa',
      draw: function(cx, cy, r, alpha) {
        game.draw.rect(cx - r, cy - r, r * 2, r * 2, '#a78bfa', alpha);
      }
    },
    { name: 'ほし', color: '#fbbf24',
      draw: function(cx, cy, r, alpha) {
        for (var si = 0; si < 5; si++) {
          var sa = si * Math.PI * 2 / 5 - Math.PI / 2;
          var sx = cx + Math.cos(sa) * r;
          var sy = cy + Math.sin(sa) * r;
          game.draw.circle(sx, sy, r * 0.38, '#fbbf24', alpha);
        }
        game.draw.circle(cx, cy, r * 0.45, '#fbbf24', alpha);
      }
    },
    { name: 'ひし形', color: '#34d399',
      draw: function(cx, cy, r, alpha) {
        game.draw.circle(cx, cy - r, r * 0.45, '#34d399', alpha);
        game.draw.circle(cx - r * 0.7, cy, r * 0.45, '#34d399', alpha);
        game.draw.circle(cx + r * 0.7, cy, r * 0.45, '#34d399', alpha);
        game.draw.circle(cx, cy + r, r * 0.45, '#34d399', alpha);
        game.draw.circle(cx, cy, r * 0.55, '#34d399', alpha);
      }
    },
    { name: 'クロス', color: '#f472b6',
      draw: function(cx, cy, r, alpha) {
        game.draw.rect(cx - r * 0.22, cy - r, r * 0.44, r * 2, '#f472b6', alpha);
        game.draw.rect(cx - r, cy - r * 0.22, r * 2, r * 0.44, '#f472b6', alpha);
      }
    },
    { name: 'アーチ', color: '#fb923c',
      draw: function(cx, cy, r, alpha) {
        for (var ai = 0; ai < 12; ai++) {
          var aa = ai * Math.PI / 11;
          game.draw.circle(cx + Math.cos(Math.PI - aa) * r * 0.85, cy + Math.sin(Math.PI - aa) * r * 0.85 - r * 0.1, r * 0.25, '#fb923c', alpha);
        }
        game.draw.rect(cx - r * 0.88, cy - r * 0.1, r * 0.28, r * 0.8, '#fb923c', alpha);
        game.draw.rect(cx + r * 0.6, cy - r * 0.1, r * 0.28, r * 0.8, '#fb923c', alpha);
      }
    },
    { name: 'しずく', color: '#818cf8',
      draw: function(cx, cy, r, alpha) {
        game.draw.circle(cx, cy + r * 0.3, r * 0.7, '#818cf8', alpha);
        for (var di = 0; di < 5; di++) {
          var dt2 = di / 4;
          var dr = r * 0.6 * (1 - dt2);
          game.draw.circle(cx, cy - r * 0.5 * dt2, dr * 0.6, '#818cf8', alpha);
        }
      }
    }
  ];

  var currentShapeIdx = 0;
  var choices = []; // [shapeIdx, ...]
  var waitTimer = 0;
  var WAIT_DUR = 0.5;
  var showReveal = false;
  var revealTimer = 0;
  var answered = false;
  var lastResult = '';

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newQuestion() {
    currentShapeIdx = Math.floor(Math.random() * SHAPES.length);
    // Build 4 choices, including the correct one
    choices = [currentShapeIdx];
    while (choices.length < 4) {
      var r = Math.floor(Math.random() * SHAPES.length);
      if (choices.indexOf(r) < 0) choices.push(r);
    }
    // Shuffle
    for (var i = choices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = choices[i]; choices[i] = choices[j]; choices[j] = tmp;
    }
    showReveal = false;
    revealTimer = 0;
    answered = false;
  }

  // Layout: 2×2 grid for choices, bottom half
  function getChoiceRect(idx) {
    var col = idx % 2;
    var row = Math.floor(idx / 2);
    var cellW = W / 2;
    var cellH = H * 0.22;
    var startY = H * 0.57;
    return {
      x: col * cellW,
      y: startY + row * cellH,
      w: cellW,
      h: cellH
    };
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;
    for (var i = 0; i < 4; i++) {
      var r = getChoiceRect(i);
      if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
        answered = true;
        if (choices[i] === currentShapeIdx) {
          score++;
          flashCol = C.correct;
          flashAnim = 0.22;
          resultText = '正解！';
          resultTimer = 0.4;
          game.audio.play('se_success', 0.65);
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 120); }, 700);
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
        showReveal = true;
        revealTimer = 0.35;
        waitTimer = WAIT_DUR;
        break;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newQuestion();
    }
    if (revealTimer > 0) revealTimer -= dt;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Shadow display area
    game.draw.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.38, C.shadow, 0.95);
    game.draw.rect(W * 0.1, H * 0.14, W * 0.8, 4, C.shadowHi, 0.5);

    // Draw shadow (all black/dark)
    var shapeR = 120;
    if (showReveal && revealTimer > 0) {
      // Reveal true color briefly
      SHAPES[currentShapeIdx].draw(W / 2, H * 0.32, shapeR, 0.95);
      game.draw.text('→ ' + SHAPES[currentShapeIdx].name, W / 2, H * 0.49, { size: 40, color: C.reveal, bold: true });
    } else {
      // Shadow version
      SHAPES[currentShapeIdx].draw(W / 2, H * 0.32, shapeR, 0);
      // Draw silhouette using dark fill
      for (var si2 = 0; si2 < 12; si2++) {
        var sa2 = si2 * Math.PI * 2 / 12;
        SHAPES[currentShapeIdx].draw(W / 2 + Math.cos(sa2) * 2, H * 0.32 + Math.sin(sa2) * 2, shapeR, 0);
      }
      // We draw the actual shape but in a very dark color
      // Trick: draw it in the shadow color by using a rectangle as mask wouldn't work...
      // Instead draw it dark, then redraw mask
      game.draw.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.38, C.shadow, 0.0);
    }

    // Actually for the shadow effect, let's just draw the shape shapes in near-black
    if (!showReveal || revealTimer <= 0) {
      // Redraw all shapes in silhouette (very dark blue-black)
      // We call draw with near-zero alpha on the color but high alpha on shadow color
      game.draw.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.38, '#05050a', 0.0);
      // Draw shape in silhouette color
      var oldDraw = game.draw;
      // Can't override, so just draw in near-black color manually
      // Draw shape at the shape's native function but pretend it's black
      // The shapes draw using game.draw.circle/rect with their color
      // We need to neutralize this... Instead, just draw a solid-color overlay on top
      // Hack: draw the shape in normal color first, then cover with semi-transparent dark rect
      SHAPES[currentShapeIdx].draw(W / 2, H * 0.32, shapeR, 0.95);
      game.draw.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.38, '#03040a', 0.72);
      // Now the shape is barely visible = shadow effect
      SHAPES[currentShapeIdx].draw(W / 2, H * 0.32, shapeR, 0.15);
    }

    // Choice buttons 2×2
    for (var ci = 0; ci < 4; ci++) {
      var rect = getChoiceRect(ci);
      var isCorrect = choices[ci] === currentShapeIdx;
      var bgCol = C.panel;
      if (answered && isCorrect) bgCol = '#0a2e14';
      game.draw.rect(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16, bgCol, 0.95);
      game.draw.rect(rect.x + 8, rect.y + 8, rect.w - 16, 3, C.panelHi, 0.5);
      // Mini shape preview
      var sx = rect.x + rect.w / 2;
      var sy = rect.y + rect.h * 0.45;
      SHAPES[choices[ci]].draw(sx, sy, 52, 0.9);
      game.draw.text(SHAPES[choices[ci]].name, sx, rect.y + rect.h * 0.82, { size: 34, color: C.text, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.86, { size: 52, color: flashCol, bold: true });
    }

    if (!answered && !done) {
      game.draw.text('これは？', W / 2, H * 0.52, { size: 42, color: C.text + '66' });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newQuestion();
  });
})(game);
