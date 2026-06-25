// 179-snap-combo.js
// スナップコンボ — 次々と出現するターゲットをテンポよく叩きコンボを繋げる快感
// 操作: タップで出現したターゲットを叩く
// 成功: コンボ20を達成  失敗: コンボが3回途切れる or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    spot:    '#1a0a2e',
    target:  '#7c3aed',
    targetHi:'#a78bfa',
    hit:     '#22c55e',
    hitHi:   '#86efac',
    miss:    '#ef4444',
    combo:   '#fef08a',
    ui:      '#334155'
  };

  var SPOT_R = 80; // clickable radius
  var APPEAR_TIME = 0.7; // how long target stays visible
  var spots = [];
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.55;
  var SPOTS_X = [];
  var SPOTS_Y = [];

  // Pre-defined positions
  for (var i = 0; i < 9; i++) {
    SPOTS_X.push(W * (0.2 + (i % 3) * 0.3));
    SPOTS_Y.push(H * (0.22 + Math.floor(i / 3) * 0.22));
  }

  var combo = 0;
  var maxCombo = 0;
  var needed = 20;
  var breakCount = 0;
  var maxBreaks = 3;
  var timeLeft = 35;
  var done = false;
  var particles = [];
  var pulseT = 0;

  function spawnSpot() {
    var avail = [];
    for (var si = 0; si < 9; si++) {
      var taken = false;
      for (var sj = 0; sj < spots.length; sj++) {
        if (spots[sj].spotIdx === si) { taken = true; break; }
      }
      if (!taken) avail.push(si);
    }
    if (avail.length === 0) return;
    var idx = avail[Math.floor(Math.random() * avail.length)];
    spots.push({ spotIdx: idx, x: SPOTS_X[idx], y: SPOTS_Y[idx], life: APPEAR_TIME, hit: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitAny = false;
    for (var si = 0; si < spots.length; si++) {
      var s = spots[si];
      if (s.hit) continue;
      var dx = tx - s.x, dy = ty - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < SPOT_R) {
        s.hit = true;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        hitAny = true;
        game.audio.play('se_success', Math.min(1, 0.4 + combo * 0.04));
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: s.x, y: s.y, vx: Math.cos(ang) * (150 + combo * 10), vy: Math.sin(ang) * (150 + combo * 10), life: 0.4 });
        }
        if (combo >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(maxCombo * 60 + Math.ceil(timeLeft) * 25); }, 400);
        }
        break;
      }
    }
    if (!hitAny) {
      // Miss
      combo = 0;
      breakCount++;
      game.audio.play('se_failure', 0.4);
      if (breakCount >= maxBreaks && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    pulseT += dt;

    spawnTimer -= dt;
    var speedMult = Math.max(0.4, 1 - combo * 0.03);
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL * speedMult;
      spawnSpot();
    }

    // Update spots
    for (var si = spots.length - 1; si >= 0; si--) {
      var s = spots[si];
      s.life -= dt;
      if (s.hit && s.life < APPEAR_TIME - 0.05) {
        spots.splice(si, 1);
      } else if (s.life <= 0 && !s.hit) {
        // Missed
        combo = 0;
        breakCount++;
        game.audio.play('se_failure', 0.35);
        spots.splice(si, 1);
        if (breakCount >= maxBreaks && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Spot positions (background dots)
    for (var si2 = 0; si2 < 9; si2++) {
      game.draw.circle(SPOTS_X[si2], SPOTS_Y[si2], SPOT_R, C.spot, 0.6);
    }

    // Active spots
    for (var si3 = 0; si3 < spots.length; si3++) {
      var s2 = spots[si3];
      var progress = s2.life / APPEAR_TIME;
      if (s2.hit) {
        game.draw.circle(s2.x, s2.y, SPOT_R * 1.3, C.hitHi, 0.3);
        game.draw.circle(s2.x, s2.y, SPOT_R, C.hit, 0.7);
        game.draw.text('✓', s2.x, s2.y, { size: 60, color: '#fff', bold: true });
        continue;
      }
      // Urgency pulse
      var pulse = 0.5 + 0.5 * Math.abs(Math.sin(pulseT * 6));
      var urgency = 1 - progress;
      var col = urgency > 0.6 ? C.miss : C.target;
      var hiCol = urgency > 0.6 ? '#fca5a5' : C.targetHi;

      // Countdown ring
      var steps = Math.floor(progress * 20);
      for (var rs = 0; rs < steps; rs++) {
        var ra = -Math.PI / 2 + (rs / 20) * Math.PI * 2;
        game.draw.circle(s2.x + Math.cos(ra) * (SPOT_R - 16), s2.y + Math.sin(ra) * (SPOT_R - 16), 8, hiCol, 0.6);
      }

      game.draw.circle(s2.x, s2.y, SPOT_R * 1.1, col, 0.15 + urgency * 0.2);
      game.draw.circle(s2.x, s2.y, SPOT_R, col, 0.8 + urgency * 0.15);
      game.draw.circle(s2.x, s2.y, SPOT_R * 0.4, hiCol, pulse * 0.6);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.hit, part.life);
    }

    // Combo display
    var comboCol = combo > 10 ? C.combo : (combo > 5 ? C.hit : '#f1f5f9');
    if (combo > 0) {
      game.draw.text('コンボ ' + combo + '!', W / 2, H * 0.84, { size: combo > 15 ? 72 : 56, color: comboCol, bold: true });
    }

    // Break indicators
    game.draw.text('中断: ', W * 0.3, H * 0.91, { size: 36, color: C.ui });
    for (var bi = 0; bi < maxBreaks; bi++) {
      game.draw.circle(W * 0.55 + bi * 48, H * 0.915, 18, bi < breakCount ? C.miss : '#0a1020');
    }

    game.draw.text('目標コンボ: ' + needed, W / 2, 148, { size: 52, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.target : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
