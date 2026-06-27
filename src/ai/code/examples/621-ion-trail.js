// 621-ion-trail.js
// イオントレイル — 粒子の軌跡を指でなぞって経路を作る
// 操作: スワイプで粒子の通り道を描く、全ゴールに到達させる
// 成功: 10ステージクリア  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010208',
    trail:   '#00ccff',
    trailHi: '#aaeeff',
    ion:     '#ff9900',
    ionHi:   '#ffdd88',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wall:    '#1a2a3a',
    source:  '#7c3aed',
    sourceHi:'#a78bfa',
    text:    '#f1f5f9',
    ui:      '#05050f',
    miss:    '#ef4444'
  };

  var PLAY_OX = 40, PLAY_OY = H * 0.18;
  var PLAY_W = W - 80, PLAY_H = H * 0.65;
  var CELL = 80;
  var COLS = Math.floor(PLAY_W / CELL);
  var ROWS = Math.floor(PLAY_H / CELL);

  var stage = 0;
  var trailPath = [];
  var ion = null;
  var goals = [];
  var source = null;
  var ionProgress = 0;
  var NEEDED = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.goal;
  var successes = 0;
  var ionRunning = false;
  var resultText = '';
  var resultTimer = 0;

  function cellXY(c, r) {
    return {
      x: PLAY_OX + c * CELL + CELL / 2,
      y: PLAY_OY + r * CELL + CELL / 2
    };
  }

  function loadStage() {
    trailPath = [];
    ionRunning = false;
    ionProgress = 0;
    ion = null;
    // Random source and 1-3 goals
    source = { c: Math.floor(Math.random() * COLS), r: ROWS - 1 };
    var sp = cellXY(source.c, source.r);
    source.x = sp.x; source.y = sp.y;
    var goalCount = 1 + Math.min(2, Math.floor(stage / 3));
    goals = [];
    for (var i = 0; i < goalCount; i++) {
      var gc, gr;
      do {
        gc = Math.floor(Math.random() * COLS);
        gr = Math.floor(Math.random() * (ROWS - 2));
      } while (goals.some(function(g) { return g.c === gc && g.r === gr; }) || (gc === source.c && gr === source.r));
      var gp = cellXY(gc, gr);
      goals.push({ c: gc, r: gr, x: gp.x, y: gp.y, reached: false, phase: Math.random() * Math.PI * 2 });
    }
  }

  function launchIon() {
    if (trailPath.length < 2) return;
    ionRunning = true;
    ionProgress = 0;
    ion = { x: trailPath[0].x, y: trailPath[0].y };
    game.audio.play('se_tap', 0.25);
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || ionRunning) return;
    // Add sampled points along swipe to trail
    var steps = 15;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var px = x1 + (x2 - x1) * t;
      var py = y1 + (y2 - y1) * t;
      // Snap to grid
      var gc = Math.round((px - PLAY_OX - CELL / 2) / CELL);
      var gr = Math.round((py - PLAY_OY - CELL / 2) / CELL);
      gc = Math.max(0, Math.min(COLS - 1, gc));
      gr = Math.max(0, Math.min(ROWS - 1, gr));
      var cp = cellXY(gc, gr);
      // Only add if different from last
      var last = trailPath[trailPath.length - 1];
      if (!last || last.c !== gc || last.r !== gr) {
        // Start must begin near source
        if (trailPath.length === 0) {
          var dsc = Math.abs(gc - source.c) + Math.abs(gr - source.r);
          if (dsc > 1) continue;
        }
        trailPath.push({ x: cp.x, y: cp.y, c: gc, r: gr });
      }
    }
    game.audio.play('se_tap', 0.05);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!ionRunning && trailPath.length >= 2) {
      launchIon();
    } else if (!ionRunning) {
      trailPath = [];
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

    for (var gi = 0; gi < goals.length; gi++) goals[gi].phase += dt * 2;

    // Ion movement along trail
    if (ionRunning && trailPath.length >= 2) {
      var ionSpeed = 4.0 + stage * 0.2; // segments per second
      ionProgress += ionSpeed * dt;
      var segIdx = Math.floor(ionProgress);
      if (segIdx >= trailPath.length - 1) {
        // Reached end of trail
        ionRunning = false;
        ion = null;
        // Check if all goals reached
        var allDone = goals.every(function(g) { return g.reached; });
        if (allDone) {
          successes++;
          flashCol = C.goal;
          flashAnim = 0.35;
          resultText = 'クリア!';
          resultTimer = 0.8;
          game.audio.play('se_success', 0.7);
          for (var p = 0; p < 10; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.goalHi });
          }
          if (successes >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(successes * 600 + Math.ceil(timeLeft) * 100); }, 800);
          } else {
            stage++;
            setTimeout(function() { if (!done) loadStage(); }, 1200);
          }
        } else {
          resultText = '再挑戦!';
          resultTimer = 0.6;
          flashCol = C.miss;
          flashAnim = 0.2;
          trailPath = [];
        }
      } else {
        var frac = ionProgress - segIdx;
        var a = trailPath[segIdx], b = trailPath[segIdx + 1];
        ion = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };

        // Check goal proximity
        for (var gi2 = 0; gi2 < goals.length; gi2++) {
          if (goals[gi2].reached) continue;
          var dx = ion.x - goals[gi2].x, dy = ion.y - goals[gi2].y;
          if (dx * dx + dy * dy < (CELL * 0.5) * (CELL * 0.5)) {
            goals[gi2].reached = true;
            game.audio.play('se_success', 0.5);
            for (var p2 = 0; p2 < 6; p2++) {
              var a2 = Math.random() * Math.PI * 2;
              particles.push({ x: goals[gi2].x, y: goals[gi2].y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.4, col: C.goalHi });
            }
          }
        }

        // Trail particles
        if (Math.random() < 0.4) {
          particles.push({ x: ion.x, y: ion.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, col: C.trail });
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r <= ROWS; r++) {
      game.draw.line(PLAY_OX, PLAY_OY + r * CELL, PLAY_OX + PLAY_W, PLAY_OY + r * CELL, C.wall, 1);
    }
    for (var c = 0; c <= COLS; c++) {
      game.draw.line(PLAY_OX + c * CELL, PLAY_OY, PLAY_OX + c * CELL, PLAY_OY + PLAY_H, C.wall, 1);
    }

    // Trail path
    for (var ti = 0; ti < trailPath.length - 1; ti++) {
      var a3 = trailPath[ti], b3 = trailPath[ti + 1];
      var drawn = ionRunning ? ti < Math.floor(ionProgress) : true;
      game.draw.line(a3.x, a3.y, b3.x, b3.y, C.trail, drawn ? 6 : 3);
      if (!drawn) game.draw.line(a3.x, a3.y, b3.x, b3.y, C.trailHi, 1);
    }

    // Goals
    for (var gi3 = 0; gi3 < goals.length; gi3++) {
      var g = goals[gi3];
      var pulse = 1 + Math.sin(g.phase) * 0.15;
      var col = g.reached ? C.goalHi : C.goal;
      game.draw.circle(g.x, g.y, CELL * 0.35 * pulse, col, 0.25);
      game.draw.circle(g.x, g.y, CELL * 0.2, col, 0.9);
      if (g.reached) game.draw.circle(g.x, g.y, CELL * 0.1, '#fff', 0.7);
    }

    // Source
    game.draw.circle(source.x, source.y, CELL * 0.3, C.sourceHi, 0.3);
    game.draw.circle(source.x, source.y, CELL * 0.2, C.source, 0.9);

    // Ion particle
    if (ion) {
      game.draw.circle(ion.x, ion.y, 20, C.ionHi, 0.4);
      game.draw.circle(ion.x, ion.y, 12, C.ion, 0.9);
      game.draw.circle(ion.x - 4, ion.y - 4, 5, '#fff', 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 8 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) game.draw.text(resultText, W / 2, H * 0.89, { size: 56, color: flashCol, bold: true });
    else if (!ionRunning) game.draw.text(trailPath.length > 1 ? 'タップで発射!' : 'スワイプで経路を描く', W / 2, H * 0.89, { size: 36, color: C.ui });

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.trail : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    loadStage();
  });
})(game);
