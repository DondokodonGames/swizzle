// 397-breath-control.js
// 呼吸制御 — 画面の円が大きくなる間タップ長押し、小さくなる間離す
// 操作: 円が膨らむ=押す、縮む=離す のリズムに合わせる
// 成功: 10回完璧に合わせる  失敗: 5回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c18',
    circle: '#3b82f6',
    circleHi:'#93c5fd',
    glow:   '#1d4ed8',
    correct:'#22c55e',
    wrong:  '#ef4444',
    neutral:'#475569',
    text:   '#f1f5f9',
    ui:     '#334155',
    pulse:  '#7dd3fc'
  };

  var CYCLE = 3.0;  // seconds per inhale/exhale cycle
  var phase = 0;    // 0-1 through the cycle
  var INHALE_END = 0.45; // 0-0.45 = inhale (expanding), 0.45-1 = exhale (contracting)

  var MIN_R = 120;
  var MAX_R = 320;

  var holding = false;
  var correct = 0;
  var NEEDED = 10;
  var wrong = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var lastCheck = 0;
  var CHECK_INTERVAL = 0.3;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    holding = true;
  });

  game.onSwipe(function(dir) {
    if (done) return;
    // Treat any touch end via swipe as release
    holding = false;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Since we can't detect touch-end without swipe, simulate hold release by checking
    // if user hasn't tapped again — use press state
    // Actually use phase-based scoring
    phase = (elapsed % CYCLE) / CYCLE;
    var isInhale = phase < INHALE_END;

    if (flashAnim > 0) flashAnim -= dt * 2.5;

    // Check accuracy periodically
    lastCheck += dt;
    if (lastCheck >= CHECK_INTERVAL && !done) {
      lastCheck = 0;
      var shouldHold = isInhale;
      if (shouldHold === holding) {
        correct++;
        flashAnim = 0.3;
        flashCol = C.correct;
        if (correct % 5 === 0) game.audio.play('se_success', 0.4);
        if (correct >= NEEDED * (1/CHECK_INTERVAL) * 0.5 && !done) {
          // Need sustained correct performance — ~25 checks for 10 "perfect" cycles
          done = true;
          setTimeout(function(){ game.end.success(correct*20+Math.ceil(timeLeft)*80); }, 600);
        }
      } else {
        wrong++;
        flashAnim = 0.4;
        flashCol = C.wrong;
        game.audio.play('se_failure', 0.2);
        if (wrong >= MAX_WRONG * (1/CHECK_INTERVAL) * 0.5 && !done) {
          done = true;
          setTimeout(function(){ game.end.failure(); }, 600);
        }
      }
    }

    // Particles on inhale peak
    if (Math.abs(phase - INHALE_END) < 0.02 && Math.random() < 0.3) {
      var ang = Math.random()*Math.PI*2;
      particles.push({ x:W/2+Math.cos(ang)*MAX_R, y:H*0.46+Math.sin(ang)*MAX_R, vx:Math.cos(ang)*60, vy:Math.sin(ang)*60, life:0.7, col:C.pulse });
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Compute circle radius
    var r;
    if (phase < INHALE_END) {
      r = MIN_R + (MAX_R - MIN_R) * (phase / INHALE_END);
    } else {
      r = MAX_R - (MAX_R - MIN_R) * ((phase - INHALE_END) / (1 - INHALE_END));
    }
    r = Math.round(r);

    var cx = W/2, cy = H*0.46;

    // Glow layers
    game.draw.circle(cx, cy, r+60, C.glow, 0.08);
    game.draw.circle(cx, cy, r+30, C.glow, 0.12);

    // Main breathing circle
    var alpha = holding ? 0.85 : 0.6;
    var col = isInhale ? (holding ? C.correct : C.circle) : (!holding ? C.correct : C.wrong);
    game.draw.circle(cx, cy, r, col, alpha);
    game.draw.circle(cx, cy, r*0.7, C.circleHi, 0.15);
    game.draw.circle(cx, cy, r*0.4, C.circleHi, 0.08);

    // Instruction text inside circle
    var instrText = isInhale ? '押す' : '離す';
    var instrCol = isInhale ? C.circleHi : '#fff';
    game.draw.text(instrText, cx, cy + 24, { size: 80, color: instrCol, bold: true });

    // Progress ring
    var ringAngle = phase * Math.PI * 2 - Math.PI/2;
    for (var ri = 0; ri < 60; ri++) {
      var ra = -Math.PI/2 + ri/60*Math.PI*2;
      if (ri/60 <= phase) {
        var rx = cx + Math.cos(ra)*(r+48);
        var ry = cy + Math.sin(ra)*(r+48);
        game.draw.circle(rx, ry, 6, isInhale ? C.correct : C.pulse, 0.7);
      }
    }

    // Flash
    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.7);
    }

    // Wrong dots
    var wrongDisplay = Math.floor(wrong / (1/CHECK_INTERVAL) * 0.5);
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2-(MAX_WRONG-1)*36+wi*72, H*0.935, 14, wi < wrongDisplay ? C.wrong : C.ui, 0.9);
    }

    var correctDisplay = Math.floor(correct / (1/CHECK_INTERVAL) * 0.5);
    game.draw.text(correctDisplay + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.circle : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
  });
})(game);
