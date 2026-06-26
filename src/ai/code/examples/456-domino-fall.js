// 456-domino-fall.js
// ドミノ倒し — ドミノを配置して完璧な連鎖を作る
// 操作: タップでドミノを置いて間隔を調整する
// 成功: 20枚全部倒す  失敗: 連鎖が止まる3回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0600',
    floor:  '#1a0a00',
    floorHi:'#2d1500',
    domino: '#94a3b8',
    dominoHi:'#e2e8f0',
    dotCol: '#0f172a',
    falling:'#f97316',
    fallingHi:'#fed7aa',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FLOOR_Y = H * 0.68;
  var DOMINO_W = 28;
  var DOMINO_H = 60;
  var FALL_RADIUS = 70;

  var dominos = [];
  var phase = 'place';  // place, falling, result
  var fallingIdx = 0;
  var fallProgress = 0;
  var particles = [];
  var chains = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;

  function resetDominos() {
    dominos = [];
    // Pre-place some dominos automatically
    var startX = 100;
    for (var i = 0; i < 20; i++) {
      var x = startX + i * (FALL_RADIUS * 0.85 + Math.random() * 15 - 7);
      dominos.push({ x: x, y: FLOOR_Y, angle: 0, fallen: false, falling: false });
    }
    phase = 'falling';
    fallingIdx = 0;
    fallProgress = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Only allow pushing the first domino manually
    if (phase === 'place' && dominos.length > 0) {
      phase = 'falling';
      dominos[0].falling = true;
      fallingIdx = 0;
      game.audio.play('se_tap', 0.5);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    if (phase === 'falling') {
      // Advance falling
      var anyFalling = false;
      for (var di = 0; di < dominos.length; di++) {
        var d = dominos[di];
        if (!d.falling) continue;
        anyFalling = true;
        d.angle += 200 * dt;  // degrees
        if (d.angle >= 90) {
          d.angle = 90;
          d.fallen = true;
          d.falling = false;
          game.audio.play('se_tap', 0.2);

          // Emit particles
          for (var pi = 0; pi < 4; pi++) {
            var ang = Math.random() * Math.PI - Math.PI * 0.8;
            particles.push({ x: d.x, y: FLOOR_Y - DOMINO_H, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100, life: 0.5, col: C.fallingHi });
          }

          // Knock over nearby dominos in the direction of fall
          for (var di2 = di + 1; di2 < dominos.length; di2++) {
            var d2 = dominos[di2];
            if (d2.fallen || d2.falling) continue;
            var tipX = d.x + Math.cos(0) * DOMINO_H;
            var dx = d2.x - d.x;
            if (dx > 0 && dx < FALL_RADIUS) {
              d2.falling = true;
              break;
            }
          }
        }
      }

      // Check if chain stopped
      if (!anyFalling && phase === 'falling') {
        var totalFallen = dominos.filter(function(d3) { return d3.fallen || d3.falling; }).length;
        var allFallen = dominos.every(function(d3) { return d3.fallen; });
        if (allFallen) {
          chains++;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          for (var pi2 = 0; pi2 < 16; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: W/2, y: FLOOR_Y - 30, vx: Math.cos(ang2)*180, vy: Math.sin(ang2)*180, life: 0.7, col: C.correct });
          }
          if (chains >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(chains * 1000 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          phase = 'result';
          setTimeout(function() { resetDominos(); }, 1200);
        } else {
          // Chain stopped before all fell
          phase = 'result';
          game.audio.play('se_failure', 0.4);
          setTimeout(function() { resetDominos(); }, 1000);
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor, 0.9);
    game.draw.rect(0, FLOOR_Y, W, 6, C.floorHi, 0.6);

    // Dominos
    for (var di3 = 0; di3 < dominos.length; di3++) {
      var d3 = dominos[di3];
      var dCol = d3.falling ? C.falling : (d3.fallen ? C.fallingHi : C.domino);
      var ang3 = d3.angle * Math.PI / 180;

      // Standing: draw upright rectangle
      // Fallen: draw horizontal
      var pivotX = d3.x;
      var pivotY = d3.y;

      // Upright pivot at bottom, falls right
      var topX = pivotX + Math.sin(ang3) * DOMINO_H;
      var topY = pivotY - Math.cos(ang3) * DOMINO_H;
      var rightX = pivotX + Math.sin(ang3) * DOMINO_H + Math.cos(ang3) * DOMINO_W/2;
      var rightY = pivotY - Math.cos(ang3) * DOMINO_H + Math.sin(ang3) * DOMINO_W/2;

      // Simple rectangle approximation
      var dx3 = topX - pivotX;
      var dy3 = topY - pivotY;
      game.draw.line(pivotX, pivotY, topX, topY, dCol, DOMINO_W);

      // Dots on domino face
      if (!d3.fallen) {
        var midX = (pivotX + topX) / 2;
        var midY = (pivotY + topY) / 2;
        game.draw.circle(midX, midY - 10, 5, C.dotCol, 0.8);
        game.draw.circle(midX, midY + 10, 5, C.dotCol, 0.8);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.1);

    // Push indicator
    if (phase === 'place') {
      game.draw.text('タップで倒す！', W/2, H * 0.85, { size: 48, color: C.falling, bold: true });
    }

    // Chain count and status
    var fallen3 = dominos.filter(function(d4) { return d4.fallen; }).length;
    game.draw.text(fallen3 + ' / ' + dominos.length + '枚', W/2, H * 0.87, { size: 40, color: C.text });

    game.draw.text(chains + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.falling : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    resetDominos();
  });
})(game);
