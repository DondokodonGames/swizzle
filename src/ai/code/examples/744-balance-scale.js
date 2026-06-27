// 744-balance-scale.js
// バランス天秤 — 重りが左右に落ちる。傾いた側をタップして釣り合いを保て
// 操作: タップ — 左半分で左皿を軽く・右半分で右皿を軽くする（重りを逃がす）
// 成功: 90秒維持  失敗: 3回傾きすぎ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0f0c04',
    beam:    '#d97706',
    beamHi:  '#fbbf24',
    plate:   '#92400e',
    plateHi: '#d97706',
    weight:  '#64748b',
    weightHi:'#94a3b8',
    pivot:   '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#fef3c7',
    ui:      '#1c1400'
  };

  var CX = W / 2;
  var PIVOT_Y = H * 0.38;
  var ARM_LEN = 300;
  var PLATE_W = 180;

  var tilt = 0;       // radians, positive = right heavy
  var tiltVel = 0;
  var TILT_MAX = 0.38;
  var leftWeight = 0;
  var rightWeight = 0;
  var DROP_RATE = 0.9;
  var dropTimer = DROP_RATE;
  var weights = []; // falling weights

  var survived = 0;
  var TARGET_TIME = 90;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function dropWeight() {
    var side = Math.random() < 0.5 ? -1 : 1;
    weights.push({
      x: CX + side * (100 + Math.random() * 180),
      y: PIVOT_Y - 200,
      side: side,
      vy: 0,
      r: 18 + Math.random() * 14
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var side = tx < W / 2 ? -1 : 1;
    // Remove one weight from the tapped side (tap to "lift" a weight off)
    if (side === -1 && leftWeight > 0) {
      leftWeight = Math.max(0, leftWeight - 1);
      for (var p = 0; p < 4; p++) {
        var pa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        particles.push({ x: CX - ARM_LEN * 0.85, y: PIVOT_Y + ARM_LEN * Math.sin(tilt) + 60, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.35, col: C.weight });
      }
      game.audio.play('se_tap', 0.08);
    } else if (side === 1 && rightWeight > 0) {
      rightWeight = Math.max(0, rightWeight - 1);
      for (var p2 = 0; p2 < 4; p2++) {
        var pa2 = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        particles.push({ x: CX + ARM_LEN * 0.85, y: PIVOT_Y - ARM_LEN * Math.sin(tilt) + 60, vx: Math.cos(pa2) * 120, vy: Math.sin(pa2) * 120, life: 0.35, col: C.weight });
      }
      game.audio.play('se_tap', 0.08);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived += dt;
      DROP_RATE = Math.max(0.55, 0.9 - Math.floor(survived / 20) * 0.1);

      if (survived >= TARGET_TIME) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(survived) * 100 + (MAX_CRASH - crashes) * 2000); }, 700);
        return;
      }
    }

    dropTimer -= dt;
    if (dropTimer <= 0 && !done) {
      dropTimer = DROP_RATE;
      dropWeight();
    }

    // Update falling weights
    for (var wi = weights.length - 1; wi >= 0; wi--) {
      var w = weights[wi];
      w.vy += 800 * dt;
      w.y += w.vy * dt;
      // Land on plate
      var plateY = PIVOT_Y + w.side * ARM_LEN * Math.sin(tilt) + 60;
      if (w.y >= plateY - w.r) {
        if (w.side === -1) leftWeight++;
        else rightWeight++;
        weights.splice(wi, 1);
      }
    }

    // Tilt physics
    var diff = rightWeight - leftWeight;
    var torque = diff * 0.4;
    tiltVel += (torque - tilt * 2 - tiltVel * 1.5) * dt * 3;
    tilt += tiltVel * dt;
    tilt = Math.max(-TILT_MAX - 0.1, Math.min(TILT_MAX + 0.1, tilt));

    // Check over-tilt
    if (!done && Math.abs(tilt) > TILT_MAX) {
      crashes++;
      flashCol = C.wrong;
      flashAnim = 0.5;
      resultText = '傾きすぎ！';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.5);
      tilt = 0; tiltVel = 0; leftWeight = 0; rightWeight = 0; weights = [];
      if (crashes >= MAX_CRASH) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stand
    game.draw.rect(CX - 12, PIVOT_Y, 24, H * 0.45, C.beam, 0.9);
    game.draw.circle(CX, PIVOT_Y, 18, C.pivot, 0.9);

    // Beam
    var lx = CX - Math.cos(tilt) * ARM_LEN;
    var ly = PIVOT_Y - Math.sin(tilt) * ARM_LEN;
    var rx = CX + Math.cos(tilt) * ARM_LEN;
    var ry = PIVOT_Y + Math.sin(tilt) * ARM_LEN;
    game.draw.line(lx, ly, rx, ry, C.beam, 14);
    game.draw.line(lx, ly, rx, ry, C.beamHi, 4);

    // Plates
    var lPlateY = ly + 60, rPlateY = ry + 60;
    game.draw.line(lx, ly, lx, lPlateY, C.plateHi, 4);
    game.draw.line(rx, ry, rx, rPlateY, C.plateHi, 4);
    game.draw.rect(lx - PLATE_W / 2, lPlateY, PLATE_W, 16, C.plate, 0.9);
    game.draw.rect(rx - PLATE_W / 2, rPlateY, PLATE_W, 16, C.plate, 0.9);
    game.draw.rect(lx - PLATE_W / 2, lPlateY, PLATE_W, 6, C.plateHi, 0.5);
    game.draw.rect(rx - PLATE_W / 2, rPlateY, PLATE_W, 6, C.plateHi, 0.5);

    // Stacked weights on plates
    for (var si = 0; si < leftWeight; si++) {
      var wy = lPlateY - si * 22 - 12;
      game.draw.rect(lx - 30, wy - 18, 60, 20, C.weight, 0.85);
      game.draw.rect(lx - 30, wy - 18, 60, 6, C.weightHi, 0.4);
    }
    for (var si2 = 0; si2 < rightWeight; si2++) {
      var wy2 = rPlateY - si2 * 22 - 12;
      game.draw.rect(rx - 30, wy2 - 18, 60, 20, C.weight, 0.85);
      game.draw.rect(rx - 30, wy2 - 18, 60, 6, C.weightHi, 0.4);
    }

    // Falling weights
    for (var wi2 = 0; wi2 < weights.length; wi2++) {
      var w2 = weights[wi2];
      game.draw.circle(w2.x + 3, w2.y + 3, w2.r, '#000', 0.3);
      game.draw.circle(w2.x, w2.y, w2.r, C.weight, 0.9);
    }

    // Tilt indicator
    var tiltPct = Math.abs(tilt) / TILT_MAX;
    var tiltCol = tiltPct > 0.75 ? C.wrong : (tiltPct > 0.45 ? '#f97316' : C.correct);
    game.draw.text(tilt > 0.04 ? '右が重い → 右タップ' : (tilt < -0.04 ? '← 左が重い  左タップ' : 'バランス！'), W / 2, H * 0.83, { size: 36, color: tiltCol, bold: Math.abs(tilt) > 0.15 });

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 52, color: flashCol, bold: true });
    }

    for (var ci = 0; ci < MAX_CRASH; ci++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 80 + ci * 160, H * 0.955, 26, ci < crashes ? C.wrong : C.ui, 0.9);
    }

    var sRatio = Math.min(1, survived / TARGET_TIME);
    game.draw.text(Math.floor(survived) + ' / ' + TARGET_TIME + 's', W / 2, 148, { size: 56, color: C.text, bold: true });
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * sRatio, 12, C.correct);
    game.draw.text(Math.ceil(TARGET_TIME - survived) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    dropWeight();
  });
})(game);
