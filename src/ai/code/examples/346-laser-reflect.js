// 346-laser-reflect.js
// レーザーリフレクト — 鏡を回転させてレーザーをターゲットに当てる
// 操作: タップで鏡を90度回転
// 成功: 8個のターゲットを撃破  失敗: 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020810',
    grid:   '#0a1020',
    laser:  '#f97316',
    laserHi:'#fed7aa',
    mirror: '#7dd3fc',
    mirrorHi:'#e0f2fe',
    target: '#22c55e',
    targetHi:'#86efac',
    hit:    '#ef4444',
    hitHi:  '#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var CELL = 180;
  var COLS = 5;
  var ROWS = 8;
  var OX = (W - COLS * CELL) / 2;
  var OY = 220;

  // Mirror: type '/' or '\'
  // Laser source: fires from left edge row 0, going right
  var mirrors = [];
  var targets = [];
  var targetHit = [];
  var targetsDown = 0;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var laserPath = [];
  var flashAnim = [];
  var particles = [];

  function setupPuzzle() {
    mirrors = [];
    targets = [];
    targetHit = [];

    // Place some mirrors
    var mirrorPositions = [
      {r:0, c:1}, {r:1, c:3}, {r:3, c:2}, {r:4, c:0}, {r:5, c:4}, {r:6, c:2}, {r:2, c:4}, {r:7, c:1}
    ];
    for (var i = 0; i < mirrorPositions.length; i++) {
      mirrors.push({ r: mirrorPositions[i].r, c: mirrorPositions[i].c, type: Math.random() < 0.5 ? '/' : '\\' });
    }

    // Place targets on right/bottom edges
    var tPos = [{r:0,c:4},{r:2,c:4},{r:4,c:4},{r:6,c:4},{r:7,c:0},{r:7,c:2},{r:7,c:3},{r:5,c:4}];
    for (var j = 0; j < tPos.length; j++) {
      targets.push({ r: tPos[j].r, c: tPos[j].c });
      targetHit.push(false);
    }
  }

  function getMirrorAt(r, c) {
    for (var i = 0; i < mirrors.length; i++) {
      if (mirrors[i].r === r && mirrors[i].c === c) return mirrors[i];
    }
    return null;
  }

  function isTarget(r, c) {
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].r === r && targets[i].c === c && !targetHit[i]) return i;
    }
    return -1;
  }

  function traceLaser() {
    laserPath = [];
    // Sources: top edge, going down for each column
    var sources = [{r:-1, c:0, dr:1, dc:0}]; // single source from top-left going down
    // Actually let's use left edge going right
    var r = 0, c = -1, dr = 0, dc = 1;

    var maxSteps = 60;
    for (var step = 0; step < maxSteps; step++) {
      r += dr;
      c += dc;

      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;

      laserPath.push({ r: r, c: c });

      // Check mirror
      var m = getMirrorAt(r, c);
      if (m) {
        if (m.type === '/') {
          var tmp = dr; dr = -dc; dc = -tmp;
        } else { // '\'
          var tmp2 = dr; dr = dc; dc = tmp2;
        }
      }

      // Check target
      var ti = isTarget(r, c);
      if (ti >= 0) {
        targetHit[ti] = true;
      }
    }
  }

  function countHit() {
    var n = 0;
    for (var i = 0; i < targetHit.length; i++) if (targetHit[i]) n++;
    return n;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

    var m = getMirrorAt(r, c);
    if (m) {
      m.type = m.type === '/' ? '\\' : '/';
      game.audio.play('se_tap', 0.3);

      // Recompute laser and check hits
      for (var i = 0; i < targetHit.length; i++) targetHit[i] = false;
      traceLaser();
      var hits = countHit();
      if (hits > targetsDown) {
        targetsDown = hits;
        for (var pi = 0; pi < targets.length; pi++) {
          if (targetHit[pi]) {
            flashAnim.push({ r: targets[pi].r, c: targets[pi].c, life: 0.6 });
          }
        }
        game.audio.play('se_success', 0.5);
      }
      if (targetsDown >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(targetsDown * 300 + Math.ceil(timeLeft) * 80); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    for (var fa = flashAnim.length - 1; fa >= 0; fa--) {
      flashAnim[fa].life -= dt * 2;
      if (flashAnim[fa].life <= 0) flashAnim.splice(fa, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r2 = 0; r2 <= ROWS; r2++) {
      game.draw.line(OX, OY + r2 * CELL, OX + COLS * CELL, OY + r2 * CELL, C.grid, 1);
    }
    for (var c2 = 0; c2 <= COLS; c2++) {
      game.draw.line(OX + c2 * CELL, OY, OX + c2 * CELL, OY + ROWS * CELL, C.grid, 1);
    }

    // Laser source indicator
    game.draw.circle(OX - 40, OY + CELL * 0 + CELL / 2, 24, C.laser, 0.9);
    game.draw.text('→', OX - 10, OY + CELL * 0 + CELL / 2 + 14, { size: 28, color: C.laserHi });

    // Targets
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      var tx2 = OX + t.c * CELL + CELL / 2;
      var ty2 = OY + t.r * CELL + CELL / 2;
      if (!targetHit[ti]) {
        game.draw.circle(tx2, ty2, 44, C.target, 0.8);
        game.draw.circle(tx2, ty2, 28, C.targetHi, 0.5);
      } else {
        game.draw.circle(tx2, ty2, 44, C.hit, 0.5);
        game.draw.text('✓', tx2, ty2 + 14, { size: 36, color: C.hitHi });
      }
    }

    // Laser path
    for (var lp = 0; lp < laserPath.length; lp++) {
      var lx = OX + laserPath[lp].c * CELL + CELL / 2;
      var ly = OY + laserPath[lp].r * CELL + CELL / 2;
      if (lp === 0) {
        game.draw.line(OX - 40, OY + CELL / 2, lx, ly, C.laser, 4);
      }
      if (lp > 0) {
        var px2 = OX + laserPath[lp-1].c * CELL + CELL / 2;
        var py2 = OY + laserPath[lp-1].r * CELL + CELL / 2;
        game.draw.line(px2, py2, lx, ly, C.laser, 4);
        game.draw.circle(lx, ly, 8, C.laserHi, 0.6);
      }
    }

    // Mirrors
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m2 = mirrors[mi];
      var mx = OX + m2.c * CELL + CELL / 2;
      var my = OY + m2.r * CELL + CELL / 2;
      game.draw.rect(mx - 60, my - 60, 120, 120, C.mirrorHi, 0.1);
      if (m2.type === '/') {
        game.draw.line(mx - 50, my + 50, mx + 50, my - 50, C.mirror, 8);
      } else {
        game.draw.line(mx - 50, my - 50, mx + 50, my + 50, C.mirror, 8);
      }
      game.draw.text(m2.type, mx, my + 14, { size: 48, color: C.mirrorHi, bold: true });
    }

    // Flash effects
    for (var fa2 = 0; fa2 < flashAnim.length; fa2++) {
      var f = flashAnim[fa2];
      var fx = OX + f.c * CELL + CELL / 2;
      var fy = OY + f.r * CELL + CELL / 2;
      game.draw.circle(fx, fy, 60 * f.life, C.targetHi, f.life * 0.6);
    }

    game.draw.text(targetsDown + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.laser : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    setupPuzzle();
    traceLaser();
  });
})(game);
