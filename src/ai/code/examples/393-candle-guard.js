// 393-candle-guard.js
// ろうそく守り — 吹く風からろうそくの炎を守る
// 操作: 炎が傾く方向と逆にスワイプして炎を立て直す
// 成功: 120秒守る  失敗: 炎が消える(90度倒れる)

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0608',
    night:  '#110d14',
    candle: '#e8d5b7',
    wax:    '#f5e6cb',
    flame:  '#fbbf24',
    flameHi:'#fef3c7',
    flameCore:'#fff',
    wind:   '#7dd3fc',
    danger: '#ef4444',
    glow:   '#f97316',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var flameAngle = 0;       // radians, 0=upright, +right = wind from left
  var flameVel = 0;
  var MAX_ANGLE = Math.PI/2 * 0.9;
  var windDir = 0;          // current wind direction (-1=left, +1=right)
  var windStrength = 0;     // 0-1
  var windTimer = 0;
  var windInterval = 3;
  var survived = 0;
  var NEEDED_TIME = 120;
  var done = false;
  var elapsed = 0;
  var particles = [];
  var flickerPhase = 0;
  var dangerFlash = 0;

  var CANDLE_X = W / 2;
  var CANDLE_BASE_Y = H * 0.72;
  var CANDLE_W = 80;
  var CANDLE_H = 220;

  function spawnGust() {
    windDir = Math.random() < 0.5 ? -1 : 1;
    windStrength = 0.3 + Math.random() * 0.7;
    windInterval = 2 + Math.random() * 3;
    windTimer = 0;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    // Counteract the tilt
    var pushForce = 2.5;
    if (dir === 'left')  flameVel -= pushForce;
    if (dir === 'right') flameVel += pushForce;
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived = elapsed;
      if (survived >= NEEDED_TIME) { done = true; game.audio.play('se_success', 0.7); game.end.success(Math.round(survived*100)); return; }
    }

    flickerPhase += dt * 8;
    if (dangerFlash > 0) dangerFlash -= dt * 3;

    // Wind cycle
    windTimer += dt;
    if (windTimer > windInterval) spawnGust();
    // Wind force fades in/out
    var windPhase = windTimer / windInterval;
    var activeWind = windStrength * Math.sin(windPhase * Math.PI);

    // Flame physics
    var windForce = windDir * activeWind * 4.0;
    var restoreForce = -flameAngle * 3.0;  // spring back to upright
    flameVel += (windForce + restoreForce) * dt;
    flameVel *= (1 - 3*dt);
    flameAngle += flameVel * dt;
    flameAngle = Math.max(-MAX_ANGLE*1.1, Math.min(MAX_ANGLE*1.1, flameAngle));

    if (Math.abs(flameAngle) >= MAX_ANGLE && !done) {
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function(){ game.end.failure(); }, 600);
    }

    if (Math.abs(flameAngle) > MAX_ANGLE * 0.65) dangerFlash = 0.3;

    // Flame particles
    if (Math.random() < 0.4 && !done) {
      var flameTipX = CANDLE_X + Math.sin(flameAngle) * 80;
      var flameTipY = CANDLE_BASE_Y - CANDLE_H - 80;
      particles.push({ x: flameTipX + (Math.random()-0.5)*20, y: flameTipY, vx: windDir*activeWind*30+(Math.random()-0.5)*30, vy: -40-Math.random()*60, life:0.5+Math.random()*0.3, col: C.glow });
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vx *= (1-2*dt);
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.night, 0.6);

    // Ambient glow from flame
    var glowAlpha = 0.08 + Math.sin(flickerPhase)*0.02;
    if (!done) game.draw.circle(CANDLE_X, CANDLE_BASE_Y - CANDLE_H - 60, 280, C.glow, glowAlpha);

    // Candle body
    game.draw.rect(CANDLE_X - CANDLE_W/2, CANDLE_BASE_Y - CANDLE_H, CANDLE_W, CANDLE_H, C.candle, 0.9);
    game.draw.rect(CANDLE_X - CANDLE_W/2 + 6, CANDLE_BASE_Y - CANDLE_H + 6, CANDLE_W/3, CANDLE_H - 12, C.wax, 0.5);
    game.draw.rect(CANDLE_X - CANDLE_W/2, CANDLE_BASE_Y, CANDLE_W + 40, 28, C.candle, 0.5); // base plate

    // Wick
    var wickTopX = CANDLE_X + Math.sin(flameAngle)*12;
    var wickTopY = CANDLE_BASE_Y - CANDLE_H - 20;
    game.draw.line(CANDLE_X, CANDLE_BASE_Y - CANDLE_H, wickTopX, wickTopY, '#555', 5);

    if (!done) {
      // Flame layers
      var flicker = Math.sin(flickerPhase*1.3)*4 + Math.sin(flickerPhase*2.7)*2;
      var fx = CANDLE_X + Math.sin(flameAngle)*80;
      var fy = CANDLE_BASE_Y - CANDLE_H - 80;
      game.draw.circle(fx, fy, 52+flicker, C.flame, 0.7);
      game.draw.circle(fx, fy - 18, 36+flicker*0.5, C.flame, 0.85);
      game.draw.circle(fx, fy - 32, 22+flicker*0.3, C.flameHi, 0.9);
      game.draw.circle(fx, fy - 36, 10, C.flameCore, 0.95);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10*p.life, p.col, p.life*0.7);
    }

    // Wind indicator
    if (activeWind > 0.15) {
      var wdir = windDir > 0 ? '→→→' : '←←←';
      var wAlpha = activeWind * 0.8;
      game.draw.text(wdir, W/2, H*0.84, { size: 52, color: C.wind, bold: true });
    }

    // Danger flash
    if (dangerFlash > 0) game.draw.rect(0, 0, W, H, C.danger, dangerFlash*0.12);

    // Angle indicator bar
    var angleRatio = flameAngle / MAX_ANGLE;
    var barW = 400, barH = 20;
    var barX = W/2 - barW/2;
    var barY = H*0.87;
    game.draw.rect(barX, barY, barW, barH, '#1a1025', 0.8);
    var midX = barX + barW/2;
    var fillW = Math.abs(angleRatio) * barW/2;
    game.draw.rect(angleRatio > 0 ? midX : midX - fillW, barY, fillW, barH,
      Math.abs(angleRatio) > 0.6 ? C.danger : C.flame, 0.85);
    game.draw.circle(midX, barY+10, 6, '#fff', 0.9);

    game.draw.text(Math.floor(NEEDED_TIME - survived) + '秒', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, (NEEDED_TIME - survived) / NEEDED_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*(1-ratio), 72, ratio > 0.3 ? C.flame : C.danger);
    game.draw.text(Math.ceil(NEEDED_TIME - survived)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnGust();
  });
})(game);
