// 147-spin-top.js
// コマ回し — コマが倒れる前にタップして回転力を補充するバランスゲーム
// 操作: タップでスピン加速
// 成功: 30秒間コマを倒さない  失敗: コマが倒れる(スピンゼロ)

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040e',
    top:     '#7c3aed',
    topHi:   '#a78bfa',
    topDark: '#4c1d95',
    shadow:  '#1a0a30',
    spin:    '#f59e0b',
    spinHi:  '#fef08a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155',
    floor:   '#0f0920'
  };

  var TOP_X = W / 2;
  var TOP_Y = H * 0.58;
  var FLOOR_Y = H * 0.75;

  var spin = 1.0; // 0-1 spin power
  var DECAY_BASE = 0.04; // per second base decay
  var angle = 0;
  var wobble = 0; // wobble angle when spinning slow
  var wobbleAngle = 0;

  var timeLeft = 30;
  var done = false;
  var feedback = 0;
  var particles = [];
  var ringPulse = 0;

  game.onTap(function() {
    if (done) return;
    spin = Math.min(1.0, spin + 0.35);
    ringPulse = 0.4;
    game.audio.play('se_tap', 0.5);
    // Sparks
    for (var pi = 0; pi < 8; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: TOP_X, y: TOP_Y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.35 });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        game.end.success(Math.round(spin * 100) * 5 + 500);
        return;
      }
    }

    // Spin decay (faster when low)
    var decay = DECAY_BASE * (1 + (1 - spin) * 2.5);
    spin -= decay * dt;
    if (spin < 0) spin = 0;

    // Fail if spin runs out
    if (spin <= 0 && !done) {
      done = true;
      game.audio.play('se_failure');
      game.end.failure();
      return;
    }

    // Rotation speed based on spin
    angle += spin * 8 * dt;

    // Wobble increases when spin is low
    wobble = (1 - spin) * 0.4;
    wobbleAngle = Math.sin(timeLeft * (3 + (1-spin)*4)) * wobble;

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 500 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (ringPulse > 0) ringPulse -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor);
    game.draw.rect(0, FLOOR_Y, W, 6, C.shadow);

    // Shadow on floor
    var shadowScale = 0.5 + spin * 0.5;
    game.draw.circle(TOP_X, FLOOR_Y + 12, 100 * shadowScale, '#000', 0.4);

    // Spin ring indicator
    var spinGlow = 0.3 + spin * 0.5;
    game.draw.circle(TOP_X, TOP_Y, 140 + ringPulse * 40, C.topHi, (spinGlow + ringPulse * 0.3) * 0.25);
    game.draw.circle(TOP_X, TOP_Y, 120, C.topHi, spinGlow * 0.15);

    // Top (spinning cone shape using tilted body)
    var lean = wobbleAngle;
    var topR = 80;
    var height = 200;
    var tipX = TOP_X + Math.sin(lean) * height * 0.5;
    var tipY = TOP_Y + Math.cos(lean) * height * 0.5;
    var baseX = TOP_X - Math.sin(lean) * height * 0.5;
    var baseY = TOP_Y - Math.cos(lean) * height * 0.5;

    // Body segments (wide top to point bottom)
    for (var seg = 0; seg < 6; seg++) {
      var t1 = seg / 6, t2 = (seg + 1) / 6;
      var x1 = baseX + (tipX - baseX) * t1;
      var y1 = baseY + (tipY - baseY) * t1;
      var x2 = baseX + (tipX - baseX) * t2;
      var y2 = baseY + (tipY - baseY) * t2;
      var r1 = topR * (1 - t1);
      var r2 = topR * (1 - t2);
      var segColor = seg % 2 === 0 ? C.top : C.topDark;
      game.draw.line(x1, y1, x2, y2, segColor, r1 * 2);
    }

    // Spinning highlight stripe
    var stripeAng = angle + wobbleAngle;
    var sx1 = baseX + Math.cos(stripeAng) * topR * 0.5;
    var sy1 = baseY + Math.sin(stripeAng) * 16;
    game.draw.line(sx1, sy1, tipX, tipY, C.topHi, 10);

    // Top disk (flat top)
    game.draw.circle(baseX, baseY, topR, C.topDark, 0.9);
    game.draw.circle(baseX, baseY, topR - 8, C.top, 0.8);
    // Spinning color pattern
    for (var sp = 0; sp < 4; sp++) {
      var pa = angle + sp * Math.PI / 2;
      var px = baseX + Math.cos(pa) * topR * 0.5;
      var py = baseY + Math.sin(pa) * topR * 0.3;
      game.draw.circle(px, py, 18, C.spinHi, 0.7);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*3, C.spin, part.life);
    }

    // Spin gauge
    var spinColor = spin > 0.5 ? C.correct : (spin > 0.25 ? C.spin : C.wrong);
    game.draw.rect(W*0.1, H*0.86, W*0.8, 28, '#0a0808');
    game.draw.rect(W*0.1, H*0.86, W*0.8*spin, 28, spinColor, 0.9);
    game.draw.text('スピン', W*0.5, H*0.84, { size: 36, color: spinColor });

    // Timer label
    game.draw.text('あと ' + Math.ceil(timeLeft) + '秒', W/2, H*0.92, { size: 48, color: C.ui });

    // Tap hint
    var hintAlpha = spin < 0.4 ? 0.9 : 0.5;
    game.draw.text('タップでスピン補充！', W/2, H*0.13, { size: 48, color: C.topHi, bold: spin < 0.4 });

    var ratio = Math.max(0, timeLeft/30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.top : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spin = 0.9;
  });
})(game);
