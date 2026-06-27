// 663-juggle.js
// ジャグリング — 頂点に達した瞬間にタップして球を投げ続けろ
// 操作: タップで頂点の球を叩く
// 成功: 30回ジャグル  失敗: 5回落とす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020208',
    ball1:   '#f59e0b',
    ball2:   '#22c55e',
    ball3:   '#a78bfa',
    glow:    '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05050e'
  };

  var BALL_COLORS = [C.ball1, C.ball2, C.ball3];
  var BALL_R = 60;
  var GROUND_Y = H * 0.88;
  var GRAVITY = 1400;
  var LAUNCH_VY = -1200;

  var balls = [];
  var numBalls = 1;

  var juggles = 0;
  var NEEDED = 30;
  var drops = 0;
  var MAX_DROP = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  var APEX_ZONE = 80; // px from apex where tap is valid
  var tapCooldown = 0;

  function launchBall(idx, startX, delay) {
    setTimeout(function() {
      balls.push({
        idx: idx,
        x: startX || (W / 4 + idx * W / 4),
        y: GROUND_Y - BALL_R,
        vy: LAUNCH_VY - idx * 50,
        apexY: 0,
        atApex: false,
        tapped: false,
        dropping: false
      });
    }, delay || 0);
  }

  function juggleBall(ball) {
    ball.vy = LAUNCH_VY;
    ball.tapped = false;
    ball.atApex = false;
    ball.dropping = false;
    juggles++;
    game.audio.play('se_tap', 0.2);
    for (var p = 0; p < 5; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: ball.x, y: ball.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.35, col: BALL_COLORS[ball.idx % 3] });
    }
    if (juggles >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(juggles * 300 + Math.ceil(timeLeft) * 100); }, 700);
    }
    // Add a new ball every 10 juggles, up to 3 balls
    if (juggles === 10 && numBalls < 2) {
      numBalls = 2;
      launchBall(1, W * 0.65, 0);
    }
    if (juggles === 20 && numBalls < 3) {
      numBalls = 3;
      launchBall(2, W * 0.35, 0);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tapCooldown > 0) return;
    // Find ball near apex that was tapped
    var tapped = false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.dropping || b.tapped) continue;
      if (b.atApex) {
        var dx = tx - b.x, dy = ty - b.y;
        if (dx * dx + dy * dy < (BALL_R + 40) * (BALL_R + 40)) {
          juggleBall(b);
          b.tapped = true;
          tapped = true;
          tapCooldown = 0.1;
          flashCol = C.correct;
          flashAnim = 0.25;
          resultText = 'ナイス！';
          resultTimer = 0.4;
          break;
        }
      }
    }
    if (!tapped) {
      // Check if player tapped a ball not at apex (too early or too late)
      for (var j = 0; j < balls.length; j++) {
        var b2 = balls[j];
        if (b2.dropping || b2.tapped) continue;
        var dx2 = tx - b2.x, dy2 = ty - b2.y;
        if (dx2 * dx2 + dy2 * dy2 < (BALL_R + 40) * (BALL_R + 40)) {
          flashCol = C.wrong;
          flashAnim = 0.25;
          resultText = '早すぎ！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.2);
          tapCooldown = 0.15;
          break;
        }
      }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (tapCooldown > 0) tapCooldown -= dt;

    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      b.vy += GRAVITY * dt;
      b.y += b.vy * dt;

      // Detect apex (vy near 0, ball going up then down)
      b.atApex = Math.abs(b.vy) < 180 && !b.tapped && !b.dropping;

      // Fell to ground
      if (b.y >= GROUND_Y - BALL_R) {
        if (!b.tapped) {
          // Dropped ball!
          b.dropping = true;
          drops++;
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultText = '落とした！';
          resultTimer = 0.55;
          game.audio.play('se_failure', 0.4);
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: GROUND_Y - BALL_R, vx: Math.cos(pa) * 200, vy: -Math.abs(Math.sin(pa)) * 300, life: 0.5, col: BALL_COLORS[b.idx % 3] });
          }
          if (drops >= MAX_DROP && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            // Respawn ball after delay
            (function(bidx, bx) {
              setTimeout(function() {
                for (var k = 0; k < balls.length; k++) {
                  if (balls[k].idx === bidx) {
                    balls[k].y = GROUND_Y - BALL_R;
                    balls[k].vy = LAUNCH_VY;
                    balls[k].tapped = false;
                    balls[k].atApex = false;
                    balls[k].dropping = false;
                    break;
                  }
                }
              }, 600);
            })(b.idx, b.x);
          }
        } else {
          // Tapped ball landed, will be relaunched on next apex
        }
        b.y = GROUND_Y - BALL_R;
        if (!b.dropping) b.vy = LAUNCH_VY;
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

    // Stage light
    game.draw.rect(0, H * 0.85, W, H * 0.15, '#0a0a14', 0.8);
    game.draw.rect(0, GROUND_Y, W, 6, '#1e293b', 0.8);

    // Balls
    for (var bi = 0; bi < balls.length; bi++) {
      var ball = balls[bi];
      var col = BALL_COLORS[ball.idx % 3];
      var atApex = ball.atApex;
      var radius = atApex ? BALL_R + 10 : BALL_R;

      if (atApex) {
        game.draw.circle(ball.x, ball.y, radius + 30, col, 0.2);
        game.draw.text('TAP', ball.x, ball.y - radius - 36, { size: 36, color: '#fff', bold: true });
      }
      game.draw.circle(ball.x + 5, ball.y + 5, radius, '#000', 0.3);
      game.draw.circle(ball.x, ball.y, radius, col, 0.9);
      game.draw.circle(ball.x - radius * 0.35, ball.y - radius * 0.35, radius * 0.28, '#ffffff', 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.76, { size: 64, color: flashCol, bold: true });
    }

    // Drop indicators
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W / 2 - (MAX_DROP - 1) * 52 + di * 104, H * 0.955, 22, di < drops ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(juggles + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    launchBall(0, W / 2, 300);
  });
})(game);
