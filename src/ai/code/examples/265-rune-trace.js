// 265-rune-trace.js
// ルーントレース — 光るルーン文字のパスを指でなぞって魔法を発動
// 操作: スワイプで表示されたパスをなぞる
// 成功: 8個のルーンをなぞる  失敗: 3回失敗 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#03010a',
    rune:   '#7c3aed',
    runeHi: '#a78bfa',
    runeLo: '#2d1b69',
    trace:  '#22c55e',
    traHi:  '#86efac',
    wrong:  '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9',
    glow:   '#c4b5fd'
  };

  // Rune shapes defined as normalized points (0-1) that form a path
  var RUNES = [
    { name: 'ᚠ', points: [[0.3,0.8],[0.5,0.2],[0.7,0.8],[0.5,0.5],[0.7,0.3]] },
    { name: 'ᚢ', points: [[0.3,0.2],[0.3,0.8],[0.7,0.8],[0.7,0.2]] },
    { name: 'ᚦ', points: [[0.3,0.2],[0.3,0.8],[0.6,0.5],[0.3,0.5]] },
    { name: 'ᚨ', points: [[0.3,0.8],[0.5,0.2],[0.7,0.8],[0.4,0.5],[0.6,0.5]] },
    { name: 'ᚱ', points: [[0.3,0.8],[0.3,0.2],[0.6,0.2],[0.6,0.5],[0.3,0.5],[0.7,0.8]] },
    { name: 'ᚲ', points: [[0.6,0.2],[0.3,0.5],[0.6,0.8]] }
  ];

  var CX = W / 2, CY = H * 0.42;
  var RUNE_SCALE = 220;

  var currentRune = null;
  var swipePoints = [];
  var tracedSeg = 0;
  var completed = 0;
  var NEEDED = 8;
  var failures = 0;
  var MAX_FAIL = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var glowPhase = 0;
  var STATE = 'SHOW'; // SHOW, TRACE, RESULT
  var showTimer = 1.5;

  function nextRune() {
    currentRune = RUNES[Math.floor(Math.random() * RUNES.length)];
    STATE = 'SHOW';
    showTimer = 1.5;
    tracedSeg = 0;
    swipePoints = [];
  }

  function runePointPx(pt) {
    return { x: CX + (pt[0] - 0.5) * RUNE_SCALE, y: CY + (pt[1] - 0.5) * RUNE_SCALE };
  }

  function checkTrace() {
    if (!currentRune) return;
    var pts = currentRune.points;
    // Check that swipe starts near first point and ends near last point
    if (swipePoints.length < 4) {
      failures++;
      feedback = '短すぎる！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.6;
      game.audio.play('se_failure', 0.4);
      if (failures >= MAX_FAIL && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      nextRune();
      return;
    }

    var start = swipePoints[0];
    var end = swipePoints[swipePoints.length - 1];
    var p0 = runePointPx(pts[0]);
    var pN = runePointPx(pts[pts.length - 1]);

    var startOk = Math.sqrt((start.x - p0.x) * (start.x - p0.x) + (start.y - p0.y) * (start.y - p0.y)) < 80;
    var endOk = Math.sqrt((end.x - pN.x) * (end.x - pN.x) + (end.y - pN.y) * (end.y - pN.y)) < 80;

    if (startOk && endOk) {
      completed++;
      feedback = '発動！';
      feedbackCol = C.traHi;
      feedbackTimer = 0.7;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.runeHi });
      }
      if (completed >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(completed * 200 + Math.ceil(timeLeft) * 80); }, 600);
        return;
      }
      setTimeout(function() { if (!done) nextRune(); }, 800);
      STATE = 'RESULT';
    } else {
      failures++;
      feedback = 'ルートが違う！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.6;
      game.audio.play('se_failure', 0.5);
      if (failures >= MAX_FAIL && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); }
      nextRune();
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || STATE !== 'TRACE') return;
    swipePoints = [{ x: x1, y: y1 }, { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, { x: x2, y: y2 }];
    checkTrace();
  });

  game.onTap(function(tx, ty) {
    if (done || STATE !== 'SHOW') return;
    STATE = 'TRACE';
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    glowPhase += dt * 3;
    if (feedbackTimer > 0) feedbackTimer -= dt;

    if (STATE === 'SHOW') {
      showTimer -= dt;
      if (showTimer <= 0) STATE = 'TRACE';
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 150 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background glow
    if (STATE === 'SHOW') {
      var g = 0.1 + 0.05 * Math.abs(Math.sin(glowPhase));
      game.draw.circle(CX, CY, 180, C.rune, g);
    }

    // Rune circle
    game.draw.circle(CX, CY, RUNE_SCALE * 0.7, C.runeLo, 0.4);

    // Draw rune path
    if (currentRune) {
      var pts = currentRune.points;
      for (var i = 0; i < pts.length - 1; i++) {
        var a = runePointPx(pts[i]);
        var b = runePointPx(pts[i + 1]);
        var col = STATE === 'TRACE' ? C.rune : C.runeHi;
        var alpha = STATE === 'TRACE' ? (0.4 + 0.15 * Math.abs(Math.sin(glowPhase))) : 0.9;
        game.draw.line(a.x, a.y, b.x, b.y, col, 10);
      }

      // Start point
      var sp = runePointPx(pts[0]);
      var ep = runePointPx(pts[pts.length - 1]);
      game.draw.circle(sp.x, sp.y, 18, C.traHi, 0.9);
      game.draw.text('▶', sp.x, sp.y + 10, { size: 20, color: '#fff' });
      game.draw.circle(ep.x, ep.y, 12, C.runeHi, 0.6);

      // Rune name
      game.draw.text(currentRune.name, CX, CY + RUNE_SCALE * 0.55, { size: 60, color: C.runeHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.6), p.col, p.life * 0.8);
    }

    if (STATE === 'SHOW') {
      game.draw.text('覚えてタップ！', W / 2, H * 0.2, { size: 46, color: C.text, bold: true });
    } else if (STATE === 'TRACE') {
      game.draw.text('スワイプでなぞれ！', W / 2, H * 0.2, { size: 46, color: C.traHi, bold: true });
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.86, { size: 56, color: feedbackCol, bold: true });
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 28 + fi * 56, H * 0.91, 16, fi < failures ? C.wrong : '#0a0120');
    }

    game.draw.text(completed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.rune : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    nextRune();
  });
})(game);
