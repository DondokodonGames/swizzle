// 596-pendulum-slice.js
// ペンデュラムスライス — 振り子の軌跡でターゲットを切り裂く精密ゲーム
// 操作: スワイプで振り子の初速を与え、スイング中にターゲットを通過させる
// 成功: 20カット  失敗: 10回空振り or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050208',
    rope:    '#665544',
    ropeHi:  '#998877',
    bob:     '#cc8822',
    bobHi:   '#ffcc66',
    target:  '#ff3366',
    targetHi:'#ff88aa',
    cut:     '#22c55e',
    cutHi:   '#86efac',
    trail:   '#cc882244',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#2a1a00'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.1;
  var ROPE_LEN = H * 0.45;

  var angle = 0; // pendulum angle from vertical (radians)
  var angleVel = 0;
  var GRAVITY = 9.8;
  var DAMPING = 0.998;
  var targets = [];
  var cuts = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.cut;
  var resultText = '';
  var resultTimer = 0;
  var trail = [];
  var swingActive = false;
  var lastBobX = 0, lastBobY = 0;
  var nextTarget = 1.5;

  function bobPos() {
    return {
      x: PIVOT_X + Math.sin(angle) * ROPE_LEN,
      y: PIVOT_Y + Math.cos(angle) * ROPE_LEN
    };
  }

  function spawnTarget() {
    // Place targets in the swing arc region
    var targetAngle = (Math.random() - 0.5) * 1.4; // ±0.7 rad
    var targetDist = ROPE_LEN * (0.7 + Math.random() * 0.35);
    var tx = PIVOT_X + Math.sin(targetAngle) * targetDist;
    var ty = PIVOT_Y + Math.cos(targetAngle) * targetDist;
    targets.push({
      x: tx, y: ty,
      r: 36,
      life: 4 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      cut: false
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Swipe adds angular velocity
    var dx = x2 - x1;
    if (dir === 'right') angleVel += 3.5;
    else if (dir === 'left') angleVel -= 3.5;
    swingActive = true;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap left/right to push
    if (tx < W / 2) angleVel -= 2;
    else angleVel += 2;
    game.audio.play('se_tap', 0.15);
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

    // Pendulum physics
    var angAccel = -(GRAVITY / (ROPE_LEN / 100)) * Math.sin(angle);
    angleVel += angAccel * dt;
    angleVel *= DAMPING;
    angle += angleVel * dt;

    // Clamp to avoid crazy spin
    if (angle > Math.PI * 0.8) { angle = Math.PI * 0.8; angleVel *= -0.4; }
    if (angle < -Math.PI * 0.8) { angle = -Math.PI * 0.8; angleVel *= -0.4; }

    var bob = bobPos();

    // Trail
    trail.push({ x: bob.x, y: bob.y, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 2.5;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Check cuts: does bob path cross target?
    for (var tgi = targets.length - 1; tgi >= 0; tgi--) {
      var t = targets[tgi];
      if (t.cut) {
        t.life -= dt * 3;
        if (t.life <= 0) targets.splice(tgi, 1);
        continue;
      }
      t.phase += dt * 2;
      t.life -= dt;
      if (t.life <= 0) {
        // Target expired = miss
        targets.splice(tgi, 1);
        misses++;
        flashCol = C.miss;
        flashAnim = 0.25;
        resultText = 'のがした!';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.2);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }

      // Check if bob crossed through target
      var dx = bob.x - t.x, dy = bob.y - t.y;
      if (dx * dx + dy * dy < (t.r + 28) * (t.r + 28) && Math.abs(angleVel) > 0.5) {
        t.cut = true;
        cuts++;
        flashCol = C.cut;
        flashAnim = 0.2;
        resultText = 'スパッ!';
        resultTimer = 0.5;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 8; pi++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: t.x, y: t.y, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.cutHi });
        }
        if (cuts >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(cuts * 350 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    // Spawn targets
    nextTarget -= dt;
    if (nextTarget <= 0 && !done) {
      if (targets.filter(function(t) { return !t.cut; }).length < 3) spawnTarget();
      nextTarget = 0.8 + Math.random() * 0.8;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 500 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    lastBobX = bob.x; lastBobY = bob.y;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var tgi2 = 0; tgi2 < targets.length; tgi2++) {
      var t2 = targets[tgi2];
      var pulse = 1 + Math.sin(t2.phase) * 0.1;
      if (t2.cut) {
        var cutAlpha = t2.life * 2;
        game.draw.circle(t2.x, t2.y, t2.r * 2, C.cutHi, cutAlpha * 0.3);
        // Split effect
        game.draw.circle(t2.x - 20 * (1 - t2.life / 0.3), t2.y, t2.r * 0.7, C.cut, cutAlpha * 0.6);
        game.draw.circle(t2.x + 20 * (1 - t2.life / 0.3), t2.y, t2.r * 0.7, C.cut, cutAlpha * 0.6);
        continue;
      }
      var lifeA = Math.min(1, t2.life / 1.5);
      game.draw.circle(t2.x, t2.y, t2.r * pulse + 12, C.target, lifeA * 0.15);
      game.draw.circle(t2.x, t2.y, t2.r * pulse, C.target, lifeA * 0.85);
      game.draw.circle(t2.x - 10, t2.y - 10, t2.r * 0.3, C.targetHi, 0.5);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var tp = trail[ti2];
      game.draw.circle(tp.x, tp.y, 12 * (tp.life / 0.4), C.trail.slice(0, 7), tp.life * 0.5);
    }

    // Rope
    var bob2 = bobPos();
    game.draw.line(PIVOT_X, PIVOT_Y, bob2.x, bob2.y, C.rope, 6);
    game.draw.line(PIVOT_X, PIVOT_Y, bob2.x, bob2.y, C.ropeHi, 2);

    // Pivot
    game.draw.circle(PIVOT_X, PIVOT_Y, 18, C.ropeHi, 0.8);

    // Bob
    game.draw.circle(bob2.x + 6, bob2.y + 6, 32, '#000', 0.3);
    game.draw.circle(bob2.x, bob2.y, 32, C.bob, 0.9);
    game.draw.circle(bob2.x - 10, bob2.y - 10, 12, C.bobHi, 0.5);

    // Speed indicator
    game.draw.text('速度: ' + Math.abs(angleVel).toFixed(1), W / 2, H * 0.88, { size: 36, color: C.ropeHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 60, color: flashCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 38 + mi * 76, H * 0.955, 16, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(cuts + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.bob : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    angle = 0.5; // start tilted
    angleVel = 0;
    spawnTarget();
  });
})(game);
