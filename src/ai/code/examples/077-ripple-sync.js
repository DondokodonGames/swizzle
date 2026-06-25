// 077-ripple-sync.js
// リップルシンク — 複数の波紋が同期した瞬間にタップする共鳴感
// 操作: 全ての波紋が重なった瞬間にタップ
// 成功: 5回シンク成功  失敗: 5回外す or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030812',
    ring1:   '#3b82f6',
    ring2:   '#8b5cf6',
    ring3:   '#06b6d4',
    sync:    '#22c55e',
    syncHi:  '#86efac',
    miss:    '#ef4444',
    ui:      '#475569'
  };

  // Three oscillators with different periods
  var RINGS = [
    { period: 1.8, phase: 0, color: C.ring1, cx: W / 2 - 80, cy: H * 0.42 },
    { period: 2.4, phase: 0.6, color: C.ring2, cx: W / 2 + 80, cy: H * 0.42 },
    { period: 1.5, phase: 1.1, color: C.ring3, cx: W / 2, cy: H * 0.48 }
  ];

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 25;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var syncFlash = 0;

  // "Sync" = all rings at same phase (within tolerance)
  var SYNC_TOLERANCE = 0.12; // fraction of period

  function getSyncPhases() {
    return RINGS.map(function(r) {
      var t = game.time.elapsed;
      return ((t + r.phase) % r.period) / r.period; // 0-1
    });
  }

  function isSynced() {
    var phases = getSyncPhases();
    // Sync happens when all phases are near 0.5 (ring at max expansion)
    return phases.every(function(p) { return Math.abs(p - 0.5) < SYNC_TOLERANCE; });
  }

  game.onTap(function(x, y) {
    if (done) return;
    if (isSynced()) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      syncFlash = 0.3;
      game.audio.play('se_tap', 1.0);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 40 + Math.ceil(timeLeft) * 8); }, 400);
      }
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.4;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (feedback > 0) feedback -= dt;
    if (syncFlash > 0) syncFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var phases = getSyncPhases();
    var synced = isSynced();

    // Sync flash
    if (syncFlash > 0) {
      game.draw.rect(0, 0, W, H, C.sync, syncFlash / 0.3 * 0.2);
    }

    // Draw rings
    var CENTER_X = W / 2;
    var CENTER_Y = H * 0.45;
    var MAX_R = 200;

    for (var i = 0; i < RINGS.length; i++) {
      var ring = RINGS[i];
      var p = phases[i];
      var r = p * MAX_R;

      // Pulse: bright at start (r=0), fades as expands
      var alpha = (1 - p) * (synced ? 1.0 : 0.7);
      var lineW = 8 - p * 4;

      // Outer glow
      game.draw.circle(CENTER_X, CENTER_Y, r + 8, ring.color, alpha * 0.15);
      // Main ring
      game.draw.circle(CENTER_X, CENTER_Y, r, ring.color, alpha * 0.6);
      game.draw.circle(CENTER_X, CENTER_Y, r - 4, '#030812', alpha * 0.5);
    }

    // Center node
    var centerPulse = 0.3 + 0.3 * Math.sin(game.time.elapsed * 10);
    if (synced) {
      game.draw.circle(CENTER_X, CENTER_Y, 80, C.sync, centerPulse);
      game.draw.text('NOW!', CENTER_X, CENTER_Y, { size: 56, color: '#fff', bold: true });
    } else {
      game.draw.circle(CENTER_X, CENTER_Y, 40, '#1e293b');
      game.draw.circle(CENTER_X, CENTER_Y, 24, '#334155');
    }

    // Individual phase bars (showing when each ring peaks)
    for (var j = 0; j < RINGS.length; j++) {
      var barX = 80 + j * 80;
      var barY = H * 0.72;
      var barH = 160;
      var p2 = phases[j];
      var ring2 = RINGS[j];
      game.draw.rect(barX - 16, barY, 32, barH, '#0a1428');
      game.draw.rect(barX - 12, barY + barH * (1 - p2), 24, barH * p2, ring2.color, 0.8);
      // Peak marker
      game.draw.rect(barX - 20, barY + barH * 0.5 - 3, 40, 6, C.syncHi, 0.4);
    }
    game.draw.text('↑タップ', W * 0.18, H * 0.72 + 180, { size: 32, color: '#334155' });

    // Phase alignment indicator
    var minDiff = 0;
    for (var k = 0; k < phases.length - 1; k++) {
      minDiff = Math.max(minDiff, Math.abs(phases[k] - 0.5));
    }
    var syncPct = Math.max(0, 1 - minDiff / SYNC_TOLERANCE);
    var syncBarW = 400;
    game.draw.rect(W / 2 - syncBarW / 2, H * 0.88, syncBarW, 24, '#0a1428');
    game.draw.rect(W / 2 - syncBarW / 2, H * 0.88, syncBarW * syncPct, 24, synced ? C.sync : C.ring1, 0.8);
    game.draw.text('同期率', W / 2, H * 0.88 - 36, { size: 36, color: '#64748b' });

    // Feedback
    if (feedback > 0) {
      if (feedbackOk) {
        game.draw.text('シンク！', W / 2, H * 0.28, { size: 88, color: C.sync, bold: true });
      } else {
        game.draw.text('ズレた！', W / 2, H * 0.28, { size: 88, color: C.miss, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#030812');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ring1 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 128, 28, s < score ? C.sync : '#0a1428');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 200, 18, m < misses ? C.miss : '#0a1428');
    }

    // Guide
    game.draw.text('波紋が重なった瞬間にタップ！', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
