// 127-plate-spinner.js
// 皿回し — 回転が遅くなったらタップして勢いを回復させ全部の皿を倒さないでいる集中力
// 操作: タップで皿に勢いを補給
// 成功: 20秒間全皿を回し続ける  失敗: 1枚でも落ちたら終了

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080408',
    pole:    '#475569',
    poleHi:  '#64748b',
    plate:   '#e2e8f0',
    plateHi: '#f8fafc',
    danger:  '#ef4444',
    ok:      '#22c55e',
    warning: '#f59e0b',
    ui:      '#334155'
  };

  var NUM_PLATES = 4;
  var plates = []; // { x, y, spin, decay }
  var PLATE_R = 52;
  var MAX_SPIN = 5.0; // rad/s
  var MIN_SPIN = 0.8; // below this = wobble, 0 = fall
  var DECAY = 0.3; // spin decay per second
  var POLE_H = 240;

  function initPlates() {
    var xs = [W*0.2, W*0.4, W*0.6, W*0.8];
    for (var i = 0; i < NUM_PLATES; i++) {
      plates.push({
        x: xs[i],
        y: H * 0.45,
        spin: MAX_SPIN * (0.7 + Math.random() * 0.3),
        tilt: 0,
        alive: true
      });
    }
  }

  var survived = 0;
  var TARGET_TIME = 20;
  var timeLeft = 30;
  var done = false;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap nearest plate
    var bestDist = 999;
    var bestI = -1;
    for (var i = 0; i < plates.length; i++) {
      if (!plates[i].alive) continue;
      var dx = tx - plates[i].x, dy = ty - plates[i].y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; bestI = i; }
    }
    if (bestI >= 0 && bestDist < PLATE_R + 60) {
      plates[bestI].spin = Math.min(MAX_SPIN, plates[bestI].spin + 2.5);
      game.audio.play('se_tap', 0.5);
      // Sparkle
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: plates[bestI].x, y: plates[bestI].y, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100, life: 0.3 });
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;

      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
      if (survived >= TARGET_TIME) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(400 + Math.ceil(timeLeft) * 15); }, 400);
        return;
      }
    }

    for (var i = 0; i < plates.length; i++) {
      var p = plates[i];
      if (!p.alive) continue;

      // Decay spin
      p.spin -= DECAY * dt;
      if (p.spin < 0) p.spin = 0;

      // Tilt based on spin
      var tiltTarget = (p.spin < MIN_SPIN) ? (MIN_SPIN - p.spin) * 0.8 : 0;
      p.tilt += (tiltTarget - p.tilt) * dt * 4;

      if (p.spin === 0 || p.tilt > 0.9) {
        p.alive = false;
        game.audio.play('se_failure');
        for (var pi2 = 0; pi2 < 10; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: p.x, y: p.y, vx: Math.cos(ang2)*180, vy: Math.sin(ang2)*180 - 100, life: 0.5, color: C.plate });
        }
        if (!done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    for (var pi3 = 0; pi3 < particles.length; pi3++) {
      particles[pi3].x += particles[pi3].vx * dt;
      particles[pi3].y += particles[pi3].vy * dt;
      particles[pi3].vy += 600 * dt;
      particles[pi3].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Poles
    for (var i2 = 0; i2 < plates.length; i2++) {
      var pl = plates[i2];
      if (!pl.alive) continue;
      game.draw.rect(pl.x - 4, pl.y, 8, POLE_H, C.pole);
      game.draw.rect(pl.x - 4, pl.y, 8, 8, C.poleHi);
    }

    // Plates
    for (var i3 = 0; i3 < plates.length; i3++) {
      var pl2 = plates[i3];
      if (!pl2.alive) continue;
      var spinRatio = pl2.spin / MAX_SPIN;
      var pColor = spinRatio > 0.5 ? C.ok : (spinRatio > 0.25 ? C.warning : C.danger);

      // Wobble
      var tiltX = Math.sin(timeLeft * pl2.spin * 2) * pl2.tilt * PLATE_R;

      // Plate ellipse (spinning visual)
      var squish = 0.3 + 0.7 * Math.abs(Math.cos(pl2.spin * timeLeft));
      game.draw.circle(pl2.x + tiltX, pl2.y, PLATE_R, pColor, 0.8);
      game.draw.circle(pl2.x + tiltX, pl2.y, PLATE_R * squish, pColor, 0.3);
      game.draw.circle(pl2.x + tiltX - PLATE_R * 0.3, pl2.y - PLATE_R * 0.2, PLATE_R * 0.2, C.plateHi, 0.5);

      // Spin indicator arc
      var arcEnd = (pl2.spin / MAX_SPIN) * Math.PI * 2;
      for (var ai = 0; ai < 8; ai++) {
        var aa = ai / 8 * arcEnd - Math.PI/2;
        if (aa > arcEnd - Math.PI/2) break;
        var ax = pl2.x + Math.cos(aa) * (PLATE_R + 16);
        var ay = pl2.y + Math.sin(aa) * (PLATE_R + 16);
        game.draw.circle(ax, ay, 5, pColor, 0.7);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 6 * part.life * 2, part.color || '#fff', part.life);
    }

    // Timer bar (survived)
    var prog = Math.min(1, survived / TARGET_TIME);
    game.draw.rect(100, H*0.92, W-200, 24, '#0a0808');
    game.draw.rect(100, H*0.92, (W-200)*prog, 24, C.ok, 0.8);
    game.draw.text(Math.round(survived) + ' / ' + TARGET_TIME + 's', W/2, H*0.97, { size: 36, color: C.ui });

    game.draw.text('タップで皿を回す！', W/2, H*0.88, { size: 48, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.poleHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initPlates();
  });
})(game);
