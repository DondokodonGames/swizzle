// 205-antenna-signal.js
// アンテナ信号 — ランダムに動く受信点が自分の位置に来た瞬間をタップする集中力ゲーム
// 操作: タップで信号を受信
// 成功: 12回受信成功  失敗: 6回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030508',
    antenna: '#4b5563',
    antennaHi:'#9ca3af',
    signal:  '#22c55e',
    signalHi:'#86efac',
    wave:    '#22c55e',
    receiver:'#f59e0b',
    miss:    '#ef4444',
    ui:      '#334155'
  };

  var ANTENNA_X = W / 2;
  var ANTENNA_BASE_Y = H * 0.78;
  var ANTENNA_TIP_Y = H * 0.18;
  var RECEIVER_R = 44;
  var CATCH_R = 60; // tolerance

  // Receiver moves around the antenna tip
  var recvAngle = 0;
  var recvOrbitR = 0;
  var recvX = ANTENNA_X;
  var recvY = ANTENNA_TIP_Y;
  var orbitSpeed = 2.0;
  var orbitDir = 1;

  // Signal: antenna emits pulses along its length
  var signalPulses = [];
  var pulseTimer = 0;
  var PULSE_INTERVAL = 1.4;
  var PULSE_SPEED = -400; // going up

  var score = 0;
  var needed = 12;
  var misses = 0;
  var maxMisses = 6;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = 0;
  var feedbackOk = false;
  var waves = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if receiver is near antenna tip
    var dx = tx - recvX, dy = ty - recvY;
    var tapDist = Math.sqrt(dx * dx + dy * dy);

    var atTip = Math.sqrt((recvX - ANTENNA_X) * (recvX - ANTENNA_X) + (recvY - ANTENNA_TIP_Y) * (recvY - ANTENNA_TIP_Y)) < CATCH_R;

    if (atTip || tapDist < RECEIVER_R + 40) {
      if (atTip) {
        score++;
        feedbackOk = true; feedback = 0.4;
        game.audio.play('se_success', 0.8);
        // Ripple waves
        for (var wi = 0; wi < 3; wi++) {
          waves.push({ x: ANTENNA_X, y: ANTENNA_TIP_Y, r: 20, life: 0.8, delay: wi * 0.15 });
        }
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 90 + Math.ceil(timeLeft) * 30); }, 400);
        }
      } else {
        misses++;
        feedbackOk = false; feedback = 0.3;
        game.audio.play('se_failure', 0.4);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    } else {
      misses++;
      feedbackOk = false; feedback = 0.3;
      game.audio.play('se_failure', 0.3);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Move receiver in oval orbit around antenna tip, varying radius
    orbitSpeed = 1.5 + score * 0.1;
    recvAngle += orbitSpeed * orbitDir * dt;
    recvOrbitR = 80 + Math.sin(elapsed * 0.7) * 60 + Math.sin(elapsed * 1.3) * 40;
    recvX = ANTENNA_X + Math.cos(recvAngle) * recvOrbitR;
    recvY = ANTENNA_TIP_Y + Math.sin(recvAngle) * recvOrbitR * 0.5;

    // Reverse direction occasionally
    if (Math.random() < dt * 0.2) orbitDir *= -1;

    // Pulse along antenna
    pulseTimer -= dt;
    if (pulseTimer <= 0) {
      signalPulses.push({ y: ANTENNA_BASE_Y, life: 1.0 });
      pulseTimer = PULSE_INTERVAL;
    }
    for (var pi = signalPulses.length - 1; pi >= 0; pi--) {
      signalPulses[pi].y += PULSE_SPEED * dt;
      signalPulses[pi].life -= dt;
      if (signalPulses[pi].y < ANTENNA_TIP_Y - 20 || signalPulses[pi].life <= 0) {
        signalPulses.splice(pi, 1);
      }
    }

    // Waves
    for (var wi = waves.length - 1; wi >= 0; wi--) {
      var w = waves[wi];
      if (w.delay > 0) { w.delay -= dt; continue; }
      w.r += 200 * dt;
      w.life -= dt;
      if (w.life <= 0) waves.splice(wi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si = 0; si < 40; si++) {
      game.draw.circle((si * 127 + 50) % W, (si * 97 + 80) % H, 2, '#fff', 0.2 + 0.2 * Math.sin(elapsed + si));
    }

    // Waves at tip
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var w2 = waves[wi2];
      if (w2.delay > 0) continue;
      game.draw.circle(w2.x, w2.y, w2.r, C.signalHi, w2.life * 0.4);
    }

    // Antenna
    game.draw.line(ANTENNA_X, ANTENNA_BASE_Y, ANTENNA_X, ANTENNA_TIP_Y, C.antenna, 12);
    game.draw.line(ANTENNA_X, ANTENNA_BASE_Y, ANTENNA_X, ANTENNA_TIP_Y, C.antennaHi, 4);
    // Cross beams
    game.draw.line(ANTENNA_X - 60, ANTENNA_BASE_Y - 40, ANTENNA_X, ANTENNA_TIP_Y + 200, C.antenna, 6);
    game.draw.line(ANTENNA_X + 60, ANTENNA_BASE_Y - 40, ANTENNA_X, ANTENNA_TIP_Y + 200, C.antenna, 6);
    // Tip
    game.draw.circle(ANTENNA_X, ANTENNA_TIP_Y, 16, C.antennaHi, 0.9);

    // Signal pulses
    for (var pi2 = 0; pi2 < signalPulses.length; pi2++) {
      var p2 = signalPulses[pi2];
      game.draw.circle(ANTENNA_X, p2.y, 16, C.signal, p2.life * 0.8);
      game.draw.circle(ANTENNA_X, p2.y, 8, C.signalHi, p2.life);
    }

    // Catch zone
    var atTip2 = Math.sqrt((recvX - ANTENNA_X) * (recvX - ANTENNA_X) + (recvY - ANTENNA_TIP_Y) * (recvY - ANTENNA_TIP_Y)) < CATCH_R;
    if (atTip2) {
      game.draw.circle(ANTENNA_X, ANTENNA_TIP_Y, CATCH_R, C.signalHi, 0.2 + 0.15 * Math.sin(elapsed * 8));
    }

    // Receiver
    game.draw.circle(recvX, recvY, RECEIVER_R + 12, atTip2 ? C.signalHi : C.receiver, 0.2);
    game.draw.circle(recvX, recvY, RECEIVER_R, atTip2 ? C.signal : C.receiver, 0.85);
    game.draw.circle(recvX, recvY, RECEIVER_R * 0.4, atTip2 ? C.signalHi : '#fde68a', 0.5);

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.signal : C.miss, feedback * 0.12);
    }

    // HUD
    if (atTip2) {
      game.draw.text('タップ！', W / 2, H * 0.88, { size: 64, color: C.signalHi, bold: true });
    } else {
      game.draw.text('アンテナ先端に来たら！', W / 2, H * 0.88, { size: 38, color: C.ui });
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 - (maxMisses - 1) * 28 + mi * 56, 218, 18, mi < misses ? C.miss : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.signal : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
