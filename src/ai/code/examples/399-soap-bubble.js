// 399-soap-bubble.js
// シャボン玉 — 吹いて大きくして完璧なサイズで飛ばす
// 操作: タップ長押しで膨らませ、ちょうどいいサイズで離す
// 成功: 8回完璧なサイズ  失敗: 5回弾ける or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030f1e',
    sky:    '#0c1a35',
    bubble: '#7dd3fc',
    bubbleHi:'#e0f2fe',
    bubblePop:'#bae6fd',
    zone:   '#22c55e',
    zoneHi: '#86efac',
    oversize:'#ef4444',
    rainbow0:'#ef4444',
    rainbow1:'#f97316',
    rainbow2:'#eab308',
    rainbow3:'#22c55e',
    rainbow4:'#3b82f6',
    rainbow5:'#a855f7',
    wand:   '#92400e',
    wandHi: '#b45309',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var RAINBOW = [C.rainbow0,C.rainbow1,C.rainbow2,C.rainbow3,C.rainbow4,C.rainbow5];

  var TARGET_MIN = 90;
  var TARGET_MAX = 140;
  var MAX_SIZE = 200;
  var GROW_RATE = 60;  // px per second

  var phase = 'idle';  // idle, growing, floating, popped
  var bubbleR = 30;
  var bubbleX = W/2;
  var bubbleY = H * 0.75;
  var bubbleVX = 0;
  var bubbleVY = -60;
  var holdTime = 0;
  var floatTimer = 0;
  var iridPhase = 0;

  var successes = 0;
  var NEEDED = 8;
  var pops = 0;
  var MAX_POPS = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];

  var WAND_X = W/2;
  var WAND_Y = H*0.82;

  function resetBubble() {
    phase = 'idle';
    bubbleR = 30;
    bubbleX = WAND_X;
    bubbleY = WAND_Y - 30;
    bubbleVX = (Math.random()-0.5)*30;
    bubbleVY = -60;
    holdTime = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'idle') {
      phase = 'growing';
      holdTime = 0;
      game.audio.play('se_tap', 0.2);
    } else if (phase === 'growing') {
      // Release — check size
      if (bubbleR >= TARGET_MIN && bubbleR <= TARGET_MAX) {
        phase = 'floating';
        floatTimer = 2.0;
        successes++;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x:bubbleX, y:bubbleY, vx:Math.cos(ang)*100, vy:Math.sin(ang)*100-50, life:0.8, col:RAINBOW[Math.floor(Math.random()*6)] });
        }
        if (successes >= NEEDED && !done) {
          done = true;
          setTimeout(function(){ game.end.success(successes*400+Math.ceil(timeLeft)*80); }, 800);
        }
      } else if (bubbleR > TARGET_MAX) {
        // Too big — pop
        popBubble();
      } else {
        // Too small — shrinks back
        phase = 'idle';
        game.audio.play('se_failure', 0.15);
        setTimeout(function(){ resetBubble(); }, 400);
      }
    }
  });

  function popBubble() {
    phase = 'popped';
    pops++;
    game.audio.play('se_failure', 0.4);
    for (var pi = 0; pi < 16; pi++) {
      var ang = Math.random()*Math.PI*2;
      particles.push({ x:bubbleX, y:bubbleY, vx:Math.cos(ang)*(100+Math.random()*200), vy:Math.sin(ang)*(100+Math.random()*200), life:0.5, col:C.bubblePop });
    }
    if (pops >= MAX_POPS && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); }
    setTimeout(function(){ if (!done) resetBubble(); }, 700);
  }

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    iridPhase += dt * 3;

    if (phase === 'growing') {
      holdTime += dt;
      bubbleR += GROW_RATE * dt;
      if (bubbleR >= MAX_SIZE) popBubble();
    }

    if (phase === 'floating') {
      bubbleX += bubbleVX * dt;
      bubbleY += bubbleVY * dt;
      bubbleVX += (Math.random()-0.5)*20*dt;
      bubbleVY -= 5*dt; // gradually rise
      floatTimer -= dt;
      if (floatTimer <= 0 || bubbleY < -bubbleR*2) { phase = 'idle'; resetBubble(); }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy -= 30*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.4);

    // Target size reference rings
    game.draw.circle(W*0.12, H*0.5, TARGET_MIN, C.zone, 0.08);
    game.draw.circle(W*0.12, H*0.5, TARGET_MAX, C.zone, 0.05);
    game.draw.circle(W*0.12, H*0.5, TARGET_MIN, C.zoneHi, 0.0);
    // Reference label
    game.draw.text('目安', W*0.12, H*0.56, { size: 32, color: C.zoneHi });
    game.draw.circle(W*0.12, H*0.5, (TARGET_MIN+TARGET_MAX)/2, C.zone, 0.0);

    // Draw reference circles at left edge as rings
    for (var ri = 0; ri < 36; ri++) {
      var ra = ri/36*Math.PI*2;
      game.draw.circle(W*0.12+Math.cos(ra)*TARGET_MIN, H*0.5+Math.sin(ra)*TARGET_MIN, 4, C.zone, 0.4);
      game.draw.circle(W*0.12+Math.cos(ra)*TARGET_MAX, H*0.5+Math.sin(ra)*TARGET_MAX, 4, C.zoneHi, 0.3);
    }

    // Wand
    game.draw.line(WAND_X-20, WAND_Y+80, WAND_X+40, WAND_Y-20, C.wand, 12);
    game.draw.line(WAND_X-20, WAND_Y+80, WAND_X+40, WAND_Y-20, C.wandHi, 4);
    game.draw.circle(WAND_X+40, WAND_Y-20, 24, C.wandHi, 0.9);

    // Bubble
    if (phase !== 'popped' && phase !== 'idle') {
      var isBig = bubbleR > TARGET_MAX;
      var isGood = bubbleR >= TARGET_MIN && bubbleR <= TARGET_MAX;
      var baseCol = isBig ? C.oversize : C.bubble;

      // Iridescent effect
      for (var ii = 0; ii < 6; ii++) {
        var ia = iridPhase + ii*Math.PI/3;
        var ir = bubbleR * 0.85;
        var irx = bubbleX + Math.cos(ia)*ir*0.3;
        var iry = bubbleY + Math.sin(ia)*ir*0.3;
        game.draw.circle(irx, iry, bubbleR*0.3, RAINBOW[ii], 0.08);
      }
      game.draw.circle(bubbleX, bubbleY, bubbleR+4, baseCol, 0.08);
      game.draw.circle(bubbleX, bubbleY, bubbleR, baseCol, 0.15);
      // Outline
      for (var oi = 0; oi < 48; oi++) {
        var oa = oi/48*Math.PI*2;
        game.draw.circle(bubbleX+Math.cos(oa)*bubbleR, bubbleY+Math.sin(oa)*bubbleR, 5, isGood ? C.zoneHi : baseCol, 0.6);
      }
      // Shine
      game.draw.circle(bubbleX-bubbleR*0.3, bubbleY-bubbleR*0.35, bubbleR*0.22, '#fff', 0.7);
      game.draw.circle(bubbleX-bubbleR*0.35, bubbleY-bubbleR*0.4, bubbleR*0.1, '#fff', 0.9);

      if (isGood) {
        game.draw.circle(bubbleX, bubbleY, bubbleR+18, C.zoneHi, 0.15+Math.sin(elapsed*6)*0.05);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.8);
    }

    // Instructions
    if (phase === 'idle') {
      game.draw.text('タップで膨らませる', W/2, H*0.89, { size: 40, color: C.ui });
    } else if (phase === 'growing') {
      var inZone = bubbleR >= TARGET_MIN && bubbleR <= TARGET_MAX;
      game.draw.text(inZone ? 'いまだ！離す！' : (bubbleR > TARGET_MAX ? '大きすぎ！' : 'もっと膨らませて'), W/2, H*0.89, { size: 40, color: inZone ? C.zoneHi : C.ui, bold: inZone });
    }

    // Pop dots
    for (var pi3 = 0; pi3 < MAX_POPS; pi3++) {
      game.draw.circle(W/2-(MAX_POPS-1)*34+pi3*68, H*0.935, 14, pi3 < pops ? C.oversize : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.bubble : C.oversize);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    resetBubble();
  });
})(game);
