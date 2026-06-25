// 087-circuit-trace.js
// 回路トレース — 電流が流れる前に正しい経路をスワイプでなぞる緊張感
// 操作: スワイプで方向を選んで電流を導く
// 成功: 8回電力を届ける  失敗: 4回失敗 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030812',
    wire:    '#1e3a5f',
    wireHi:  '#2563eb',
    live:    '#22d3ee',
    liveGlow:'#67e8f9',
    goal:    '#fbbf24',
    wrong:   '#ef4444',
    correct: '#22c55e',
    node:    '#334155',
    ui:      '#475569'
  };

  // Puzzle: a sequence of directions to follow
  var PUZZLES = [
    ['right','down','right'],
    ['up','right','down'],
    ['right','up','right','down'],
    ['down','right','up','right'],
    ['up','up','right','down','down'],
    ['right','down','left','down','right'],
    ['up','right','down','right','up'],
    ['right','up','right','down','left','down']
  ];

  var STEP = 160; // grid step size
  var START_X = W * 0.18;
  var START_Y = H * 0.5;

  var puzzleIdx = 0;
  var currentPuzzle = [];
  var playerPath = []; // positions visited
  var playerDirs = []; // directions taken
  var pathProgress = 0; // how far along correct path

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var pulsePhase = 0;
  var showSolution = 0; // briefly show the correct path on wrong answer

  var DIR_VECS = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };

  function loadPuzzle() {
    currentPuzzle = PUZZLES[puzzleIdx % PUZZLES.length];
    puzzleIdx++;
    playerPath = [{ x: START_X, y: START_Y }];
    playerDirs = [];
    pathProgress = 0;
  }

  function puzzleEndPos() {
    var x = START_X, y = START_Y;
    for (var i = 0; i < currentPuzzle.length; i++) {
      var dv = DIR_VECS[currentPuzzle[i]];
      x += dv[0] * STEP;
      y += dv[1] * STEP;
    }
    return { x: x, y: y };
  }

  game.onSwipe(function(dir) {
    if (done || feedback > 0) return;
    var cur = playerPath[playerPath.length - 1];
    var dv = DIR_VECS[dir];
    var newX = cur.x + dv[0] * STEP;
    var newY = cur.y + dv[1] * STEP;

    var expected = currentPuzzle[pathProgress];
    if (dir === expected) {
      playerPath.push({ x: newX, y: newY });
      playerDirs.push(dir);
      pathProgress++;
      game.audio.play('se_tap', 0.6);

      if (pathProgress >= currentPuzzle.length) {
        // Completed!
        score++;
        feedbackOk = true;
        feedback = 0.5;
        game.audio.play('se_success');
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 40 + Math.ceil(timeLeft) * 10); }, 500);
          return;
        }
        setTimeout(loadPuzzle, 600);
      }
    } else {
      // Wrong direction
      misses++;
      feedbackOk = false;
      feedback = 0.6;
      showSolution = 0.6;
      game.audio.play('se_failure', 0.7);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      setTimeout(loadPuzzle, 700);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    pulsePhase += dt * 4;
    if (feedback > 0) feedback -= dt;
    if (showSolution > 0) showSolution -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw the puzzle path (correct solution, partially revealed)
    var px = START_X, py = START_Y;
    for (var i = 0; i < currentPuzzle.length; i++) {
      var dv2 = DIR_VECS[currentPuzzle[i]];
      var nx = px + dv2[0] * STEP;
      var ny = py + dv2[1] * STEP;
      // Show already-traced segments
      if (i < pathProgress) {
        game.draw.line(px, py, nx, ny, C.live, 12);
        var liveAlpha = 0.3 + 0.3 * Math.abs(Math.sin(pulsePhase));
        game.draw.line(px, py, nx, ny, C.liveGlow, 4 * liveAlpha);
        game.draw.circle(px, py, 18, C.live);
      } else if (showSolution > 0) {
        // Brief reveal of correct path
        var alpha2 = showSolution / 0.6 * 0.6;
        game.draw.line(px, py, nx, ny, C.wireHi, 8);
        game.draw.line(px, py, nx, ny, '#fff', 3 * alpha2);
      } else {
        game.draw.line(px, py, nx, ny, C.wire, 8);
        game.draw.circle(px, py, 12, C.node);
      }
      px = nx; py = ny;
    }

    // Start node
    game.draw.circle(START_X, START_Y, 28, C.live);
    game.draw.circle(START_X, START_Y, 18, '#fff', 0.5);
    game.draw.text('⚡', START_X, START_Y, { size: 28, color: '#fff', bold: true });

    // Goal node
    var goal = puzzleEndPos();
    var goalPulse = 0.5 + 0.5 * Math.abs(Math.sin(pulsePhase * 1.5));
    game.draw.circle(goal.x, goal.y, 36 + goalPulse * 8, C.goal, goalPulse * 0.4);
    game.draw.circle(goal.x, goal.y, 32, C.goal);
    game.draw.text('★', goal.x, goal.y, { size: 32, color: '#fff', bold: true });

    // Player position
    var pos = playerPath[playerPath.length - 1];
    var pp = 0.6 + 0.4 * Math.abs(Math.sin(pulsePhase * 2));
    game.draw.circle(pos.x, pos.y, 24 + pp * 4, C.liveGlow, pp * 0.5);
    game.draw.circle(pos.x, pos.y, 22, '#fff');

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '通電！' : '違う経路！', W / 2, H * 0.25, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Direction hint (which step they're on)
    if (!feedbackOk || feedback <= 0) {
      var remaining = currentPuzzle.slice(pathProgress);
      if (remaining.length > 0) {
        var arrows = { up: '↑', down: '↓', left: '←', right: '→' };
        var hint = remaining.map(function(d) { return arrows[d]; }).join(' ');
        game.draw.text('次の経路: ' + hint, W / 2, H * 0.88, { size: 44, color: C.wireHi });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, '#030812');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 72;
      game.draw.circle(sx, 128, 22, s < score ? C.goal : '#060e1c');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 192, 18, m < misses ? C.wrong : '#060e1c');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    loadPuzzle();
  });
})(game);
