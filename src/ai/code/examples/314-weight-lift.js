// 314-weight-lift.js
// ウェイトリフティング — バーベルを持ち上げる瞬間の「力の集中」を体感する
// 操作: ゲージがMAXに達した瞬間に上スワイプ！
// 成功: 5回成功リフト  失敗: 3回失敗 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0c14',
    floor:  '#1e1b2e',
    floorHi:'#2d2944',
    bar:    '#94a3b8',
    barHi:  '#e2e8f0',
    weight: '#1e293b',
    weightHi:'#334155',
    weightRim:'#64748b',
    athlete:'#f59e0b',
    athHi:  '#fde68a',
    gauge:  '#22c55e',
    gaugeHi:'#86efac',
    gaugeLo:'#ef4444',
    gaugeMax:'#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var LIFT_SUCCEED_ZONE = [0.82, 0.98]; // gauge ratio where lift must happen
  var gaugeValue = 0;
  var gaugeDir = 1;
  var GAUGE_SPEED = 1.4; // oscillation speed
  var phase = 'ready'; // ready, lifting, success, fail
  var liftY = 0; // bar Y offset (0 = resting, negative = raised)
  var liftVY = 0;
  var lifts = 0;
  var NEEDED = 5;
  var fails = 0;
  var MAX_FAIL = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var resultMsg = '';
  var resultTimer = 0;
  var shakeAnim = 0;
  var sweatDrops = [];
  var barY = H * 0.6;

  // Wobble effect from effort
  var tension = 0;

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (dir !== 'up') return;
    if (phase !== 'ready') return;

    var ratio = gaugeValue;
    if (ratio >= LIFT_SUCCEED_ZONE[0] && ratio <= LIFT_SUCCEED_ZONE[1]) {
      // SUCCESS
      phase = 'lifting';
      liftVY = -600 - ratio * 200;
      liftY = 0;
      lifts++;
      resultMsg = ratio > 0.9 ? '完璧！' : '成功！';
      resultTimer = 1.0;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: barY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 - 100, life: 0.8, col: ratio > 0.9 ? C.gaugeMax : C.gaugeHi });
      }
      if (lifts >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(lifts * 600 + Math.ceil(timeLeft) * 100); }, 600);
      }
    } else {
      // FAIL
      phase = 'fail';
      fails++;
      resultMsg = ratio < LIFT_SUCCEED_ZONE[0] ? '早すぎ！' : '遅すぎ！';
      resultTimer = 0.8;
      shakeAnim = 0.4;
      game.audio.play('se_failure', 0.6);
      for (var pi2 = 0; pi2 < 8; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: barY, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150, life: 0.5, col: C.gaugeLo });
      }
      if (fails >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
      setTimeout(function() { if (!done) { phase = 'ready'; } }, 600);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultTimer > 0) resultTimer -= dt;
    if (shakeAnim > 0) shakeAnim -= dt;

    // Oscillate gauge
    if (phase === 'ready') {
      gaugeValue += dt * GAUGE_SPEED * gaugeDir;
      if (gaugeValue >= 1) { gaugeValue = 1; gaugeDir = -1; }
      if (gaugeValue <= 0) { gaugeValue = 0; gaugeDir = 1; }
      tension = gaugeValue;
    }

    // Bar lifting animation
    if (phase === 'lifting') {
      liftVY += 800 * dt; // gravity
      liftY += liftVY * dt;
      if (liftY >= 0) {
        liftY = 0;
        liftVY = 0;
        phase = 'ready';
        gaugeValue = 0;
      }
    }

    // Sweat drops
    if (tension > 0.5 && Math.random() < dt * 3) {
      sweatDrops.push({ x: W * 0.42 + (Math.random() - 0.5) * 60, y: H * 0.48, vy: 100 + Math.random() * 60, life: 0.8 });
    }
    for (var si = sweatDrops.length - 1; si >= 0; si--) {
      sweatDrops[si].y += sweatDrops[si].vy * dt;
      sweatDrops[si].life -= dt;
      if (sweatDrops[si].life <= 0) sweatDrops.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    var shakeX = shakeAnim > 0 ? Math.sin(shakeAnim * 30) * 10 : 0;
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.75, W, H * 0.25, C.floor, 0.9);
    game.draw.rect(0, H * 0.75, W, 12, C.floorHi, 0.6);

    // Athlete (stick figure, strained)
    var ath_cx = W / 2 + shakeX;
    var strain = 1 + tension * 0.05;
    // Bent legs
    game.draw.line(ath_cx, H * 0.72, ath_cx - 40, H * 0.78, C.athlete, 14);
    game.draw.line(ath_cx, H * 0.72, ath_cx + 40, H * 0.78, C.athlete, 14);
    // Body bent forward
    game.draw.line(ath_cx, H * 0.72, ath_cx - 10, H * 0.56, C.athlete, 14);
    // Arms up holding bar
    game.draw.line(ath_cx - 10, H * 0.56, ath_cx - 50, barY + liftY + 12, C.athHi, 12);
    game.draw.line(ath_cx - 10, H * 0.56, ath_cx + 50, barY + liftY + 12, C.athHi, 12);
    // Head
    game.draw.circle(ath_cx - 14, H * 0.53, 28, C.athlete, 0.9);

    // Sweat
    for (var si2 = 0; si2 < sweatDrops.length; si2++) {
      var sd = sweatDrops[si2];
      game.draw.circle(sd.x, sd.y, 6, '#60a5fa', sd.life * 0.8);
    }

    // Barbell
    var bY = barY + liftY;
    game.draw.line(ath_cx - 180, bY, ath_cx + 180, bY, C.barHi, 16);
    game.draw.line(ath_cx - 180, bY, ath_cx + 180, bY, C.bar, 10);
    // Weights
    var weights = [[-170,-130],[-120,-80],[80,120],[130,170]];
    for (var wi = 0; wi < weights.length; wi++) {
      var wx = ath_cx + weights[wi][0] + shakeX;
      var wy = bY;
      game.draw.rect(wx, wy - 40, weights[wi][1] - weights[wi][0], 80, C.weight, 0.9);
      game.draw.rect(wx, wy - 40, 6, 80, C.weightHi, 0.5);
      game.draw.circle(wx + (weights[wi][1] - weights[wi][0]) / 2, wy, 20, C.weightRim, 0.7);
    }

    // Gauge bar
    var gaugeX = 60, gaugeY = H * 0.82;
    var gaugeW = W - 120, gaugeH = 44;
    game.draw.rect(gaugeX, gaugeY, gaugeW, gaugeH, '#0f0f1a', 0.9);
    var gFill = gaugeValue;
    var gCol = gFill > 0.9 ? C.gaugeMax : (gFill > LIFT_SUCCEED_ZONE[0] ? C.gauge : C.gaugeLo);
    game.draw.rect(gaugeX, gaugeY, gaugeW * gFill, gaugeH, gCol, 0.9);

    // Success zone highlight on gauge
    game.draw.rect(gaugeX + gaugeW * LIFT_SUCCEED_ZONE[0], gaugeY - 4, gaugeW * (LIFT_SUCCEED_ZONE[1] - LIFT_SUCCEED_ZONE[0]), gaugeH + 8, C.gaugeMax, 0.25);

    // Gauge marker
    var markerX = gaugeX + gaugeW * gFill;
    game.draw.line(markerX, gaugeY - 8, markerX, gaugeY + gaugeH + 8, '#fff', 4);

    if (resultTimer > 0) {
      game.draw.text(resultMsg, W / 2, H * 0.88, { size: 60, color: resultMsg.includes('完璧') ? C.gaugeMax : (resultMsg.includes('成功') ? C.gaugeHi : C.gaugeLo), bold: true });
    } else if (phase === 'ready') {
      game.draw.text('↑ スワイプでリフト！', W / 2, H * 0.89, { size: 40, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 28 + fi * 56, H * 0.95, 16, fi < fails ? C.gaugeLo : '#0a0c14');
    }

    game.draw.text(lifts + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gauge : C.gaugeLo);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
