// 550-spring-jump.js
// スプリングジャンプ — バネで跳ね上がるボールを連続プラットフォームに着地させる
// 操作: タップでバネを押す（タイミングで高さが変わる）
// 成功: 15プラットフォームクリア  失敗: 5回落下 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0818',
    bgGrad:  '#1a0828',
    spring:  '#f59e0b',
    springHi:'#fde68a',
    ball:    '#ff6b35',
    ballHi:  '#ffaa80',
    platform:'#2d5a8e',
    platHi:  '#4488cc',
    platSafe:'#22c55e',
    trail:   '#ff6b3544',
    hit:     '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    star:    '#f59e0b',
    particle:'#ff9944'
  };

  var SPRING_X = W / 2;
  var SPRING_Y = H * 0.88;
  var SPRING_BASE_H = 80;
  var SPRING_W = 160;
  var BALL_R = 36;
  var PLAT_W = 220;
  var PLAT_H = 28;

  var ball = { x: SPRING_X, y: SPRING_Y - SPRING_BASE_H - BALL_R, vy: 0, vx: 0, inAir: false };
  var springCompress = 0; // 0=normal, 1=fully compressed
  var pressing = false;
  var pressTime = 0;
  var platforms = [];
  var landed = 0;
  var NEEDED = 15;
  var falls = 0;
  var MAX_FALLS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var trail = [];
  var flashAnim = 0;
  var landAnim = 0;
  var currentPlatform = null;
  var nextPlatX = W / 2 + (Math.random() - 0.5) * 400;
  var nextPlatY = H * 0.5;
  var springPower = 0;

  function spawnNextPlatform() {
    nextPlatX = W * 0.15 + Math.random() * W * 0.7;
    nextPlatY = H * 0.3 + Math.random() * H * 0.35;
    platforms.push({ x: nextPlatX, y: nextPlatY, w: PLAT_W, landed: false });
    if (platforms.length > 4) platforms.shift();
  }

  // Initial platforms
  spawnNextPlatform();

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!ball.inAir && !pressing) {
      pressing = true;
      pressTime = 0;
    } else if (pressing) {
      // Release spring
      var power = Math.min(pressTime / 0.6, 1.0);
      springPower = power;
      var launchVY = -(1200 + power * 1400);
      var launchVX = (nextPlatX - SPRING_X) * 0.8;
      ball.vy = launchVY;
      ball.vx = Math.max(-400, Math.min(400, launchVX));
      ball.inAir = true;
      pressing = false;
      springCompress = 0;
      game.audio.play('se_tap', 0.6);
      // Particles on launch
      for (var pi = 0; pi < 8; pi++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        particles.push({ x: ball.x, y: ball.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.35, col: C.springHi });
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
    if (landAnim > 0) landAnim -= dt * 3;

    if (pressing) {
      pressTime += dt;
      springCompress = Math.min(pressTime / 0.6, 0.9);
    }

    if (ball.inAir) {
      ball.vy += 1600 * dt; // gravity
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vx *= Math.pow(0.98, dt * 60);

      // Wall bounce
      if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.7; }
      if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.7; }

      // Trail
      trail.push({ x: ball.x, y: ball.y, t: 0.25 });
      if (trail.length > 20) trail.shift();

      // Check platform landing
      for (var pi2 = 0; pi2 < platforms.length; pi2++) {
        var plat = platforms[pi2];
        if (plat.landed) continue;
        if (ball.vy > 0 &&
            ball.x > plat.x - plat.w / 2 - BALL_R &&
            ball.x < plat.x + plat.w / 2 + BALL_R &&
            ball.y + BALL_R >= plat.y &&
            ball.y + BALL_R <= plat.y + 40) {
          // Landed!
          ball.y = plat.y - BALL_R;
          ball.vy = 0;
          ball.vx = 0;
          ball.inAir = false;
          plat.landed = true;
          landed++;
          landAnim = 0.5;
          game.audio.play('se_success', 0.7);
          for (var pi3 = 0; pi3 < 10; pi3++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: ball.x, y: ball.y, vx: Math.cos(ang2) * 180, vy: Math.sin(ang2) * 180 - 100, life: 0.4, col: C.platSafe });
          }
          // Teleport ball back to spring for next jump
          setTimeout(function() {
            if (!done) {
              ball.x = SPRING_X;
              ball.y = SPRING_Y - SPRING_BASE_H - BALL_R;
              ball.vy = 0; ball.vx = 0; ball.inAir = false;
              spawnNextPlatform();
            }
          }, 600);
          if (landed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(landed * 400 + Math.ceil(timeLeft) * 100); }, 700);
          }
          break;
        }
      }

      // Fell off bottom
      if (ball.y > H + 60) {
        falls++;
        ball.x = SPRING_X;
        ball.y = SPRING_Y - SPRING_BASE_H - BALL_R;
        ball.vy = 0; ball.vx = 0; ball.inAir = false;
        trail = [];
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.5);
        if (falls >= MAX_FALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].t -= dt * 3;
      if (trail[ti].t <= 0) trail.splice(ti, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.bgGrad, 0.4);

    // Platforms
    for (var pi4 = 0; pi4 < platforms.length; pi4++) {
      var plat2 = platforms[pi4];
      var isTarget = pi4 === platforms.length - 1 && !plat2.landed;
      var col = plat2.landed ? C.platSafe : isTarget ? C.platHi : C.platform;
      var pulse = isTarget ? 1 + Math.sin(elapsed * 4) * 0.06 : 1;
      game.draw.rect(plat2.x - plat2.w / 2 * pulse, plat2.y - 4, plat2.w * pulse, 8, col, 0.2);
      game.draw.rect(plat2.x - plat2.w / 2 * pulse, plat2.y, plat2.w * pulse, PLAT_H, col, 0.9);
      if (isTarget) {
        game.draw.text('★', plat2.x, plat2.y - 48, { size: 44, color: C.star });
      }
    }

    // Spring
    var compH = SPRING_BASE_H * (1 - springCompress * 0.7);
    game.draw.rect(SPRING_X - SPRING_W / 2 + 8, SPRING_Y + 4, SPRING_W - 16, 16, C.spring, 0.9);
    for (var zi = 0; zi < 5; zi++) {
      var zy = SPRING_Y - compH + zi * compH / 5;
      var zx = SPRING_X + (zi % 2 === 0 ? 1 : -1) * 30;
      game.draw.line(SPRING_X, SPRING_Y - compH + (zi - 1) * compH / 5, zx, zy, C.spring, 8);
    }
    // Top of spring
    game.draw.rect(SPRING_X - SPRING_W / 2 * 0.6, SPRING_Y - compH - 8, SPRING_W * 0.6, 16, C.springHi, 0.9);

    // Power bar
    if (pressing) {
      var pwr = Math.min(pressTime / 0.6, 1);
      game.draw.rect(SPRING_X - 80, SPRING_Y + 40, 160, 20, C.ui, 0.4);
      game.draw.rect(SPRING_X - 80, SPRING_Y + 40, 160 * pwr, 20, pwr > 0.7 ? C.hit : C.spring, 0.9);
      game.draw.text('POWER', SPRING_X, SPRING_Y + 80, { size: 36, color: C.spring });
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var tp = trail[ti2];
      game.draw.circle(tp.x, tp.y, BALL_R * 0.5 * tp.t, C.trail, tp.t * 0.5);
    }

    // Ball
    game.draw.circle(ball.x, ball.y, BALL_R + 6, C.ball, 0.15);
    game.draw.circle(ball.x, ball.y, BALL_R, C.ball, 0.95);
    game.draw.circle(ball.x - 10, ball.y - 12, 12, C.ballHi, 0.5);

    // Land anim
    if (landAnim > 0) {
      game.draw.rect(0, 0, W, H, C.platSafe, landAnim * 0.1);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.12);

    if (!pressing && !ball.inAir) {
      game.draw.text('タップ長押し→離す', W / 2, SPRING_Y + 60, { size: 40, color: C.springHi });
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 52 + fi * 104, H * 0.955, 20, fi < falls ? C.hit : C.ui, 0.9);
    }

    game.draw.text(landed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.spring : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
