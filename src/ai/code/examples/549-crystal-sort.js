// 549-crystal-sort.js
// クリスタルソート — 3本の試験管にランダム色クリスタルをタップで移し替えてソート
// 操作: タップで試験管を選択→別の試験管タップで上のクリスタルを移動
// 成功: 全試験管を同色でソート  失敗: 詰まって動けなくなる or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0d0d20',
    tube:    '#1a2040',
    tubeHi:  '#2a3060',
    tubeRim: '#4466aa',
    crystal0:'#ef4444',
    crystal1:'#3b82f6',
    crystal2:'#22c55e',
    crystal3:'#f59e0b',
    selected:'#ffffff',
    done:    '#ffffff55',
    text:    '#f1f5f9',
    ui:      '#374151',
    glow:    '#ffffff22'
  };

  var TUBE_COUNT = 4; // 3 color tubes + 1 empty buffer
  var CAPACITY = 4;
  var CRYSTAL_COLORS = [C.crystal0, C.crystal1, C.crystal2];
  var TUBE_W = 140;
  var TUBE_H = CAPACITY * 88 + 40;
  var TUBE_SPACING = (W - TUBE_COUNT * TUBE_W) / (TUBE_COUNT + 1);
  var TUBE_Y = H * 0.28;

  var tubes = [];
  var selectedTube = -1;
  var moves = 0;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var solvedAnim = 0;

  function getTubeX(i) {
    return TUBE_SPACING + i * (TUBE_W + TUBE_SPACING) + TUBE_W / 2;
  }

  function initTubes() {
    // Create a solvable scramble
    var allCrystals = [];
    for (var ci = 0; ci < CRYSTAL_COLORS.length; ci++) {
      for (var j = 0; j < CAPACITY; j++) allCrystals.push(ci);
    }
    // Shuffle
    for (var si = allCrystals.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = allCrystals[si]; allCrystals[si] = allCrystals[sj]; allCrystals[sj] = tmp;
    }
    tubes = [];
    for (var ti = 0; ti < TUBE_COUNT; ti++) {
      var tube = [];
      if (ti < CRYSTAL_COLORS.length) {
        for (var j2 = 0; j2 < CAPACITY; j2++) {
          tube.push(allCrystals[ti * CAPACITY + j2]);
        }
      }
      tubes.push(tube);
    }
  }

  function isTubeSolved(idx) {
    var t = tubes[idx];
    if (t.length === 0) return true;
    if (t.length !== CAPACITY) return false;
    var first = t[0];
    for (var i = 1; i < t.length; i++) if (t[i] !== first) return false;
    return true;
  }

  function isSolved() {
    for (var i = 0; i < TUBE_COUNT; i++) {
      if (!isTubeSolved(i)) return false;
    }
    return true;
  }

  function canMove(from, to) {
    if (from === to) return false;
    var fromTube = tubes[from], toTube = tubes[to];
    if (fromTube.length === 0) return false;
    if (toTube.length >= CAPACITY) return false;
    if (toTube.length === 0) return true;
    return fromTube[fromTube.length - 1] === toTube[toTube.length - 1];
  }

  function hasAnyMove() {
    for (var i = 0; i < TUBE_COUNT; i++) {
      for (var j = 0; j < TUBE_COUNT; j++) {
        if (canMove(i, j)) return true;
      }
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped tube
    var tapped = -1;
    for (var ti = 0; ti < TUBE_COUNT; ti++) {
      var tx2 = getTubeX(ti);
      if (Math.abs(tx - tx2) < TUBE_W / 2 + 20 && ty > TUBE_Y - 20 && ty < TUBE_Y + TUBE_H + 20) {
        tapped = ti;
        break;
      }
    }
    if (tapped === -1) { selectedTube = -1; return; }

    if (selectedTube === -1) {
      if (tubes[tapped].length > 0) {
        selectedTube = tapped;
        game.audio.play('se_tap', 0.3);
      }
    } else {
      if (tapped === selectedTube) {
        selectedTube = -1;
        return;
      }
      if (canMove(selectedTube, tapped)) {
        var crystal = tubes[selectedTube].pop();
        tubes[tapped].push(crystal);
        moves++;
        game.audio.play('se_tap', 0.4);
        // Particle
        var tx3 = getTubeX(tapped);
        var cy2 = TUBE_Y + TUBE_H - (tubes[tapped].length - 0.5) * 88;
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: tx3, y: cy2, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.3, col: CRYSTAL_COLORS[crystal] });
        }
        if (isSolved()) {
          done = true;
          solvedAnim = 1.0;
          game.audio.play('se_success', 0.9);
          for (var pi2 = 0; pi2 < 24; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: H / 2, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300, life: 0.6, col: CRYSTAL_COLORS[Math.floor(Math.random() * 3)] });
          }
          setTimeout(function() { game.end.success(10000 - moves * 100 + Math.ceil(timeLeft) * 50); }, 800);
        } else if (!hasAnyMove()) {
          done = true;
          game.audio.play('se_failure', 0.6);
          setTimeout(function() { game.end.failure(); }, 600);
        }
        selectedTube = -1;
      } else {
        // Can't move — select new tube
        selectedTube = tubes[tapped].length > 0 ? tapped : -1;
        game.audio.play('se_failure', 0.2);
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
    if (solvedAnim > 0) solvedAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Tubes
    for (var ti2 = 0; ti2 < TUBE_COUNT; ti2++) {
      var tx4 = getTubeX(ti2);
      var isSel = selectedTube === ti2;
      var isSolvedTube = isTubeSolved(ti2);
      var tubeCol = isSolvedTube ? C.done : isSel ? C.selected : C.tube;
      var tubeAlpha = isSel ? 0.9 : 0.7;

      // Tube body
      game.draw.rect(tx4 - TUBE_W / 2 + 4, TUBE_Y + 8, TUBE_W - 8, TUBE_H - 8, tubeCol, tubeAlpha * 0.3);
      // Tube walls
      game.draw.line(tx4 - TUBE_W / 2 + 6, TUBE_Y, tx4 - TUBE_W / 2 + 6, TUBE_Y + TUBE_H, isSel ? C.selected : C.tubeRim, isSel ? 6 : 4);
      game.draw.line(tx4 + TUBE_W / 2 - 6, TUBE_Y, tx4 + TUBE_W / 2 - 6, TUBE_Y + TUBE_H, isSel ? C.selected : C.tubeRim, isSel ? 6 : 4);
      game.draw.line(tx4 - TUBE_W / 2 + 6, TUBE_Y + TUBE_H, tx4 + TUBE_W / 2 - 6, TUBE_Y + TUBE_H, isSel ? C.selected : C.tubeRim, isSel ? 6 : 4);
      // Rim
      game.draw.line(tx4 - TUBE_W / 2, TUBE_Y, tx4 + TUBE_W / 2, TUBE_Y, C.tubeRim, 8);

      // Crystals
      for (var ci2 = 0; ci2 < tubes[ti2].length; ci2++) {
        var col = CRYSTAL_COLORS[tubes[ti2][ci2]];
        var cy3 = TUBE_Y + TUBE_H - (ci2 + 0.5) * 88;
        var cr = 38;
        // Crystal glow
        game.draw.circle(tx4, cy3, cr + 8, col, 0.15);
        // Crystal body (diamond shape using overlapping circles)
        game.draw.circle(tx4, cy3, cr, col, 0.9);
        game.draw.circle(tx4, cy3 - cr * 0.3, cr * 0.4, '#ffffff', 0.3);
        // Shine
        game.draw.circle(tx4 - 10, cy3 - 12, 10, '#fff', 0.4);
      }

      // Selected indicator
      if (isSel && tubes[ti2].length > 0) {
        var topCy = TUBE_Y + TUBE_H - (tubes[ti2].length - 0.5) * 88;
        game.draw.circle(tx4, topCy - 70, 12, C.selected, 0.8 + Math.sin(elapsed * 6) * 0.2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (solvedAnim > 0) game.draw.rect(0, 0, W, H, '#ffffff', solvedAnim * 0.15);

    game.draw.text('手数: ' + moves, W / 2, H * 0.82, { size: 48, color: C.text });
    game.draw.text('試験管タップで移動', W / 2, H * 0.87, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tubeRim : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initTubes();
  });
})(game);
