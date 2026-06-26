// 417-signal-boost.js
// 電波増幅 — アンテナを調整して電波強度を最大にキープ
// 操作: 上下スワイプでアンテナ角度を調整
// 成功: 累計60秒のうち45秒間を最適範囲でキープ  失敗: 時間切れ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040810',
    sky:    '#080f1e',
    tower:  '#374151',
    towerHi:'#4b5563',
    antenna:'#94a3b8',
    antennaHi:'#e2e8f0',
    signal0:'#ef4444',
    signal1:'#f97316',
    signal2:'#eab308',
    signal3:'#22c55e',
    signalMax:'#22d3ee',
    wave:   '#3b82f6',
    waveHi: '#93c5fd',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var antennaAngle = 0;  // -PI/2 to PI/2, 0 = horizontal
  var OPTIMAL_ANGLE_MIN = -0.3;  // radians
  var OPTIMAL_ANGLE_MAX = 0.3;

  // Optimal angle changes over time
  var targetAngle = 0;
  var targetShift = 0;
  var targetShiftInterval = 4;
  var targetShiftTimer = 0;

  var signalStrength = 0;  // 0-1
  var goodTime = 0;  // accumulated good signal time
  var NEEDED_GOOD = 45;
  var totalTime = 60;
  var done = false;
  var timeLeft = totalTime;
  var elapsed = 0;
  var particles = [];
  var waveRings = [];
  var signalPulse = 0;
  var currentGoodPeriod = false;

  game.onSwipe(function(dir) {
    if (done) return;
    var step = 0.15;
    if (dir === 'up') antennaAngle = Math.max(-Math.PI/2, antennaAngle - step);
    else if (dir === 'down') antennaAngle = Math.min(Math.PI/2, antennaAngle + step);
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap top/bottom half for fine adjustment
    if (ty < H/2) antennaAngle = Math.max(-Math.PI/2, antennaAngle - 0.08);
    else antennaAngle = Math.min(Math.PI/2, antennaAngle + 0.08);
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        if (goodTime >= NEEDED_GOOD) {
          game.audio.play('se_success', 0.8);
          game.end.success(Math.round(goodTime*100));
        } else {
          game.audio.play('se_failure', 0.6);
          game.end.failure();
        }
        return;
      }
    }

    signalPulse += dt * 5;

    // Shift optimal angle
    targetShiftTimer += dt;
    if (targetShiftTimer > targetShiftInterval) {
      targetShift = (Math.random()-0.5)*1.2;
      targetShiftInterval = 3+Math.random()*3;
      targetShiftTimer = 0;
    }
    targetAngle = targetShift;

    // Calculate relative angle from optimal
    var relAngle = antennaAngle - targetAngle;
    // Signal strength drops off away from optimal
    var maxDiff = Math.PI/2;
    signalStrength = Math.max(0, 1 - Math.abs(relAngle) / maxDiff * 2);
    signalStrength = Math.pow(signalStrength, 0.5);  // smoother

    var isGood = signalStrength > 0.75;
    if (isGood) {
      goodTime += dt;
      currentGoodPeriod = true;
    } else {
      currentGoodPeriod = false;
    }

    if (goodTime >= NEEDED_GOOD && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function(){ game.end.success(Math.round(goodTime*100)+Math.ceil(timeLeft)*80); }, 500);
    }

    // Wave rings from antenna
    if (signalStrength > 0.3 && Math.random() < signalStrength * 0.5) {
      var antX = W*0.35;
      var antY = H*0.45;
      var tipX = antX + Math.cos(antennaAngle - Math.PI/2)*180;
      var tipY = antY + Math.sin(antennaAngle - Math.PI/2)*180;
      waveRings.push({ x:tipX, y:tipY, r:10, maxR:200+signalStrength*200, life:1.0, col: isGood ? C.signalMax : C.wave });
    }
    for (var wi = waveRings.length-1; wi >= 0; wi--) {
      waveRings[wi].r += (waveRings[wi].maxR - 10) * dt;
      waveRings[wi].life -= dt * 1.5;
      if (waveRings[wi].life <= 0) waveRings.splice(wi,1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.7);

    // Ground
    game.draw.rect(0, H*0.65, W, H*0.35, '#0a1020', 0.9);
    game.draw.line(0, H*0.65, W, H*0.65, C.towerHi, 3);

    // Wave rings
    for (var wi2 = 0; wi2 < waveRings.length; wi2++) {
      var wr = waveRings[wi2];
      game.draw.circle(wr.x, wr.y, wr.r, wr.col, wr.life*0.25);
    }

    // Tower
    var towX = W*0.35;
    var towY = H*0.65;
    game.draw.rect(towX-16, towY-240, 32, 240, C.tower, 0.9);
    game.draw.rect(towX-12, towY-240, 8, 240, C.towerHi, 0.3);
    // Cross beams
    for (var cb = 0; cb < 4; cb++) {
      var cbY = towY - 60 - cb*50;
      game.draw.line(towX-30, cbY, towX+30, cbY, C.towerHi, 4);
    }

    // Antenna (rotatable)
    var antX = towX;
    var antY = towY - 240;
    var antTipX = antX + Math.cos(antennaAngle - Math.PI/2) * 180;
    var antTipY = antY + Math.sin(antennaAngle - Math.PI/2) * 180;
    game.draw.line(antX, antY, antTipX, antTipY, C.antenna, 10);
    game.draw.line(antX, antY, antTipX, antTipY, C.antennaHi, 4);
    game.draw.circle(antX, antY, 18, C.antennaHi, 0.9);
    game.draw.circle(antTipX, antTipY, 12, C.signalMax, signalStrength*0.9);

    // Optimal angle indicator
    var optTipX = antX + Math.cos(targetAngle - Math.PI/2) * 200;
    var optTipY = antY + Math.sin(targetAngle - Math.PI/2) * 200;
    game.draw.line(antX, antY, optTipX, optTipY, C.signal3, 3);
    game.draw.circle(optTipX, optTipY, 16, C.signal3, 0.5);

    // Signal meter
    var meterX = W*0.65, meterY = H*0.2;
    var meterH = H*0.45;
    game.draw.rect(meterX-20, meterY, 40, meterH, '#0a1020', 0.9);
    var sigCol = signalStrength > 0.75 ? C.signalMax : signalStrength > 0.5 ? C.signal3 : signalStrength > 0.25 ? C.signal2 : C.signal0;
    game.draw.rect(meterX-20, meterY+meterH*(1-signalStrength), 40, meterH*signalStrength, sigCol, 0.9);
    // Optimal zone indicator
    game.draw.rect(meterX-24, meterY+meterH*0.25, 48, meterH*0.5, C.signal3, 0.12);
    game.draw.text('強度', meterX, meterY-30, { size: 36, color: C.ui });
    game.draw.text(Math.round(signalStrength*100)+'%', meterX, meterY+meterH+40, { size: 40, color: sigCol, bold: true });

    // Good time bar
    var goodRatio = goodTime / NEEDED_GOOD;
    game.draw.rect(60, H*0.79, W-120, 28, '#0a1020', 0.8);
    game.draw.rect(60, H*0.79, (W-120)*Math.min(1,goodRatio), 28, C.signal3, 0.85);
    game.draw.text('達成: '+Math.round(goodTime)+'秒 / '+NEEDED_GOOD+'秒', W/2, H*0.83, { size: 36, color: C.text });

    game.draw.text(Math.ceil(timeLeft)+'秒', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/totalTime);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*(1-ratio), 72, ratio > 0.3 ? C.signal3 : C.signal0);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
