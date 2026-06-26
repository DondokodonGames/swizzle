// 518-spinning-top.js
// スピニングトップ — コマが倒れる前にタップで回転力を補充
// 操作: コマの傾きが限界に近づいたらタップして回す
// 成功: 30秒間コマを維持  失敗: 倒れる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050510',
    top:     '#f59e0b',
    topHi:   '#fde68a',
    topDark: '#92400e',
    spin:    '#3b82f6',
    danger:  '#ef4444',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#374151',
    shadow:  '#1e1e3a'
  };

  var CENTER_X = W / 2;
  var CENTER_Y = H * 0.52;
  var TOP_H = 280;

  var spin = 8.0;       // rad/s rotation speed
  var tilt = 0.0;       // current tilt angle (radians from vertical)
  var tiltVel = 0.0;    // tilt velocity
  var angle = 0;        // visual rotation angle
  var survived = 0;     // seconds survived
  var GOAL = 30;
  var done = false;
  var elapsed = 0;
  var MAX_TILT = 0.7;   // radians before falling
  var particles = [];
  var flashAnim = 0;
  var tapPulse = 0;
  var lastTapGain = 0;
  var perfectTaps = 0;

  function spinDecay(dt) {
    // Spin naturally decays
    spin = Math.max(0, spin - dt * 0.6);
    // Tilt influenced by spin (low spin = faster tilt)
    var stability = spin / 8.0;
    tiltVel += dt * (1.5 - stability * 1.4);
    tilt += tiltVel * dt;
    tiltVel *= 0.98;
    // Random slight push
    if (Math.random() < 0.02) {
      tiltVel += (Math.random() - 0.5) * 0.3;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Timing reward: tap when tilt is between 0.2 and 0.5
    var tiltAbs = Math.abs(tilt);
    var gain;
    if (tiltAbs > 0.35 && tiltAbs < 0.55) {
      // Perfect timing
      gain = 4.0;
      perfectTaps++;
      lastTapGain = 2;
    } else {
      gain = 2.0;
      lastTapGain = 1;
    }
    spin = Math.min(10, spin + gain);
    // Correct tilt back toward center
    tilt *= 0.5;
    tiltVel *= 0.4;
    tapPulse = 0.4;
    game.audio.play('se_tap', 0.4);
    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: CENTER_X, y: CENTER_Y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.35, col: C.spin });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived = Math.min(elapsed, GOAL);
      angle += spin * dt;

      spinDecay(dt);

      if (Math.abs(tilt) >= MAX_TILT) {
        done = true;
        game.audio.play('se_failure', 0.7);
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }

      if (elapsed >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(perfectTaps * 200 + Math.floor(spin * 100)); }, 700);
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (tapPulse > 0) tapPulse -= dt * 3;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Shadow on floor
    var tiltRatio = Math.abs(tilt) / MAX_TILT;
    var shadowW = 160 + tiltRatio * 40;
    game.draw.circle(CENTER_X + tilt * 200, CENTER_Y + 240, shadowW, '#000', 0.4);

    // Top body (tilted)
    var tx = tilt * 200;
    // Bottom point
    var px = CENTER_X + tx;
    var py = CENTER_Y + 240;
    // Top center
    var topX = CENTER_X - tx * 0.5;
    var topY = CENTER_Y - TOP_H + tx * 80;

    // Danger indicator
    var dangerCol = tiltRatio > 0.7 ? C.danger : tiltRatio > 0.4 ? '#f59e0b' : C.safe;
    game.draw.circle(px, py, 12, dangerCol, 0.9);

    // Main cone body (approximated with line)
    game.draw.line(px, py, topX, topY, C.topDark, 60);
    game.draw.line(px, py, topX, topY, C.top, 40);
    game.draw.line(px, py, topX, topY, C.topHi, 12);

    // Spinning disk at top
    var diskR = 80 + tapPulse * 30;
    game.draw.circle(topX, topY, diskR + 8, C.topDark, 0.9);
    game.draw.circle(topX, topY, diskR, C.top, 0.9);
    // Spin lines
    for (var li = 0; li < 4; li++) {
      var la = angle + li * Math.PI / 2;
      game.draw.line(
        topX + Math.cos(la) * 10, topY + Math.sin(la) * 10,
        topX + Math.cos(la) * (diskR - 8), topY + Math.sin(la) * (diskR - 8),
        C.topHi, 6
      );
    }
    game.draw.circle(topX, topY, 20, C.spin, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Spin meter
    var spinRatio = spin / 10;
    game.draw.rect(80, H * 0.78, 200, 24, C.ui, 0.4);
    game.draw.rect(80, H * 0.78, 200 * spinRatio, 24, spinRatio > 0.5 ? C.safe : C.danger, 0.9);
    game.draw.text('回転', 180, H * 0.775, { size: 32, color: C.ui });

    // Tilt meter
    game.draw.rect(W - 280, H * 0.78, 200, 24, C.ui, 0.4);
    game.draw.rect(W - 280, H * 0.78, 200 * tiltRatio, 24, dangerCol, 0.9);
    game.draw.text('傾き', W - 180, H * 0.775, { size: 32, color: C.ui });

    if (tiltRatio > 0.6) {
      game.draw.text('タップ！', W / 2, H * 0.85, { size: 72, color: C.danger, bold: true });
    } else if (lastTapGain === 2) {
      game.draw.text('完璧！', W / 2, H * 0.85, { size: 56, color: C.safe, bold: true });
    }

    // Progress
    var ratio = survived / GOAL;
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.7 ? C.safe : C.spin);
    game.draw.text(Math.ceil(GOAL - survived) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text(Math.floor(survived) + ' / ' + GOAL + '秒', W / 2, 148, { size: 56, color: C.text, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
  });
})(game);
