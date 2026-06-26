// 340-signal-boost.js
// シグナルブースト — 弱まる信号を増幅してアンテナに届ける
// 操作: タップで信号ブースターを起動（正しいタイミングで連鎖）
// 成功: 15回信号到達  失敗: 5回途切れ or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020810',
    grid:   '#0a1628',
    wire:   '#1e3a5f',
    wireHi: '#2563eb',
    signal: '#22d3ee',
    signalHi:'#a5f3fc',
    booster:'#3b82f6',
    boosterLit:'#60a5fa',
    boosterHi:'#93c5fd',
    antenna:'#22c55e',
    antennaHi:'#86efac',
    break:  '#ef4444',
    breakHi:'#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // 4 boosters in a chain
  var BOOSTERS = [
    { x: W * 0.18, y: H * 0.5 },
    { x: W * 0.38, y: H * 0.5 },
    { x: W * 0.62, y: H * 0.5 },
    { x: W * 0.82, y: H * 0.5 }
  ];
  var ANTENNA_X = W * 0.95;

  var signalX = 0; // current x of signal pulse
  var signalProgress = 0; // 0-1 across whole path
  var signalStrength = 1.0; // decays per segment
  var signalActive = false;
  var decayRate = 0.4; // strength lost per segment without boost

  var boosterCharges = [1, 1, 1, 1]; // how many boosts available
  var boosterCooldown = [0, 0, 0, 0];
  var BOOSTER_COOLDOWN = 1.0;

  var succeeded = 0;
  var NEEDED = 15;
  var broke = 0;
  var MAX_BROKE = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var successAnim = 0;
  var breakAnim = 0;
  var segmentEffects = [];

  function startSignal() {
    signalX = 0;
    signalProgress = 0;
    signalStrength = 1.0;
    signalActive = true;
    boosterCharges = [1, 1, 1, 1];
  }

  function boostNearestToSignal(tx, ty) {
    // Find booster nearest to tap that signal is approaching
    var best = -1, bestDist = 200;
    for (var i = 0; i < BOOSTERS.length; i++) {
      var d = Math.hypot(tx - BOOSTERS[i].x, ty - BOOSTERS[i].y);
      if (d < bestDist && boosterCharges[i] > 0 && boosterCooldown[i] <= 0) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!signalActive) {
      startSignal();
      return;
    }
    var bi = boostNearestToSignal(tx, ty);
    if (bi >= 0) {
      signalStrength = Math.min(1.0, signalStrength + 0.5);
      boosterCharges[bi]--;
      boosterCooldown[bi] = BOOSTER_COOLDOWN;
      game.audio.play('se_tap', 0.4);
      segmentEffects.push({ x: BOOSTERS[bi].x, y: BOOSTERS[bi].y, r: 0, life: 0.5 });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successAnim > 0) successAnim -= dt * 2;
    if (breakAnim > 0) breakAnim -= dt * 2;

    for (var i = 0; i < 4; i++) {
      if (boosterCooldown[i] > 0) {
        boosterCooldown[i] -= dt;
        if (boosterCooldown[i] <= 0) boosterCharges[i] = 1;
      }
    }

    if (signalActive) {
      signalProgress += dt * 0.4;
      // Decay signal continuously
      signalStrength -= dt * 0.15;

      // At each booster crossing, additional decay if not boosted
      var segment = Math.floor(signalProgress * 5); // 0-4 for 4 segments + final
      if (segment > 4) segment = 4;

      // Check booster positions
      var totalLen = W;
      signalX = signalProgress * totalLen;

      if (signalStrength <= 0) {
        // Signal broke
        signalActive = false;
        broke++;
        breakAnim = 0.8;
        game.audio.play('se_failure', 0.5);
        if (broke >= MAX_BROKE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        setTimeout(function() { if (!done) startSignal(); }, 1000);
        return;
      }

      if (signalProgress >= 1.0) {
        // Reached antenna!
        signalActive = false;
        succeeded++;
        successAnim = 0.8;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: ANTENNA_X, y: H * 0.5, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.antennaHi });
        }
        if (succeeded >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(succeeded * 200 + Math.ceil(timeLeft) * 100); }, 500);
          return;
        }
        setTimeout(function() { if (!done) startSignal(); }, 600);
      }
    }

    for (var se = segmentEffects.length - 1; se >= 0; se--) {
      segmentEffects[se].r += 100 * dt;
      segmentEffects[se].life -= dt * 2;
      if (segmentEffects[se].life <= 0) segmentEffects.splice(se, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var gx = 0; gx < W; gx += 80) game.draw.line(gx, 0, gx, H, C.grid, 1);
    for (var gy = 0; gy < H; gy += 80) game.draw.line(0, gy, W, gy, C.grid, 1);

    // Wire path
    game.draw.line(0, H * 0.5, W * 0.93, H * 0.5, C.wire, 8);

    // Signal trail
    if (signalActive) {
      var sAlpha = Math.max(0, signalStrength);
      game.draw.line(0, H * 0.5, signalX, H * 0.5, C.signalHi, 6);
      game.draw.circle(signalX, H * 0.5, 24 * signalStrength, C.signal, sAlpha * 0.4);
      game.draw.circle(signalX, H * 0.5, 18, C.signal, sAlpha * 0.9);
      game.draw.circle(signalX, H * 0.5, 10, C.signalHi, sAlpha);
    }

    // Boosters
    for (var i2 = 0; i2 < BOOSTERS.length; i2++) {
      var b = BOOSTERS[i2];
      var charged = boosterCharges[i2] > 0;
      var col = charged ? C.boosterLit : C.booster;
      game.draw.circle(b.x, b.y, 50, col, 0.3);
      game.draw.circle(b.x, b.y, 38, col, 0.8);
      game.draw.circle(b.x, b.y, 22, C.boosterHi, charged ? 0.8 : 0.3);
      game.draw.text(charged ? '⚡' : '○', b.x, b.y + 14, { size: 32, color: '#fff', bold: true });
    }

    // Segment effects
    for (var se2 = 0; se2 < segmentEffects.length; se2++) {
      var ef = segmentEffects[se2];
      game.draw.circle(ef.x, ef.y, ef.r, C.boosterHi, ef.life * 0.5);
    }

    // Antenna
    game.draw.line(ANTENNA_X, H * 0.3, ANTENNA_X, H * 0.5, C.antenna, 8);
    game.draw.line(ANTENNA_X - 40, H * 0.35, ANTENNA_X, H * 0.38, C.antenna, 4);
    game.draw.line(ANTENNA_X + 40, H * 0.35, ANTENNA_X, H * 0.38, C.antenna, 4);
    game.draw.circle(ANTENNA_X, H * 0.3, 20, C.antennaHi, 0.9);

    // Start indicator
    game.draw.circle(30, H * 0.5, 24, C.signal, 0.8);
    game.draw.text('TX', 30, H * 0.5 + 10, { size: 24, color: '#fff', bold: true });

    // Results
    if (successAnim > 0) {
      game.draw.text('到達！', W / 2, H * 0.82, { size: 64, color: C.antennaHi, bold: true });
    } else if (breakAnim > 0) {
      game.draw.text('途切れ…', W / 2, H * 0.82, { size: 56, color: C.breakHi, bold: true });
    } else if (!signalActive) {
      game.draw.text('タップで送信！', W / 2, H * 0.84, { size: 44, color: C.ui });
    } else {
      var pct = Math.round(signalStrength * 100);
      var sCol = signalStrength > 0.5 ? C.signal : (signalStrength > 0.25 ? C.boosterLit : C.break);
      game.draw.text('強度: ' + pct + '%', W / 2, H * 0.84, { size: 44, color: sCol });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Break dots
    for (var bi2 = 0; bi2 < MAX_BROKE; bi2++) {
      game.draw.circle(W / 2 - (MAX_BROKE - 1) * 28 + bi2 * 56, H * 0.9, 16, bi2 < broke ? C.break : '#020810');
    }

    game.draw.text(succeeded + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireHi : C.break);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    startSignal();
  });
})(game);
