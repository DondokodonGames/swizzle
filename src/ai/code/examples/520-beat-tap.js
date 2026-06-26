// 520-beat-tap.js
// ビートタップ — リズムに合わせてタップ、ビートの瞬間に当てる
// 操作: ビートに合わせてタップ（精度で得点）
// 成功: 30ビート達成  失敗: 15ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#05000f',
    beat:    '#8b5cf6',
    beatHi:  '#c4b5fd',
    perfect: '#f59e0b',
    good:    '#22c55e',
    miss:    '#ef4444',
    ring:    '#6d28d9',
    text:    '#f1f5f9',
    ui:      '#374151',
    track:   '#1e1b4b'
  };

  var BPM = 100;
  var BEAT_INTERVAL = 60 / BPM;
  var beatTimer = 0;
  var beatPulse = 0;
  var totalBeats = 0;
  var hitBeats = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var lastResult = '';
  var lastResultTimer = 0;
  var lastResultCol = C.good;
  var rings = [];
  var tapWindow = BEAT_INTERVAL * 0.3; // ±30% of beat interval
  var waitingForTap = false;
  var tapConsumed = false;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check how close to beat center we are
    var offset = Math.abs(beatTimer - BEAT_INTERVAL / 2);
    var maxOffset = BEAT_INTERVAL * 0.35;

    if (offset < BEAT_INTERVAL * 0.12) {
      // Perfect
      hitBeats++;
      lastResult = 'PERFECT!';
      lastResultCol = C.perfect;
      lastResultTimer = 0.9;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.4, col: C.perfect });
      }
      rings.push({ r: 60, maxR: 300, life: 0.5, col: C.perfect });
      if (hitBeats >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hitBeats * 200 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else if (offset < maxOffset) {
      // Good
      hitBeats++;
      lastResult = 'GOOD';
      lastResultCol = C.good;
      lastResultTimer = 0.7;
      game.audio.play('se_tap', 0.5);
      rings.push({ r: 60, maxR: 300, life: 0.4, col: C.good });
      if (hitBeats >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hitBeats * 100 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      // Miss (tapped at wrong time)
      misses++;
      lastResult = 'MISS';
      lastResultCol = C.miss;
      lastResultTimer = 0.7;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    tapConsumed = true;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      beatTimer += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
      if (beatTimer >= BEAT_INTERVAL) {
        beatTimer -= BEAT_INTERVAL;
        totalBeats++;
        beatPulse = 1.0;
        tapConsumed = false;
        // Count as miss if not tapped at all
        if (waitingForTap && !tapConsumed) {
          // already handled above
        }
        waitingForTap = true;
      }
    }

    if (beatPulse > 0) beatPulse -= dt * 4;
    if (lastResultTimer > 0) lastResultTimer -= dt;

    // Update rings
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      rings[ri].r += (rings[ri].maxR - rings[ri].r) * dt * 5;
      rings[ri].life -= dt * 2;
      if (rings[ri].life <= 0) rings.splice(ri, 1);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat indicator background
    game.draw.rect(0, 0, W, H, C.track, 0.15);

    // Rings
    for (var ri2 = 0; ri2 < rings.length; ri2++) {
      var rng = rings[ri2];
      game.draw.circle(W / 2, H * 0.5, rng.r, rng.col, rng.life * 0.6);
    }

    // Center beat circle
    var pulse = beatPulse;
    var mainR = 120 + pulse * 60;
    game.draw.circle(W / 2, H * 0.5, mainR + 20, C.ring, 0.2 + pulse * 0.3);
    game.draw.circle(W / 2, H * 0.5, mainR, C.beat, 0.7 + pulse * 0.3);
    game.draw.circle(W / 2, H * 0.5, mainR - 20, C.beatHi, 0.3 + pulse * 0.4);

    // Beat timing arc
    var beatFrac = beatTimer / BEAT_INTERVAL;
    var arcAngle = beatFrac * Math.PI * 2 - Math.PI / 2;
    // Show approaching beat as arc fills
    game.draw.circle(W / 2, H * 0.5, 160, C.beatHi, beatFrac * 0.3);

    // Perfect zone indicator
    game.draw.text('♩', W / 2, H * 0.5 + 20, { size: 80, color: '#fff', bold: true });

    // Timing guide
    var windowFrac = tapWindow / BEAT_INTERVAL;
    var nearCenter = 1 - Math.abs(beatFrac - 0.5) / 0.5;
    var zoneCol = nearCenter > 0.75 ? C.perfect : nearCenter > 0.4 ? C.good : C.ui;
    game.draw.text('TAP', W / 2, H * 0.65, { size: 48, color: zoneCol, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.9);
    }

    // Last result
    if (lastResultTimer > 0) {
      game.draw.text(lastResult, W / 2, H * 0.75, { size: 64, color: lastResultCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 36 + mi * 72, H * 0.955, 16, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(hitBeats + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beat : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    beatTimer = BEAT_INTERVAL * 0.8; // start near first beat
  });
})(game);
