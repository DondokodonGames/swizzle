// 364-wind-chime.js
// ウィンドチャイム — 風が吹く方向に合わせて風鈴を揺らして音を奏でる
// 操作: スワイプで風を送る方向を指定
// 成功: 8つのメロディを完成  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c18',
    sky:    '#0a1628',
    chime:  '#7dd3fc',
    chimeHi:'#e0f2fe',
    chimeDim:'#1e3a5f',
    string: '#93c5fd',
    bell:   '#fbbf24',
    bellHi: '#fef3c7',
    wind:   '#bae6fd',
    note:   '#f0abfc',
    noteHi: '#fae8ff',
    hit:    '#22c55e',
    hitHi:  '#86efac',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var NUM_CHIMES = 6;
  var chimes = [];
  var TARGET_MELODY = []; // sequence of chime indices
  var playerSequence = [];
  var melodyComplete = 0;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var windDir = 0; // current wind x direction
  var windStrength = 0;
  var noteTrails = [];
  var successAnim = 0;
  var wrongAnim = 0;

  function setupChimes() {
    chimes = [];
    for (var i = 0; i < NUM_CHIMES; i++) {
      chimes.push({
        x: W * 0.1 + i * (W * 0.8 / (NUM_CHIMES - 1)),
        baseY: H * 0.3,
        angle: 0,
        vel: 0,
        ringing: 0,
        length: 140 + i * 20
      });
    }
  }

  function generateMelody() {
    TARGET_MELODY = [];
    playerSequence = [];
    var len = 3 + Math.floor(melodyComplete / 3);
    for (var i = 0; i < len; i++) {
      TARGET_MELODY.push(Math.floor(Math.random() * NUM_CHIMES));
    }
  }

  function ringChime(idx) {
    if (idx < 0 || idx >= NUM_CHIMES) return;
    chimes[idx].vel += (Math.random() > 0.5 ? 1 : -1) * 2;
    chimes[idx].ringing = 0.6;
    game.audio.play('se_tap', 0.3 + idx * 0.05);
    for (var pi = 0; pi < 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: chimes[idx].x, y: chimes[idx].baseY + chimes[idx].length, vx: Math.cos(ang)*80, vy: Math.sin(ang)*80, life:0.5, col: C.chimeHi });
    }
    noteTrails.push({ x: chimes[idx].x, y: chimes[idx].baseY + chimes[idx].length, life: 1.0, note: idx });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var dx = x2 - x1;
    var strength = Math.abs(dx) / W;
    windDir = Math.sign(dx);
    windStrength = Math.min(1, strength * 3);

    // Determine which chimes get hit by the wind sweep
    var minX = Math.min(x1, x2) - 50;
    var maxX = Math.max(x1, x2) + 50;
    for (var ci = 0; ci < NUM_CHIMES; ci++) {
      if (chimes[ci].x >= minX && chimes[ci].x <= maxX) {
        ringChime(ci);
        // Check against target melody
        var expected = TARGET_MELODY[playerSequence.length];
        if (expected === ci) {
          playerSequence.push(ci);
          if (playerSequence.length === TARGET_MELODY.length) {
            // Melody complete!
            melodyComplete++;
            successAnim = 1.0;
            game.audio.play('se_success', 0.7);
            for (var pi2 = 0; pi2 < 12; pi2++) {
              var ang2 = Math.random() * Math.PI * 2;
              particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.7, col: C.noteHi });
            }
            if (melodyComplete >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(melodyComplete * 400 + Math.ceil(timeLeft) * 80); }, 700);
              return;
            }
            setTimeout(function() { if (!done) generateMelody(); }, 1200);
          }
          break; // Only count the first matching chime in the swipe
        } else if (playerSequence.length > 0 || ci !== expected) {
          // Wrong chime hit
          playerSequence = [];
          wrongAnim = 0.4;
        }
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successAnim > 0) successAnim -= dt * 1.5;
    if (wrongAnim > 0) wrongAnim -= dt * 3;
    windStrength *= (1 - 2 * dt);

    // Update chimes physics
    for (var ci = 0; ci < NUM_CHIMES; ci++) {
      var c = chimes[ci];
      // Pendulum: gravity restoring + wind
      var restoring = -c.angle * 6;
      var wind = windDir * windStrength * 3;
      c.vel += (restoring + wind) * dt;
      c.vel *= (1 - 2 * dt); // damping
      c.angle += c.vel * dt;
      c.angle = Math.max(-0.8, Math.min(0.8, c.angle));
      if (c.ringing > 0) c.ringing -= dt * 2;
    }

    for (var nt = noteTrails.length - 1; nt >= 0; nt--) {
      noteTrails[nt].y -= 60 * dt;
      noteTrails[nt].life -= dt * 1.5;
      if (noteTrails[nt].life <= 0) noteTrails.splice(nt, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.7);

    // Wind effect
    if (windStrength > 0.1) {
      for (var wi = 0; wi < 5; wi++) {
        var wiy = H * 0.2 + wi * H * 0.12;
        var wiOff = (elapsed * 100 * windDir * windStrength + wi * 200) % W;
        game.draw.line(wiOff, wiy, wiOff + windDir * 80 * windStrength, wiy, C.wind, 2 * windStrength);
      }
    }

    // Crossbar
    game.draw.rect(W * 0.05, H * 0.22, W * 0.9, 16, '#5b4a30', 0.9);

    // Chimes
    for (var ci2 = 0; ci2 < NUM_CHIMES; ci2++) {
      var c2 = chimes[ci2];
      var tipX = c2.x + Math.sin(c2.angle) * c2.length;
      var tipY = c2.baseY + Math.cos(c2.angle) * c2.length;
      var lit = c2.ringing > 0;

      // Target melody highlight
      var isTarget = TARGET_MELODY[playerSequence.length] === ci2;
      if (isTarget) {
        game.draw.circle(c2.x, c2.baseY, 30, C.hitHi, 0.2 + Math.sin(elapsed * 4) * 0.1);
      }

      // String
      game.draw.line(c2.x, c2.baseY + 16, tipX, tipY - 20, lit ? C.chimeHi : C.string, 3);

      // Bell
      game.draw.circle(tipX, tipY, 22, lit ? C.bell : C.chimeDim, 0.9);
      game.draw.circle(tipX, tipY, 14, lit ? C.bellHi : C.chime, 0.8);
      if (lit) {
        game.draw.circle(tipX, tipY, 30, C.bell, c2.ringing * 0.4);
      }

      // Chime number
      game.draw.text((ci2 + 1) + '', c2.x, c2.baseY + 6, { size: 28, color: C.chime });
    }

    // Target melody display
    game.draw.text('目標:', W / 2, H * 0.72, { size: 34, color: C.ui });
    for (var mi = 0; mi < TARGET_MELODY.length; mi++) {
      var mx = W / 2 - (TARGET_MELODY.length - 1) * 30 + mi * 60;
      var filled = mi < playerSequence.length;
      game.draw.circle(mx, H * 0.77, 22, filled ? C.hit : C.chimeDim, 0.9);
      game.draw.text((TARGET_MELODY[mi] + 1) + '', mx, H * 0.77 + 8, { size: 24, color: filled ? C.hitHi : C.chimeHi });
    }

    // Note trails
    for (var nt2 = 0; nt2 < noteTrails.length; nt2++) {
      var n = noteTrails[nt2];
      game.draw.circle(n.x, n.y, 12 * n.life, C.note, n.life * 0.7);
      game.draw.text('♪', n.x, n.y, { size: 28 * n.life, color: C.noteHi });
    }

    if (successAnim > 0) {
      game.draw.text('メロディ完成！', W / 2, H * 0.84, { size: 56, color: C.hitHi, bold: true });
    }

    if (wrongAnim > 0) {
      game.draw.text('順番違い！', W / 2, H * 0.84, { size: 48, color: '#ef4444' });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(melodyComplete + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.chime : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    setupChimes();
    generateMelody();
  });
})(game);
