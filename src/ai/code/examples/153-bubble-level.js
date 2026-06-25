// 153-bubble-level.js
// バブル水準器 — 気泡が中心に来るようにスマホの傾きをシミュレートする精密ゲーム
// 操作: タップで気泡を押し出す方向を指定
// 成功: 気泡を中央ゾーンに5秒間保持  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020c10',
    tube:    '#0e2435',
    tubeHi:  '#164e63',
    bubble:  '#67e8f9',
    bubbleHi:'#e0f2fe',
    center:  '#22c55e',
    centerHi:'#86efac',
    danger:  '#ef4444',
    ui:      '#334155'
  };

  var TUBE_R = 260; // radius of circular tube area
  var TUBE_X = W / 2;
  var TUBE_Y = H * 0.48;
  var BUBBLE_R = 40;
  var CENTER_R = 80; // success zone radius
  var SAFE_R = 60; // zone to be "in"

  var bx = TUBE_X + (Math.random()-0.5)*200;
  var by = TUBE_Y + (Math.random()-0.5)*200;
  var bvx = 0, bvy = 0;
  var FRICTION = 0.88;
  var GRAVITY = 200; // simulated gravity per tap direction

  var holdTime = 0; // time held in center
  var NEEDED_HOLD = 5.0;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var pulseT = 0;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // Apply force opposite to tap direction from center
    var dx = tx - TUBE_X, dy = ty - TUBE_Y;
    var len = Math.sqrt(dx*dx+dy*dy);
    if (len < 10) return;
    // Bubble floats away from tap (tap the direction you want it to go TO)
    bvx += (dx/len) * GRAVITY * 0.8;
    bvy += (dy/len) * GRAVITY * 0.8;
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    var force = GRAVITY;
    if (dir === 'up') bvy -= force;
    else if (dir === 'down') bvy += force;
    else if (dir === 'left') bvx -= force;
    else if (dir === 'right') bvx += force;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    pulseT += dt;

    // Apply friction
    bvx *= Math.pow(FRICTION, dt * 60);
    bvy *= Math.pow(FRICTION, dt * 60);

    // Move bubble
    bx += bvx * dt;
    by += bvy * dt;

    // Confine to tube circle
    var dx2 = bx - TUBE_X, dy2 = by - TUBE_Y;
    var dist = Math.sqrt(dx2*dx2+dy2*dy2);
    var maxDist = TUBE_R - BUBBLE_R;
    if (dist > maxDist) {
      // Bounce off inner wall
      var nx = dx2/dist, ny = dy2/dist;
      bx = TUBE_X + nx * maxDist;
      by = TUBE_Y + ny * maxDist;
      // Reflect velocity
      var dot = bvx*nx + bvy*ny;
      bvx -= 2*dot*nx;
      bvy -= 2*dot*ny;
      bvx *= 0.5; bvy *= 0.5;
      game.audio.play('se_tap', 0.15);
    }

    // Check if in center zone
    var distCenter = Math.sqrt((bx-TUBE_X)*(bx-TUBE_X)+(by-TUBE_Y)*(by-TUBE_Y));
    if (distCenter < SAFE_R) {
      holdTime += dt;
      if (holdTime >= NEEDED_HOLD && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft)*60+500); }, 400);
      }
    } else {
      holdTime = Math.max(0, holdTime - dt * 0.5);
    }

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx*dt; particles[pi].y += particles[pi].vy*dt;
      particles[pi].vy += 300*dt; particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tube outer ring
    game.draw.circle(TUBE_X, TUBE_Y, TUBE_R+20, C.tubeHi, 0.12);
    game.draw.circle(TUBE_X, TUBE_Y, TUBE_R+10, C.tube, 0.8);
    game.draw.circle(TUBE_X, TUBE_Y, TUBE_R, C.bg, 0.9);

    // Tube markings
    for (var ang = 0; ang < Math.PI*2; ang += Math.PI/8) {
      var mx = TUBE_X + Math.cos(ang)*(TUBE_R-20);
      var my = TUBE_Y + Math.sin(ang)*(TUBE_R-20);
      game.draw.circle(mx, my, 4, C.tubeHi, 0.5);
    }

    // Center zone
    var inCenter = Math.sqrt((bx-TUBE_X)*(bx-TUBE_X)+(by-TUBE_Y)*(by-TUBE_Y)) < SAFE_R;
    var centerPulse = 0.4 + 0.3*Math.abs(Math.sin(pulseT*2));
    game.draw.circle(TUBE_X, TUBE_Y, CENTER_R, inCenter ? C.center : C.centerHi, centerPulse*0.25);
    game.draw.circle(TUBE_X, TUBE_Y, SAFE_R, inCenter ? C.center : C.centerHi, 0.15);
    // Center crosshair
    game.draw.line(TUBE_X-CENTER_R, TUBE_Y, TUBE_X+CENTER_R, TUBE_Y, inCenter ? C.center : C.centerHi, 3);
    game.draw.line(TUBE_X, TUBE_Y-CENTER_R, TUBE_X, TUBE_Y+CENTER_R, inCenter ? C.center : C.centerHi, 3);

    // Bubble shadow
    game.draw.circle(bx+8, by+8, BUBBLE_R, '#000', 0.3);
    // Bubble
    var bubbleDist = Math.sqrt((bx-TUBE_X)*(bx-TUBE_X)+(by-TUBE_Y)*(by-TUBE_Y));
    var bubbleAlpha = 0.85 - (bubbleDist/TUBE_R)*0.2;
    game.draw.circle(bx, by, BUBBLE_R+8, C.bubbleHi, 0.2);
    game.draw.circle(bx, by, BUBBLE_R, C.bubble, bubbleAlpha);
    // Highlight
    game.draw.circle(bx-BUBBLE_R*0.3, by-BUBBLE_R*0.35, BUBBLE_R*0.3, '#fff', 0.6);
    game.draw.circle(bx-BUBBLE_R*0.1, by-BUBBLE_R*0.15, BUBBLE_R*0.15, '#fff', 0.4);

    // Hold progress arc
    if (holdTime > 0) {
      var holdRatio = holdTime / NEEDED_HOLD;
      var steps = Math.floor(holdRatio * 60);
      for (var s = 0; s < steps; s++) {
        var a = -Math.PI/2 + (s/60)*Math.PI*2;
        game.draw.circle(
          TUBE_X + Math.cos(a)*90,
          TUBE_Y + Math.sin(a)*90,
          6, C.center, 0.9
        );
      }
      game.draw.text(holdTime.toFixed(1) + 's', TUBE_X, TUBE_Y+130, { size: 52, color: C.center, bold: true });
    }

    // Instruction arrows
    game.draw.text('↑', W/2, H*0.86, { size: 48, color: C.ui });
    game.draw.text('↓', W/2, H*0.94, { size: 48, color: C.ui });
    game.draw.text('←', W*0.1, H*0.9, { size: 48, color: C.ui });
    game.draw.text('→', W*0.9, H*0.9, { size: 48, color: C.ui });
    game.draw.text('タップで気泡を動かす', W/2, H*0.9, { size: 36, color: C.ui });

    // Needed hold
    game.draw.text('中央に ' + NEEDED_HOLD + '秒', W/2, 148, { size: 56, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft/45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.tubeHi : C.danger);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); });
})(game);
