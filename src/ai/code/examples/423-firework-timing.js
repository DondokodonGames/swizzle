// 423-firework-timing.js
// 花火打ち上げ — 最高高度でタップして花火を咲かせる
// 操作: 花火が最高点に達したときにタップ
// 成功: 8本完璧に咲かせる  失敗: 3回早すぎ・遅すぎ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#010108',
    sky:    '#02050f',
    rocket: '#fbbf24',
    rocketHi:'#fff',
    smoke:  '#475569',
    burst0: '#ef4444',
    burst1: '#f97316',
    burst2: '#eab308',
    burst3: '#22c55e',
    burst4: '#3b82f6',
    burst5: '#a855f7',
    burst6: '#ec4899',
    burst7: '#06b6d4',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444',
    correct:'#22c55e'
  };

  var BURST_COLORS = [C.burst0, C.burst1, C.burst2, C.burst3, C.burst4, C.burst5, C.burst6, C.burst7];

  var LAUNCH_X = W / 2;
  var LAUNCH_Y = H * 0.88;
  var PEAK_MARGIN = 80;  // pixels from peak where tap is valid

  var rockets = [];
  var particles = [];
  var stars = [];
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H*0.7, r: 0.5+Math.random()*2, twinkle: Math.random()*Math.PI*2 });
  }

  var successes = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var nextLaunch = 0.8;
  var launchInterval = 2.5;

  function burst(rx, ry, col) {
    var count = 40 + Math.floor(Math.random() * 20);
    for (var i = 0; i < count; i++) {
      var ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      var speed = 200 + Math.random() * 300;
      particles.push({
        x: rx, y: ry,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.0 + Math.random() * 0.5,
        col: col,
        r: 6 + Math.random() * 4
      });
    }
    // Secondary sparkles
    for (var j = 0; j < 12; j++) {
      var ang2 = Math.random() * Math.PI * 2;
      particles.push({ x: rx, y: ry, vx: Math.cos(ang2)*120, vy: Math.sin(ang2)*120, life: 0.8, maxLife: 0.8, col: '#fff', r: 3 });
    }
  }

  function launchRocket() {
    var rx = LAUNCH_X + (Math.random()-0.5) * 300;
    var targetY = H * (0.1 + Math.random() * 0.3);
    var speed = 800 + Math.random() * 400;
    // Calculate time to peak
    var dy = LAUNCH_Y - targetY;
    var time = dy / speed;
    rockets.push({
      x: rx, y: LAUNCH_Y,
      vy: -speed,
      peakY: targetY,
      col: BURST_COLORS[Math.floor(Math.random()*BURST_COLORS.length)],
      burst: false,
      smoke: []
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Find a rocket near its peak
    var hit = false;
    for (var ri = rockets.length-1; ri >= 0; ri--) {
      var r = rockets[ri];
      if (r.burst) continue;
      if (r.vy > 0) continue;  // already descending

      // Is it near peak?
      var distFromPeak = Math.abs(r.y - r.peakY);
      if (distFromPeak < PEAK_MARGIN) {
        burst(r.x, r.y, r.col);
        r.burst = true;
        successes++;
        flashCol = C.correct;
        flashAnim = 0.7;
        game.audio.play('se_success', 0.7);
        hit = true;
        if (successes >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(successes * 600 + Math.ceil(timeLeft) * 80); }, 800);
        }
        break;
      }
    }

    if (!hit && rockets.length > 0) {
      // Check if tapping when rocket exists but not at peak
      var anyActive = rockets.some(function(r) { return !r.burst; });
      if (anyActive) {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.4);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Launch rockets
    nextLaunch -= dt;
    if (nextLaunch <= 0 && !done) {
      launchRocket();
      launchInterval = Math.max(1.5, 2.5 - successes * 0.05);
      nextLaunch = launchInterval;
    }

    // Update rockets
    for (var ri = rockets.length-1; ri >= 0; ri--) {
      var r = rockets[ri];
      if (r.burst) {
        rockets.splice(ri, 1);
        continue;
      }

      // Gravity
      r.vy += 400 * dt;
      r.y += r.vy * dt;

      // Smoke trail
      r.smoke.push({ x: r.x, y: r.y, life: 0.5 });
      if (r.smoke.length > 10) r.smoke.shift();

      // Auto-burst at peak or if descending too far
      if (r.y > LAUNCH_Y + 100 && !r.burst) {
        // Missed — auto clear
        r.burst = true;
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Update particles
    for (var pi = particles.length-1; pi >= 0; pi--) {
      var p = particles[pi];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.vx *= (1 - dt * 1.5);
      p.life -= dt;
      if (p.life <= 0) particles.splice(pi, 1);
    }

    // Twinkle stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      stars[si2].twinkle += dt * 2;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.9, C.sky, 0.6);

    // Stars
    for (var si3 = 0; si3 < stars.length; si3++) {
      var s = stars[si3];
      var alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
      game.draw.circle(s.x, s.y, s.r, '#fff', alpha);
    }

    // Particles
    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      var p2 = particles[pi2];
      var lifeRatio = p2.life / p2.maxLife;
      game.draw.circle(p2.x, p2.y, p2.r * lifeRatio, p2.col, lifeRatio * 0.9);
    }

    // Ground
    game.draw.rect(0, LAUNCH_Y + 30, W, H - LAUNCH_Y - 30, '#080410', 0.9);
    game.draw.line(0, LAUNCH_Y + 30, W, LAUNCH_Y + 30, '#1e1040', 3);

    // Rockets
    for (var ri2 = 0; ri2 < rockets.length; ri2++) {
      var r2 = rockets[ri2];
      // Smoke
      for (var ski = 0; ski < r2.smoke.length; ski++) {
        var sm = r2.smoke[ski];
        sm.life -= dt;
        game.draw.circle(sm.x, sm.y, 10 * (1 - ski/r2.smoke.length), C.smoke, (1 - ski/r2.smoke.length) * 0.3);
      }
      // Rocket
      game.draw.circle(r2.x, r2.y, 12, C.rocket, 0.9);
      game.draw.circle(r2.x, r2.y, 8, C.rocketHi, 0.8);
      // Engine flame
      game.draw.circle(r2.x, r2.y + 16, 8, C.burst1, 0.7);
      game.draw.circle(r2.x, r2.y + 22, 5, C.burst2, 0.5);

      // Peak zone indicator
      var atPeak = Math.abs(r2.y - r2.peakY) < PEAK_MARGIN;
      if (atPeak) {
        game.draw.circle(r2.x, r2.y, 40, r2.col, 0.25);
        game.draw.circle(r2.x, r2.y, 55, r2.col, 0.1);
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.burst7 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    launchRocket();
    nextLaunch = 2.0;
  });
})(game);
