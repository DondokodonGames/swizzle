// 057-pulse-beat.js
// パルスビート — 画面の鼓動に合わせてタップするリズム同期の快感
// 操作: 画面の波紋が最大になった瞬間にタップ
// 成功: 10回ジャストタイミング  失敗: 5回外れる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050208',
    pulse:   '#8b5cf6',
    pulseHi: '#c4b5fd',
    hit:     '#22c55e',
    miss:    '#ef4444',
    ring:    '#4c1d95',
    ui:      '#475569'
  };

  var BPM = 90; // beats per minute
  var BEAT_INTERVAL = 60 / BPM; // seconds per beat
  var beatTimer = 0;
  var beatPhase = 0; // 0-1 within current beat
  var beatNum = 0;

  // Ring animation
  var rings = [];

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 20;
  var done = false;
  var lastTapBeat = -1; // prevent double-tap on same beat

  var feedback = 0;
  var feedbackOk = false;
  var tapFlash = 0;

  // Hit window: center of beat ±15% of beat interval
  var HIT_WINDOW = 0.15;

  game.onTap(function(x, y) {
    if (done) return;

    // Check if we're in the hit window (beatPhase near 0 or near 1 = peak)
    var distToCenter = Math.abs(beatPhase - 0.5);
    var inWindow = distToCenter < HIT_WINDOW;

    if (lastTapBeat === beatNum && !inWindow) return; // still on same beat

    if (inWindow) {
      if (lastTapBeat !== beatNum) {
        score++;
        feedbackOk = true;
        feedback = 0.35;
        tapFlash = 0.2;
        lastTapBeat = beatNum;
        game.audio.play('se_tap', 1.0);
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 25 + Math.ceil(timeLeft) * 8); }, 400);
        }
      }
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.3;
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

    beatTimer += dt;
    if (beatTimer >= BEAT_INTERVAL) {
      beatTimer -= BEAT_INTERVAL;
      beatNum++;
      // Spawn ring on beat
      rings.push({ r: 40, maxR: 400, life: BEAT_INTERVAL * 0.9 });
      game.audio.play('se_tap', 0.2); // subtle tick
    }
    beatPhase = beatTimer / BEAT_INTERVAL; // 0=beat start, 0.5=halfway, 1=next beat

    // Update rings
    for (var i = rings.length - 1; i >= 0; i--) {
      rings[i].life -= dt;
      rings[i].r = (1 - rings[i].life / (BEAT_INTERVAL * 0.9)) * rings[i].maxR;
      if (rings[i].life <= 0) rings.splice(i, 1);
    }

    if (feedback > 0) feedback -= dt;
    if (tapFlash > 0) tapFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background pulse glow
    var mainPulse = Math.sin(beatPhase * Math.PI); // 0 at start/end, 1 at midpoint
    game.draw.circle(W / 2, H / 2, 280 + mainPulse * 120, C.pulse, mainPulse * 0.15);
    game.draw.circle(W / 2, H / 2, 160 + mainPulse * 80, C.pulse, mainPulse * 0.2);

    // Rings expanding from center
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      var age = 1 - ring.life / (BEAT_INTERVAL * 0.9);
      game.draw.circle(W / 2, H / 2, ring.r, C.pulse, (1 - age) * 0.5);
    }

    // Center orb — biggest at beatPhase=0.5
    var orbR = 80 + mainPulse * 60;
    game.draw.circle(W / 2, H / 2, orbR + 20, C.pulseHi, mainPulse * 0.3);
    game.draw.circle(W / 2, H / 2, orbR, C.pulse);
    game.draw.circle(W / 2 - orbR * 0.25, H / 2 - orbR * 0.25, orbR * 0.25, '#fff', 0.4);

    // Hit window indicator (arc showing when to tap)
    // Draw small arc indicators at beat peak position
    var beatStr = Math.floor(mainPulse * 100) + '%';
    game.draw.text(beatStr, W / 2, H / 2 + orbR + 80, { size: 48, color: C.pulseHi, bold: true });

    // In hit window highlight
    var inWin = Math.abs(beatPhase - 0.5) < HIT_WINDOW;
    if (inWin) {
      game.draw.circle(W / 2, H / 2, orbR + 36, '#22c55e', 0.4);
      game.draw.text('NOW!', W / 2, H / 2 + orbR + 160, { size: 56, color: C.hit, bold: true });
    }

    // Tap flash
    if (tapFlash > 0) {
      game.draw.circle(W / 2, H / 2, 500, '#fff', tapFlash / 0.2 * 0.15);
    }

    // Feedback
    if (feedback > 0) {
      if (feedbackOk) {
        game.draw.text('ジャスト！', W / 2, H * 0.25, { size: 72, color: C.hit, bold: true });
      } else {
        game.draw.text('ズレた！', W / 2, H * 0.25, { size: 72, color: C.miss, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#050208');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.pulse : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 84;
      game.draw.circle(sx, 128, 28, s < score ? C.hit : '#1a0f28');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 64;
      game.draw.circle(mx, 200, 20, m < misses ? C.miss : '#150d1e');
    }

    // Guide
    game.draw.text('波紋が最大の時にタップ！', W / 2, H - 200, { size: 48, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    beatTimer = BEAT_INTERVAL * 0.3; // slight delay before first beat
  });
})(game);
