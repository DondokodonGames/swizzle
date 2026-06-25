// 140-domino-fall.js
// ドミノ倒し — 最初の1枚を倒す瞬間の連鎖の興奮を体験する
// 操作: タップで先頭のドミノを押す
// 成功: 全ドミノ倒す  失敗: チェーン途切れ or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0810',
    domino:  '#4f46e5',
    dominoHi:'#818cf8',
    fallen:  '#1e1b4b',
    fallenHi:'#312e81',
    dot:     '#e0e7ff',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155',
    ground:  '#1e1b4b'
  };

  var DOMINO_W = 24;
  var DOMINO_H = 72;
  var COUNT = 18;
  var SPACING = 64;
  var START_X = W * 0.08;
  var GROUND_Y = H * 0.72;

  // Build dominos
  var dominos = [];
  for (var i = 0; i < COUNT; i++) {
    dominos.push({
      x: START_X + i * SPACING,
      y: GROUND_Y - DOMINO_H,
      angle: 0,         // 0 = standing, positive = falling right
      falling: false,
      fallen: false
    });
  }

  var started = false;
  var fallIndex = 0;
  var FALL_SPEED = 3.5; // rad/s
  var FALL_ANGLE = Math.PI / 2;
  var chainBroken = false;
  var allFallen = false;
  var timeLeft = 20;
  var done = false;
  var particles = [];
  var chainPause = 0; // brief pause at each domino hit

  game.onTap(function() {
    if (done || started) return;
    started = true;
    dominos[0].falling = true;
    game.audio.play('se_tap', 0.8);
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

    if (chainPause > 0) {
      chainPause -= dt;
    }

    // Animate falling dominos
    for (var i = 0; i < dominos.length; i++) {
      var d = dominos[i];
      if (!d.falling || d.fallen) continue;
      d.angle += FALL_SPEED * dt;
      if (d.angle >= FALL_ANGLE) {
        d.angle = FALL_ANGLE;
        d.fallen = true;
        d.falling = false;
        // Trigger next domino
        if (i + 1 < dominos.length) {
          dominos[i + 1].falling = true;
          game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 5; pi++) {
            var ang = -Math.PI/2 + (Math.random()-0.5)*1.2;
            particles.push({ x: dominos[i+1].x, y: GROUND_Y - DOMINO_H/2, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life: 0.4 });
          }
        } else {
          // Last domino fell
          allFallen = true;
          if (!done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(Math.ceil(timeLeft)*60); }, 400);
          }
        }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, GROUND_Y, W, 8, C.ground);

    // Dominos
    for (var i2 = 0; i2 < dominos.length; i2++) {
      var d2 = dominos[i2];
      var pivX = d2.x + DOMINO_W / 2;
      var pivY = GROUND_Y;
      var a = d2.angle;
      // Draw rotated domino using transform approximation (draw as parallelogram)
      var cos = Math.cos(a), sin2 = Math.sin(a);
      // Four corners relative to pivot (bottom-center)
      var cx0 = -DOMINO_W/2, cy0 = -DOMINO_H;
      var cx1 = DOMINO_W/2,  cy1 = -DOMINO_H;
      var cx2 = DOMINO_W/2,  cy2 = 0;
      var cx3 = -DOMINO_W/2, cy3 = 0;
      // Rotated corners
      var rx0 = cx0*cos - cy0*sin2 + pivX, ry0 = cx0*sin2 + cy0*cos + pivY;
      var rx1 = cx1*cos - cy1*sin2 + pivX, ry1 = cx1*sin2 + cy1*cos + pivY;
      var rx2 = cx2*cos - cy2*sin2 + pivX, ry2 = cx2*sin2 + cy2*cos + pivY;
      var rx3 = cx3*cos - cy3*sin2 + pivX, ry3 = cx3*sin2 + cy3*cos + pivY;
      // Draw as 2 triangles (using lines to approximate fill)
      var col = d2.fallen ? C.fallen : (i2 === 0 && !started ? C.dominoHi : C.domino);
      var hiCol = d2.fallen ? C.fallenHi : C.dominoHi;
      // Simple rect at angle (approximate with line thickness)
      var midTopX = (rx0+rx1)/2, midTopY = (ry0+ry1)/2;
      var midBotX = (rx2+rx3)/2, midBotY = (ry2+ry3)/2;
      game.draw.line(midBotX, midBotY, midTopX, midTopY, col, DOMINO_W);
      game.draw.line(midBotX, midBotY, midTopX, midTopY, hiCol, 4);
      // Dot
      if (!d2.fallen) {
        var dotX = (rx0+rx1)/2 * 0.5 + (rx2+rx3)/2 * 0.5;
        var dotY = (ry0+ry1)/2 * 0.5 + (ry2+ry3)/2 * 0.5;
        game.draw.circle(dotX, dotY, 5, C.dot, 0.8);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*2.5, C.dominoHi, part.life);
    }

    // Arrow prompt
    if (!started) {
      var pulse = 0.5 + 0.4 * Math.abs(Math.sin(timeLeft * 3));
      game.draw.text('▶ タップで倒す', dominos[0].x + 40, GROUND_Y - DOMINO_H - 40, { size: 44, color: C.dominoHi, bold: true });
      game.draw.circle(dominos[0].x + DOMINO_W/2, GROUND_Y - DOMINO_H/2, 36, C.dominoHi, pulse * 0.4);
    }

    // Fallen count
    var fallenCount = dominos.filter(function(d) { return d.fallen; }).length;
    game.draw.text(fallenCount + ' / ' + COUNT, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft/20);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.domino : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
