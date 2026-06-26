// 553-gear-lock.js
// ギアロック — 回転するギアをタップして止め、歯を噛み合わせてロック解除
// 操作: タップでギアを一時停止→全ギアが噛み合えばクリア
// 成功: 10ロック解除  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0c14',
    gear:    '#445566',
    gearHi:  '#6688aa',
    gearLock:'#22c55e',
    gearBad: '#ef4444',
    tooth:   '#334455',
    toothHi: '#88aacc',
    pin:     '#ffcc44',
    locked:  '#22c55e',
    text:    '#f1f5f9',
    ui:      '#374151',
    glow:    '#22c55e22'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var GEAR_POSITIONS = [
    { x: CX, y: CY - 220, r: 130, teeth: 12, speed: 0.8 },
    { x: CX - 250, y: CY, r: 100, teeth: 8, speed: -1.1 },
    { x: CX + 250, y: CY, r: 100, teeth: 8, speed: 1.1 },
    { x: CX, y: CY + 220, r: 130, teeth: 12, speed: -0.8 }
  ];

  var gears = [];
  var locked = 0;
  var NEEDED = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var levelDone = false;
  var lockedAnim = 0;

  function initGears() {
    gears = GEAR_POSITIONS.map(function(g) {
      return {
        x: g.x, y: g.y, r: g.r, teeth: g.teeth,
        speed: g.speed * (1 + locked * 0.05),
        angle: Math.random() * Math.PI * 2,
        frozen: false,
        frozenTime: 0
      };
    });
    levelDone = false;
  }

  function drawGear(g, color, alpha) {
    // Draw gear body
    game.draw.circle(g.x, g.y, g.r - 12, color, alpha * 0.9);
    // Teeth
    for (var ti = 0; ti < g.teeth; ti++) {
      var ang = g.angle + ti / g.teeth * Math.PI * 2;
      var tx = g.x + Math.cos(ang) * (g.r - 4);
      var ty = g.y + Math.sin(ang) * (g.r - 4);
      game.draw.circle(tx, ty, 20, color, alpha * 0.9);
    }
    // Center pin
    game.draw.circle(g.x, g.y, 28, C.pin, alpha * 0.9);
    game.draw.circle(g.x, g.y, 16, '#fff', alpha * 0.5);
  }

  function checkMesh() {
    // Check if all adjacent gear pairs have meshing teeth
    // Simplified: check if relative tooth positions are aligned
    var pairs = [[0, 1], [0, 2], [1, 3], [2, 3]];
    for (var pi = 0; pi < pairs.length; pi++) {
      var a = gears[pairs[pi][0]], b = gears[pairs[pi][1]];
      // Angle between centers
      var aCenterAng = Math.atan2(b.y - a.y, b.x - a.x);
      // Tooth at that angle for gear a
      var aToothPhase = ((a.angle - aCenterAng) % (Math.PI * 2 / a.teeth) + Math.PI * 2 / a.teeth) % (Math.PI * 2 / a.teeth);
      var halfTooth = Math.PI / a.teeth;
      if (aToothPhase > halfTooth * 0.3 && aToothPhase < halfTooth * 1.7) {
        return false; // tooth blocking
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = 0; i < gears.length; i++) {
      var g = gears[i];
      var dx = tx - g.x, dy = ty - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < g.r + 20) {
        if (!g.frozen) {
          g.frozen = true;
          g.frozenTime = 0;
          game.audio.play('se_tap', 0.4);
          // Check if all frozen and meshed
          var allFrozen = gears.every(function(gg) { return gg.frozen; });
          if (allFrozen) {
            if (checkMesh()) {
              locked++;
              lockedAnim = 0.8;
              flashAnim = 0.4;
              game.audio.play('se_success', 0.9);
              for (var pi2 = 0; pi2 < 16; pi2++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: CX, y: CY, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, life: 0.6, col: C.locked });
              }
              if (locked >= NEEDED && !done) {
                done = true;
                game.audio.play('se_success', 0.9);
                setTimeout(function() { game.end.success(locked * 600 + Math.ceil(timeLeft) * 100); }, 700);
              } else {
                setTimeout(function() { if (!done) initGears(); }, 800);
              }
            } else {
              // Bad alignment — unfreeze all
              gears.forEach(function(gg) { gg.frozen = false; });
              game.audio.play('se_failure', 0.4);
              flashAnim = 0.3;
            }
          }
        } else {
          g.frozen = false;
          game.audio.play('se_tap', 0.2);
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
    if (lockedAnim > 0) lockedAnim -= dt * 2;

    // Rotate non-frozen gears
    for (var i = 0; i < gears.length; i++) {
      var g = gears[i];
      if (!g.frozen) {
        g.angle += g.speed * dt;
        g.frozenTime = 0;
      } else {
        g.frozenTime += dt;
        if (g.frozenTime > 2.0) { // auto-unfreeze after 2s
          g.frozen = false;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Connection lines between gears
    var pairs2 = [[0, 1], [0, 2], [1, 3], [2, 3]];
    for (var pi3 = 0; pi3 < pairs2.length; pi3++) {
      var a = gears[pairs2[pi3][0]], b = gears[pairs2[pi3][1]];
      game.draw.line(a.x, a.y, b.x, b.y, C.ui, 3);
    }

    // Gears
    for (var i2 = 0; i2 < gears.length; i2++) {
      var g2 = gears[i2];
      var col = g2.frozen ? (lockedAnim > 0 ? C.gearLock : C.gearHi) : C.gear;
      if (g2.frozen) {
        game.draw.circle(g2.x, g2.y, g2.r + 16, col, 0.1 + Math.sin(elapsed * 4) * 0.05);
      }
      drawGear(g2, col, 0.9);
      if (g2.frozen) {
        game.draw.text('■', g2.x, g2.y + 12, { size: 36, color: C.gearLock });
        // Frozen timer ring
        var frozenFrac = 1 - g2.frozenTime / 2.0;
        for (var ri = 0; ri < 8; ri++) {
          if (ri / 8 > frozenFrac) continue;
          var rang = ri / 8 * Math.PI * 2 - Math.PI / 2;
          game.draw.circle(g2.x + Math.cos(rang) * (g2.r + 20), g2.y + Math.sin(rang) * (g2.r + 20), 8, C.gearLock, 0.7);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (lockedAnim > 0) {
      game.draw.rect(0, 0, W, H, C.locked, lockedAnim * 0.1);
      game.draw.text('LOCKED!', W / 2, CY + 320, { size: 72, color: C.locked, bold: true });
    }
    if (flashAnim > 0 && lockedAnim <= 0) {
      game.draw.rect(0, 0, W, H, C.gearBad, flashAnim * 0.1);
    }

    game.draw.text('タップで停止・解除', W / 2, H * 0.82, { size: 36, color: C.ui });

    game.draw.text(locked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gearHi : C.gearBad);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initGears();
  });
})(game);
