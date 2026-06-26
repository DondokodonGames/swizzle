// 446-space-gravity.js
// 宇宙重力 — 惑星の重力を使って探査機を目標へ誘導
// 操作: タップで探査機を発射する方向と強さを決める
// 成功: 5つの目標を捕捉  失敗: 5回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000814',
    star:   '#e2e8f0',
    planet: '#7c3aed',
    planetHi:'#a855f7',
    moon:   '#64748b',
    probe:  '#22d3ee',
    probeHi:'#cffafe',
    trail:  '#0891b2',
    target: '#fbbf24',
    targetHi:'#fef08a',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var stars = [];
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, blink: Math.random() * Math.PI * 2 });
  }

  var PLANET_X = W / 2;
  var PLANET_Y = H / 2;
  var PLANET_R = 100;
  var PLANET_MASS = 80000;

  var probe = null;
  var probeTrail = [];
  var target = null;
  var aimStart = null;
  var aimCurrent = null;

  var caught = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];

  function spawnTarget() {
    var angle = Math.random() * Math.PI * 2;
    var dist = 280 + Math.random() * 200;
    target = {
      x: W/2 + Math.cos(angle) * dist,
      y: H/2 + Math.sin(angle) * dist,
      pulse: 0
    };
  }

  function launchProbe(fromX, fromY, toX, toY) {
    var dx = toX - fromX;
    var dy = toY - fromY;
    var len = Math.sqrt(dx*dx + dy*dy);
    var speed = Math.min(len * 1.5, 600);
    probe = {
      x: fromX,
      y: fromY,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      life: 4.0
    };
    probeTrail = [];
  }

  game.onTap(function(tx, ty) {
    if (done || probe) return;
    // Launch from bottom area
    var launchX = W / 2;
    var launchY = H * 0.88;
    launchProbe(launchX, launchY, tx, ty);
    game.audio.play('se_tap', 0.4);
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

    // Planet rotation visual
    elapsed += 0;

    // Update probe
    if (probe) {
      probe.life -= dt;

      // Gravity from planet
      var pdx = PLANET_X - probe.x;
      var pdy = PLANET_Y - probe.y;
      var pdist = Math.sqrt(pdx*pdx + pdy*pdy);
      if (pdist > 0) {
        var grav = PLANET_MASS / (pdist * pdist);
        grav = Math.min(grav, 1200);
        probe.vx += (pdx / pdist) * grav * dt;
        probe.vy += (pdy / pdist) * grav * dt;
      }

      probeTrail.push({ x: probe.x, y: probe.y });
      if (probeTrail.length > 30) probeTrail.shift();

      probe.x += probe.vx * dt;
      probe.y += probe.vy * dt;

      // Hit planet
      if (pdist < PLANET_R + 10) {
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: probe.x, y: probe.y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.5, col: C.wrong });
        }
        probe = null;
        probeTrail = [];
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.4);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }

      // Out of bounds
      if (probe.x < -100 || probe.x > W + 100 || probe.y < -100 || probe.y > H + 100 || probe.life <= 0) {
        probe = null;
        probeTrail = [];
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }

      // Hit target
      if (target) {
        var tdx = target.x - probe.x;
        var tdy = target.y - probe.y;
        if (Math.sqrt(tdx*tdx + tdy*tdy) < 50) {
          caught++;
          flashCol = C.correct;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          for (var pi2 = 0; pi2 < 12; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: target.x, y: target.y, vx: Math.cos(ang2)*180, vy: Math.sin(ang2)*180, life: 0.6, col: C.targetHi });
          }
          probe = null;
          probeTrail = [];
          target = null;
          if (caught >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(caught * 800 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          setTimeout(function() { spawnTarget(); }, 800);
        }
      }
    }

    // Target pulse
    if (target) target.pulse += dt * 3;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      var s = stars[sti];
      s.blink += dt * 2;
      var sa = 0.4 + Math.sin(s.blink) * 0.3;
      game.draw.circle(s.x, s.y, s.r, C.star, sa);
    }

    // Planet
    game.draw.circle(PLANET_X, PLANET_Y, PLANET_R + 30, C.planetHi, 0.08);
    game.draw.circle(PLANET_X, PLANET_Y, PLANET_R + 15, C.planet, 0.15);
    game.draw.circle(PLANET_X, PLANET_Y, PLANET_R, C.planet, 0.9);
    game.draw.circle(PLANET_X - PLANET_R*0.3, PLANET_Y - PLANET_R*0.3, PLANET_R*0.25, C.planetHi, 0.3);
    // Ring
    game.draw.line(PLANET_X - PLANET_R*1.5, PLANET_Y + 20, PLANET_X + PLANET_R*1.5, PLANET_Y - 20, C.moon, 8);

    // Target
    if (target) {
      var tpulse = Math.sin(target.pulse) * 0.3;
      game.draw.circle(target.x, target.y, 50 + tpulse*20, C.target, 0.15);
      game.draw.circle(target.x, target.y, 38, C.target, 0.8);
      game.draw.circle(target.x, target.y, 22, C.targetHi, 0.9);
      game.draw.text('★', target.x, target.y + 14, { size: 36, color: '#fff', bold: true });
    }

    // Probe trail
    for (var ti = 0; ti < probeTrail.length; ti++) {
      var tRatio = ti / probeTrail.length;
      game.draw.circle(probeTrail[ti].x, probeTrail[ti].y, 8 * tRatio, C.trail, tRatio * 0.5);
    }

    // Probe
    if (probe) {
      game.draw.circle(probe.x, probe.y, 20, C.probeHi, 0.3);
      game.draw.circle(probe.x, probe.y, 14, C.probe, 0.9);
      game.draw.circle(probe.x, probe.y, 7, '#fff', 0.8);
    }

    // Launch point
    if (!probe) {
      game.draw.circle(W/2, H*0.88, 28, C.probe, 0.5);
      game.draw.circle(W/2, H*0.88, 18, C.probeHi, 0.8);
      game.draw.text('タップして発射', W/2, H*0.93, { size: 38, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.probe : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnTarget();
  });
})(game);
