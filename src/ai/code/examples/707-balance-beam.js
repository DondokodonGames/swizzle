// 707-balance-beam.js
// バランスビーム — シーソーを傾けながら両側に落ちてくる玉を受け止めろ
// 操作: タップで左右どちらか重くする（タップ位置で決まる）
// 成功: 25個キャッチ  失敗: 10個落とす or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a10',
    beam:    '#0f766e',
    beamHi:  '#2dd4bf',
    pivot:   '#374151',
    ballL:   '#f59e0b',
    ballR:   '#8b5cf6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060c12'
  };

  var CX = W / 2;
  var PIVOT_Y = H * 0.65;
  var BEAM_LEN = 460;
  var BEAM_H = 24;
  var MAX_ANGLE = Math.PI / 5;

  var angle = 0;
  var angleVel = 0;
  var ANGLE_DAMPING = 1.8;
  var TILT_FORCE = 3.5;

  var balls = [];
  var BALL_R = 32;
  var spawnTimer = 0;
  var SPAWN_RATE = 1.3;

  var caught = 0;
  var NEEDED = 25;
  var dropped = 0;
  var MAX_DROP = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBall() {
    var side = Math.random() > 0.5 ? 'L' : 'R';
    var col = side === 'L' ? C.ballL : C.ballR;
    var x = side === 'L'
      ? CX - BEAM_LEN / 2 + Math.random() * BEAM_LEN * 0.3
      : CX + BEAM_LEN * 0.2 + Math.random() * BEAM_LEN * 0.3;
    balls.push({
      x: x,
      y: H * 0.2,
      vy: 200 + Math.random() * 120,
      r: BALL_R,
      col: col,
      side: side,
      onBeam: false
    });
  }

  function getBeamY(x) {
    var dx = x - CX;
    return PIVOT_Y + Math.sin(angle) * dx;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      // Tilt left (left side goes down)
      angleVel -= TILT_FORCE;
    } else {
      // Tilt right (right side goes down)
      angleVel += TILT_FORCE;
    }
    game.audio.play('se_tap', 0.07);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Beam physics
    angleVel -= angle * 4; // spring toward level
    angleVel -= angleVel * ANGLE_DAMPING * dt;
    angle += angleVel * dt;
    if (angle > MAX_ANGLE) { angle = MAX_ANGLE; angleVel *= -0.3; }
    if (angle < -MAX_ANGLE) { angle = -MAX_ANGLE; angleVel *= -0.3; }

    // Spawn balls
    spawnTimer += dt;
    var rate = Math.max(0.7, SPAWN_RATE - elapsed * 0.01);
    if (spawnTimer >= rate) { spawnTimer = 0; spawnBall(); }

    // Update balls
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      var beamY = getBeamY(b.x);

      if (!b.onBeam) {
        b.vy += 700 * dt;
        b.y += b.vy * dt;

        // Land on beam
        if (b.y + b.r >= beamY && b.vy > 0) {
          if (b.x > CX - BEAM_LEN / 2 && b.x < CX + BEAM_LEN / 2) {
            b.y = beamY - b.r;
            b.vy = 0;
            b.onBeam = true;
            caught++;
            game.audio.play('se_tap', 0.12);
            for (var p = 0; p < 4; p++) {
              var pa = Math.random() * Math.PI * 2;
              particles.push({ x: b.x, y: beamY, vx: Math.cos(pa) * 130, vy: Math.sin(pa) * 130, life: 0.35, col: b.col });
            }
            if (caught >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 80); }, 700);
            }
          } else {
            // Fell off edge
            b.onBeam = false;
          }
        }

        // Off screen
        if (b.y > H + 50) {
          dropped++;
          game.audio.play('se_failure', 0.2);
          balls.splice(i, 1);
          if (dropped >= MAX_DROP && !done) {
            done = true;
            flashCol = C.wrong;
            flashAnim = 0.5;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
      } else {
        // Ball rests on beam; slide with tilt
        b.y = getBeamY(b.x) - b.r;
        // Slide due to angle
        var slideAcc = Math.sin(angle) * 800;
        b.x += slideAcc * dt;

        // Roll off edge
        if (b.x < CX - BEAM_LEN / 2 - b.r || b.x > CX + BEAM_LEN / 2 + b.r) {
          b.onBeam = false;
          b.vy = 100;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Pivot
    game.draw.rect(CX - 16, PIVOT_Y, 32, 80, C.pivot, 0.9);
    game.draw.circle(CX, PIVOT_Y, 20, C.pivot, 0.9);

    // Beam
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    var bx1 = CX - BEAM_LEN / 2;
    var by1 = PIVOT_Y - sin * BEAM_LEN / 2;
    var bx2 = CX + BEAM_LEN / 2;
    var by2 = PIVOT_Y + sin * BEAM_LEN / 2;
    game.draw.line(bx1 + 3, by1 + 3, bx2 + 3, by2 + 3, '#000', BEAM_H);
    game.draw.line(bx1, by1, bx2, by2, C.beam, BEAM_H);
    game.draw.line(bx1, by1 - BEAM_H * 0.4, bx2, by2 - BEAM_H * 0.4, C.beamHi, 6);

    // Balls
    for (var bi = 0; bi < balls.length; bi++) {
      var b2 = balls[bi];
      game.draw.circle(b2.x + 3, b2.y + 3, b2.r, '#000', 0.3);
      game.draw.circle(b2.x, b2.y, b2.r, b2.col, 0.9);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.25, '#fff', 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 60, color: flashCol, bold: true });
    }

    // Tap hints
    game.draw.text('← 左', W * 0.2, H * 0.93, { size: 38, color: C.ballL + '88' });
    game.draw.text('右 →', W * 0.8, H * 0.93, { size: 38, color: C.ballR + '88' });

    // Drop counter
    game.draw.text('落: ' + dropped + '/' + MAX_DROP, W * 0.18, 148, { size: 38, color: C.wrong });
    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBall();
  });
})(game);
