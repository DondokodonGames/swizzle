// 768-freeze-moment.js
// フリーズモーメント — すべての的が重なる瞬間にタップせよ。完璧な一致を狙え
// 操作: タップ — 3つの円がすべて重なった瞬間
// 成功: 25回成功  失敗: 10回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030708',
    c1:      '#ef4444',
    c2:      '#3b82f6',
    c3:      '#22c55e',
    center:  '#ffffff',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#07080e',
    target:  '#fbbf24'
  };

  var CX = W / 2;
  var CY = H * 0.44;
  var ORBIT_R = 200;
  var CIRCLE_R = 70;

  // 3 circles orbit around center at different speeds and phases
  var circles = [
    { angle: 0, speed: 0.8, color: C.c1, orbitR: ORBIT_R },
    { angle: Math.PI * 2 / 3, speed: -1.1, color: C.c2, orbitR: ORBIT_R * 0.85 },
    { angle: Math.PI * 4 / 3, speed: 1.4, color: C.c3, orbitR: ORBIT_R * 0.7 }
  ];
  var TOL = 70; // distance from center where all 3 must be within
  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.45;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function getPos(c) {
    return { x: CX + Math.cos(c.angle) * c.orbitR, y: CY + Math.sin(c.angle) * c.orbitR };
  }

  function allAligned() {
    // All circles close to CX, CY (within TOL)
    for (var i = 0; i < circles.length; i++) {
      var p = getPos(circles[i]);
      var dx = p.x - CX;
      var dy = p.y - CY;
      if (Math.sqrt(dx * dx + dy * dy) > TOL) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;
    answered = true;
    var aligned = allAligned();
    if (aligned) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = '完璧！';
      resultTimer = 0.42;
      game.audio.play('se_success', 0.7);
      for (var p = 0; p < 10; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(pa) * (80 + Math.random() * 180), vy: Math.sin(pa) * (80 + Math.random() * 180), life: 0.45, col: [C.c1, C.c2, C.c3][p % 3] });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'まだズレてる！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) {
        answered = false;
        // Speed up slightly
        for (var ci = 0; ci < circles.length; ci++) {
          circles[ci].speed *= (1 + score * 0.005);
          circles[ci].speed = Math.min(Math.abs(circles[ci].speed), 3.5) * (circles[ci].speed > 0 ? 1 : -1);
        }
      }
    }

    // Update circle angles
    for (var ci2 = 0; ci2 < circles.length; ci2++) {
      circles[ci2].angle += circles[ci2].speed * dt;
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.4;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var aligned = allAligned();

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbit paths (faint)
    var psteps = 48;
    for (var ci3 = 0; ci3 < circles.length; ci3++) {
      for (var pi2 = 0; pi2 < psteps; pi2++) {
        if (pi2 % 4 === 3) continue;
        var pa2 = pi2 * Math.PI * 2 / psteps;
        game.draw.circle(CX + Math.cos(pa2) * circles[ci3].orbitR, CY + Math.sin(pa2) * circles[ci3].orbitR, 2, circles[ci3].color, 0.15);
      }
    }

    // Target zone at center
    var zonePulse = aligned ? (0.7 + 0.3 * Math.sin(elapsed * 12)) : 0.3;
    game.draw.circle(CX, CY, TOL, C.target, aligned ? zonePulse * 0.2 : 0.08);
    for (var ti = 0; ti < 20; ti++) {
      if (ti % 3 === 2) continue;
      var ta = ti * Math.PI * 2 / 20;
      game.draw.circle(CX + Math.cos(ta) * TOL, CY + Math.sin(ta) * TOL, 5, C.target, aligned ? 0.9 : 0.35);
    }

    // Center dot
    game.draw.circle(CX, CY, 12, C.center, 0.5);

    // Circles
    for (var ci4 = 0; ci4 < circles.length; ci4++) {
      var pos = getPos(circles[ci4]);
      var dx = pos.x - CX;
      var dy = pos.y - CY;
      var distFromCenter = Math.sqrt(dx * dx + dy * dy);
      var nearCenter = distFromCenter < TOL;
      var glow = nearCenter ? 0.3 : 0;
      if (glow > 0) {
        game.draw.circle(pos.x, pos.y, CIRCLE_R + 20, circles[ci4].color, glow);
      }
      game.draw.circle(pos.x + 4, pos.y + 4, CIRCLE_R, '#000', 0.25);
      game.draw.circle(pos.x, pos.y, CIRCLE_R, circles[ci4].color, aligned ? 0.95 : 0.75);
      game.draw.circle(pos.x - CIRCLE_R * 0.3, pos.y - CIRCLE_R * 0.3, CIRCLE_R * 0.22, '#fff', 0.35);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (aligned && !answered) {
      game.draw.text('今！タップ！', W / 2, H * 0.78, { size: 72, color: C.target, bold: true });
    } else if (!answered) {
      game.draw.text('3つが重なる瞬間に', W / 2, H * 0.78, { size: 38, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
