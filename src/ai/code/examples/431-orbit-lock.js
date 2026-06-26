// 431-orbit-lock.js
// 軌道ロック — 周回する衛星を正確なタイミングでドッキング
// 操作: タップで衛星を内側の軌道に引き込む
// 成功: 6つの衛星を全てドッキング  失敗: 衝突3回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#010210',
    space:  '#020514',
    planet: '#1d4ed8',
    planetHi:'#60a5fa',
    orbit0: '#334155',
    orbit1: '#475569',
    sat:    '#f59e0b',
    satHi:  '#fde68a',
    dock:   '#22c55e',
    dockHi: '#86efac',
    locked: '#22d3ee',
    wrong:  '#ef4444',
    star:   '#f1f5f9',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var CX = W / 2;
  var CY = H * 0.47;
  var PLANET_R = 80;
  var INNER_R = 200;  // docking orbit
  var OUTER_R = 380;  // satellite orbit

  var dockSlots = [];
  var NUM_SLOTS = 6;
  for (var i = 0; i < NUM_SLOTS; i++) {
    dockSlots.push({
      angle: (i / NUM_SLOTS) * Math.PI * 2,
      locked: false
    });
  }

  var satellites = [];
  var NUM_SATS = 6;
  for (var j = 0; j < NUM_SATS; j++) {
    satellites.push({
      angle: (j / NUM_SATS) * Math.PI * 2 + 0.3,
      speed: 0.6 + j * 0.1,
      r: OUTER_R,
      docking: false,
      dockingTimer: 0,
      locked: false,
      idx: j
    });
  }

  var stars = [];
  for (var si = 0; si < 70; si++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H, r: 0.5 + Math.random()*2 });
  }

  var locked = 0;
  var NEEDED = 6;
  var collisions = 0;
  var MAX_COLLIDE = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.dock;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find nearest non-locked satellite in outer orbit
    var best = -1;
    var bestDist = 999999;
    for (var si2 = 0; si2 < satellites.length; si2++) {
      var sat = satellites[si2];
      if (sat.locked || sat.docking) continue;
      var sx = CX + Math.cos(sat.angle) * sat.r;
      var sy = CY + Math.sin(sat.angle) * sat.r;
      var dx = tx - sx;
      var dy = ty - sy;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; best = si2; }
    }
    if (best >= 0 && bestDist < 120) {
      satellites[best].docking = true;
      satellites[best].dockingTimer = 0;
      game.audio.play('se_tap', 0.4);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Rotate dock slots
    for (var di = 0; di < dockSlots.length; di++) {
      if (!dockSlots[di].locked) {
        dockSlots[di].angle += dt * 0.3;
      }
    }

    // Update satellites
    for (var si3 = 0; si3 < satellites.length; si3++) {
      var sat = satellites[si3];
      if (sat.locked) continue;

      if (sat.docking) {
        sat.r = Math.max(INNER_R, sat.r - 300 * dt);
        sat.dockingTimer += dt;

        if (sat.r <= INNER_R) {
          sat.r = INNER_R;
          // Find nearest empty dock slot
          var bestSlot = -1;
          var bestAngleDiff = Math.PI;
          for (var di2 = 0; di2 < dockSlots.length; di2++) {
            if (dockSlots[di2].locked) continue;
            var angleDiff = Math.abs(((sat.angle - dockSlots[di2].angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (angleDiff < bestAngleDiff) { bestAngleDiff = angleDiff; bestSlot = di2; }
          }

          if (bestSlot >= 0 && bestAngleDiff < 0.35) {
            // Docked!
            sat.locked = true;
            sat.angle = dockSlots[bestSlot].angle;
            dockSlots[bestSlot].locked = true;
            locked++;
            flashCol = C.dock;
            flashAnim = 0.7;
            game.audio.play('se_success', 0.6);
            for (var pi = 0; pi < 8; pi++) {
              var ang = Math.random() * Math.PI * 2;
              var sx2 = CX + Math.cos(sat.angle) * INNER_R;
              var sy2 = CY + Math.sin(sat.angle) * INNER_R;
              particles.push({ x: sx2, y: sy2, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life: 0.5, col: C.dockHi });
            }
            if (locked >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(locked * 600 + Math.ceil(timeLeft) * 80); }, 700);
            }
          } else {
            // Miss — satellite bounces back
            sat.r = OUTER_R;
            sat.docking = false;
            collisions++;
            flashCol = C.wrong;
            flashAnim = 0.5;
            game.audio.play('se_failure', 0.4);
            if (collisions >= MAX_COLLIDE && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 500);
            }
          }
        }
      } else {
        sat.angle += sat.speed * dt;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.space, 0.5);

    // Stars
    for (var si4 = 0; si4 < stars.length; si4++) {
      var s = stars[si4];
      game.draw.circle(s.x, s.y, s.r, C.star, 0.4 + Math.sin(elapsed + s.r) * 0.2);
    }

    // Orbits
    game.draw.circle(CX, CY, OUTER_R, C.orbit0, 0.25);
    game.draw.circle(CX, CY, INNER_R, C.orbit1, 0.35);

    // Dock slots
    for (var di3 = 0; di3 < dockSlots.length; di3++) {
      var slot = dockSlots[di3];
      var sx3 = CX + Math.cos(slot.angle) * INNER_R;
      var sy3 = CY + Math.sin(slot.angle) * INNER_R;
      if (slot.locked) {
        game.draw.circle(sx3, sy3, 22, C.locked, 0.8);
        game.draw.circle(sx3, sy3, 12, '#fff', 0.6);
      } else {
        game.draw.circle(sx3, sy3, 20, C.dockHi, 0.3);
        game.draw.circle(sx3, sy3, 12, C.dock, 0.5);
      }
    }

    // Planet
    game.draw.circle(CX, CY, PLANET_R + 16, C.planetHi, 0.12);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX - 25, CY - 28, PLANET_R * 0.4, C.planetHi, 0.3);

    // Satellites
    for (var si5 = 0; si5 < satellites.length; si5++) {
      var sat2 = satellites[si5];
      var sx4 = CX + Math.cos(sat2.angle) * sat2.r;
      var sy4 = CY + Math.sin(sat2.angle) * sat2.r;
      if (sat2.locked) {
        game.draw.circle(sx4, sy4, 26, C.locked, 0.9);
        game.draw.circle(sx4 - 8, sy4 - 8, 10, '#fff', 0.5);
      } else {
        var pulseA = sat2.docking ? 0.5 + Math.sin(elapsed * 8) * 0.2 : 0.1;
        game.draw.circle(sx4, sy4, 28, C.satHi, pulseA);
        game.draw.circle(sx4, sy4, 20, C.sat, 0.9);
        game.draw.circle(sx4 - 6, sy4 - 6, 8, C.satHi, 0.6);
        // Solar panels
        game.draw.line(sx4 - 20, sy4, sx4 - 40, sy4, C.sat, 5);
        game.draw.line(sx4 + 20, sy4, sx4 + 40, sy4, C.sat, 5);
        game.draw.rect(sx4 - 40, sy4 - 8, 20, 16, '#fbbf24', 0.6);
        game.draw.rect(sx4 + 20, sy4 - 8, 20, 16, '#fbbf24', 0.6);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Collision dots
    for (var ci = 0; ci < MAX_COLLIDE; ci++) {
      game.draw.circle(W/2 - (MAX_COLLIDE-1)*44 + ci*88, H*0.935, 18, ci < collisions ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(locked + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.planetHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
