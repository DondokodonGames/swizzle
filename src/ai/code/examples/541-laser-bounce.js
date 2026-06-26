// 541-laser-bounce.js
// レーザーバウンス — 鏡に反射するレーザーを操作してターゲットに当てる
// 操作: タップで鏡を回転させる
// 成功: 10ターゲット撃破  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#000510',
    grid:     '#00081a',
    laser:    '#ff3333',
    laserGlow:'#ff666622',
    mirror:   '#88ccff',
    mirrorHi: '#bbddff',
    target:   '#ffcc00',
    targetHi: '#ffee88',
    hit:      '#22ff88',
    wall:     '#224466',
    text:     '#f1f5f9',
    ui:       '#334455'
  };

  var CELL = 200;
  var COLS = 5;
  var ROWS = 8;
  var OX = (W - COLS * CELL) / 2;
  var OY = H * 0.12;
  var MAX_BOUNCES = 20;

  var mirrors = [];
  var target = null;
  var hits = 0;
  var NEEDED = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var laserPath = [];
  var hitAnim = 0;

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function initLevel() {
    mirrors = [];
    // Place 4-6 mirrors randomly
    var placed = [];
    var count = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var attempts = 0;
      while (attempts < 20) {
        var col = randInt(1, COLS - 2);
        var row = randInt(2, ROWS - 2);
        var key = col + ',' + row;
        if (placed.indexOf(key) === -1) {
          placed.push(key);
          mirrors.push({ col: col, row: row, angle: Math.random() < 0.5 ? 0 : 1 }); // 0='\', 1='/'
          break;
        }
        attempts++;
      }
    }
    // Place target in right area
    target = { col: COLS - 1, row: randInt(1, ROWS - 2) };
  }

  function traceLaser() {
    laserPath = [];
    // Laser enters from left side, middle
    var x = -1, y = 3;
    var dx = 1, dy = 0;
    var path = [{ x: OX, y: OY + y * CELL + CELL / 2 }];

    for (var step = 0; step < MAX_BOUNCES; step++) {
      x += dx; y += dy;
      // Hit wall
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
        path.push({ x: OX + x * CELL + CELL / 2, y: OY + y * CELL + CELL / 2 });
        break;
      }
      var px = OX + x * CELL + CELL / 2;
      var py = OY + y * CELL + CELL / 2;
      path.push({ x: px, y: py });

      // Check target
      if (target && x === target.col && y === target.row) {
        laserPath = path;
        return true;
      }

      // Check mirror
      var mirror = null;
      for (var mi = 0; mi < mirrors.length; mi++) {
        if (mirrors[mi].col === x && mirrors[mi].row === y) { mirror = mirrors[mi]; break; }
      }
      if (mirror) {
        // Reflect
        if (mirror.angle === 0) { // '\'
          var tmp = dx; dx = dy; dy = tmp;
        } else { // '/'
          var tmp2 = dx; dx = -dy; dy = -tmp2;
        }
      }
    }
    laserPath = path;
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which mirror was tapped
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var mx = OX + m.col * CELL + CELL / 2;
      var my = OY + m.row * CELL + CELL / 2;
      if (Math.abs(tx - mx) < CELL * 0.5 && Math.abs(ty - my) < CELL * 0.5) {
        m.angle = m.angle === 0 ? 1 : 0;
        game.audio.play('se_tap', 0.3);
        // Check if laser hits target
        if (traceLaser()) {
          hits++;
          hitAnim = 0.6;
          flashAnim = 0.3;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var tx2 = OX + target.col * CELL + CELL / 2;
            var ty2 = OY + target.row * CELL + CELL / 2;
            particles.push({ x: tx2, y: ty2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.targetHi });
          }
          if (hits >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(hits * 400 + Math.ceil(timeLeft) * 80); }, 700);
          } else {
            setTimeout(function() { if (!done) initLevel(); }, 600);
          }
        }
        return;
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
    if (hitAnim > 0) hitAnim -= dt * 2;

    traceLaser();

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        game.draw.rect(OX + c * CELL + 4, OY + r * CELL + 4, CELL - 8, CELL - 8, C.grid, 0.8);
      }
    }

    // Laser path
    for (var li = 1; li < laserPath.length; li++) {
      var lp1 = laserPath[li - 1], lp2 = laserPath[li];
      game.draw.line(lp1.x, lp1.y, lp2.x, lp2.y, C.laserGlow, 18);
      game.draw.line(lp1.x, lp1.y, lp2.x, lp2.y, C.laser, 4);
    }

    // Target
    if (target) {
      var tx3 = OX + target.col * CELL + CELL / 2;
      var ty3 = OY + target.row * CELL + CELL / 2;
      var pulse = 1 + Math.sin(elapsed * 5) * 0.12;
      game.draw.circle(tx3, ty3, 44 * pulse, C.target, 0.2);
      game.draw.circle(tx3, ty3, 36 * pulse, C.target, 0.9);
      game.draw.circle(tx3, ty3, 16, C.targetHi, 0.8);
    }

    // Mirrors
    for (var mi2 = 0; mi2 < mirrors.length; mi2++) {
      var m2 = mirrors[mi2];
      var mx2 = OX + m2.col * CELL + CELL / 2;
      var my2 = OY + m2.row * CELL + CELL / 2;
      var half = CELL * 0.38;
      if (m2.angle === 0) { // '\'
        game.draw.line(mx2 - half, my2 - half, mx2 + half, my2 + half, C.mirror, 10);
      } else { // '/'
        game.draw.line(mx2 - half, my2 + half, mx2 + half, my2 - half, C.mirror, 10);
      }
      game.draw.circle(mx2, my2, 20, C.mirrorHi, 0.5);
    }

    // Laser source
    game.draw.rect(0, OY + 3 * CELL + 4, OX, CELL - 8, C.laser, 0.3);
    game.draw.text('▶', OX / 2, OY + 3 * CELL + CELL / 2, { size: 48, color: C.laser, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.12);

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.mirror : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    initLevel();
  });
})(game);
