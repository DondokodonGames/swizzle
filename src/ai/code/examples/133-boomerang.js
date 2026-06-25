// 133-boomerang.js
// ブーメラン — 投げたブーメランが戻ってくるタイミングでキャッチする間合いゲーム
// 操作: タップで投げる、戻ってきたらもう一度タップでキャッチ
// 成功: 10回キャッチ  失敗: 5回ミス or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    thrower: '#3b82f6',
    throwerHi:'#93c5fd',
    boom:    '#f59e0b',
    boomHi:  '#fbbf24',
    trail:   '#d97706',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var THROWER_X = W * 0.18;
  var THROWER_Y = H * 0.5;
  var CATCH_R = 60;

  var state = 'ready'; // 'ready' | 'flying' | 'returning' | 'catching'
  var boomX = THROWER_X, boomY = THROWER_Y;
  var boomAngle = 0;
  var boomPhase = 0; // 0-1 in arc path
  var FLIGHT_TIME = 1.4;
  var flightTimer = 0;

  // Arc path: parabolic throw to right side and back
  var peakX = W * 0.8;
  var peakY = H * 0.25;

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var trail = [];
  var catchWindow = false; // true when boom is near thrower on return
  var catchWindowTimer = 0;
  var CATCH_WINDOW = 0.28;

  function throwBoom() {
    state = 'flying';
    flightTimer = 0;
    trail = [];
    boomPhase = 0;
    game.audio.play('se_tap', 0.7);
  }

  function getBoomPos(phase, returning) {
    // Forward arc: THROWER → peak → far point
    // Return arc: far point → peak-low → THROWER
    var t = phase;
    if (!returning) {
      var farX = W * 0.85;
      var farY = H * 0.55;
      // Quadratic bezier: thrower → peak → far
      var bx = (1-t)*(1-t)*THROWER_X + 2*(1-t)*t*peakX + t*t*farX;
      var by = (1-t)*(1-t)*THROWER_Y + 2*(1-t)*t*peakY + t*t*farY;
      return {x: bx, y: by};
    } else {
      var farX2 = W * 0.85;
      var farY2 = H * 0.55;
      var retPeakX = W * 0.5;
      var retPeakY = H * 0.72;
      var bx2 = (1-t)*(1-t)*farX2 + 2*(1-t)*t*retPeakX + t*t*THROWER_X;
      var by2 = (1-t)*(1-t)*farY2 + 2*(1-t)*t*retPeakY + t*t*THROWER_Y;
      return {x: bx2, y: by2};
    }
  }

  game.onTap(function() {
    if (done) return;
    if (state === 'ready') {
      throwBoom();
    } else if (state === 'returning') {
      // Try to catch
      var dx = boomX - THROWER_X, dy = boomY - THROWER_Y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < CATCH_R + 24) {
        // Caught!
        score++;
        feedbackOk = true;
        feedback = 0.4;
        game.audio.play('se_success');
        state = 'ready';
        boomX = THROWER_X; boomY = THROWER_Y;
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score*50 + Math.ceil(timeLeft)*12); }, 400);
        }
      } else {
        // Missed
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.6);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
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

    boomAngle += 8 * dt;

    if (state === 'flying') {
      flightTimer += dt;
      boomPhase = Math.min(1, flightTimer / FLIGHT_TIME);
      var pos = getBoomPos(boomPhase, false);
      boomX = pos.x; boomY = pos.y;
      trail.push({x: boomX, y: boomY, age: 0});
      if (boomPhase >= 1) {
        state = 'returning';
        flightTimer = 0;
        boomPhase = 0;
      }
    } else if (state === 'returning') {
      flightTimer += dt;
      boomPhase = Math.min(1, flightTimer / FLIGHT_TIME);
      var pos2 = getBoomPos(boomPhase, true);
      boomX = pos2.x; boomY = pos2.y;
      trail.push({x: boomX, y: boomY, age: 0});
      // Check if passed thrower without catching
      if (boomPhase >= 1) {
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.5);
        state = 'ready';
        boomX = THROWER_X; boomY = THROWER_Y;
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
    trail = trail.filter(function(t) { return t.age < 0.3; });

    // Catch window detection
    if (state === 'returning') {
      var dx2 = boomX - THROWER_X, dy2 = boomY - THROWER_Y;
      catchWindow = Math.sqrt(dx2*dx2 + dy2*dy2) < CATCH_R + 40;
    } else {
      catchWindow = false;
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Arc guide dots
    for (var ai = 0; ai <= 12; ai++) {
      var ap = ai / 12;
      var gpos = getBoomPos(ap, false);
      game.draw.circle(gpos.x, gpos.y, 5, '#1a2a3a', 0.5);
    }
    for (var ai2 = 0; ai2 <= 12; ai2++) {
      var ap2 = ai2 / 12;
      var gpos2 = getBoomPos(ap2, true);
      game.draw.circle(gpos2.x, gpos2.y, 5, '#2a1a1a', 0.5);
    }

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      var tf = 1 - tr.age / 0.3;
      game.draw.circle(tr.x, tr.y, 12 * tf, C.trail, tf * 0.4);
    }

    // Boomerang
    if (state !== 'ready') {
      var b1x = boomX + Math.cos(boomAngle) * 28;
      var b1y = boomY + Math.sin(boomAngle) * 8;
      var b2x = boomX - Math.cos(boomAngle) * 28;
      var b2y = boomY - Math.sin(boomAngle) * 8;
      game.draw.circle(b1x, b1y, 14, C.boom);
      game.draw.circle(b2x, b2y, 14, C.boom);
      game.draw.circle(boomX, boomY, 10, C.boomHi, 0.6);
    }

    // Thrower / catch zone
    var catchPulse = catchWindow ? (0.5 + 0.5 * Math.abs(Math.sin(timeLeft * 12))) : 0.2;
    game.draw.circle(THROWER_X, THROWER_Y, CATCH_R, catchWindow ? C.correct : '#1a2a3a', catchPulse * 0.4);
    game.draw.circle(THROWER_X, THROWER_Y, 36, C.thrower, 0.9);
    game.draw.circle(THROWER_X - 10, THROWER_Y - 10, 12, C.throwerHi, 0.5);

    if (catchWindow) {
      game.draw.text('今！', THROWER_X, THROWER_Y - 80, { size: 72, color: C.correct, bold: true });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? 'キャッチ！' : 'ミス！', W/2, H*0.75, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    var phaseText = state === 'ready' ? 'タップで投げる' : (state === 'returning' ? 'タップでキャッチ！' : '...');
    game.draw.text(phaseText, W/2, H*0.88, { size: 48, color: catchWindow ? C.correct : C.ui });

    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.boom : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
