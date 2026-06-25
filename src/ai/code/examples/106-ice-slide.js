// 106-ice-slide.js
// 氷滑り — 摩擦のない氷上でパックを壁に当てて的に当て続けるカーリング感覚
// 操作: スワイプで方向と強さを決めてパックを投げる
// 成功: 8回的に命中  失敗: 10発撃ち尽くす or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040c18',
    ice:     '#0a1f36',
    iceHi:   '#103050',
    puck:    '#94a3b8',
    puckHi:  '#e2e8f0',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    correct: '#22c55e',
    trail:   '#3b82f6',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    ui:      '#475569'
  };

  var PLAY_X = 60, PLAY_Y = H * 0.18;
  var PLAY_W = W - 120, PLAY_H = H * 0.56;
  var PUCK_R = 28;
  var FRICTION = 0.996; // very low friction = icy

  var puck = null; // { x, y, vx, vy }
  var target = { x: 0, y: 0, r: 52, hits: 0 };
  var ammo = 10;
  var score = 0;
  var needed = 8;
  var timeLeft = 35;
  var done = false;
  var trail = [];
  var feedback = 0;
  var feedbackOk = false;
  var spawnTimer = 0;

  var aiming = false;
  var aimStartX = 0, aimStartY = 0;
  var swipeDir = null;

  function placeTarget() {
    target.x = PLAY_X + 80 + Math.random() * (PLAY_W - 160);
    target.y = PLAY_Y + 80 + Math.random() * (PLAY_H - 160);
    target.r = 52;
  }

  function resetPuck() {
    puck = null;
  }

  game.onSwipe(function(dir) {
    if (done || puck || ammo <= 0) return;
    // Launch puck from bottom center with direction from swipe
    var dirs = {
      up:    [0, -1],
      down:  [0, 1],
      left:  [-1, 0],
      right: [1, 0]
    };
    var dv = dirs[dir];
    if (!dv) return;
    var speed = 500 + score * 20;
    // Only allow launching upward directions
    if (dir === 'down') return;

    // Puck starts at bottom center
    puck = {
      x: PLAY_X + PLAY_W / 2,
      y: PLAY_Y + PLAY_H - 60,
      vx: dv[0] * speed,
      vy: dv[1] * speed
    };
    trail = [];
    ammo--;
    game.audio.play('se_tap', 0.7);
  });

  game.onTap(function(tx, ty) {
    // Alternative: tap to aim direction from launch point
    if (done || puck || ammo <= 0) return;
    var launchX = PLAY_X + PLAY_W / 2;
    var launchY = PLAY_Y + PLAY_H - 60;
    var dx = tx - launchX, dy = ty - launchY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;
    var speed = 400 + score * 20;
    puck = { x: launchX, y: launchY, vx: (dx / dist) * speed, vy: (dy / dist) * speed };
    trail = [];
    ammo--;
    game.audio.play('se_tap', 0.7);
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

    if (puck) {
      puck.x += puck.vx * dt;
      puck.y += puck.vy * dt;

      // Friction
      puck.vx *= Math.pow(FRICTION, dt * 60);
      puck.vy *= Math.pow(FRICTION, dt * 60);

      // Wall bounces
      if (puck.x - PUCK_R < PLAY_X) {
        puck.x = PLAY_X + PUCK_R;
        puck.vx = Math.abs(puck.vx);
        game.audio.play('se_tap', 0.3);
      }
      if (puck.x + PUCK_R > PLAY_X + PLAY_W) {
        puck.x = PLAY_X + PLAY_W - PUCK_R;
        puck.vx = -Math.abs(puck.vx);
        game.audio.play('se_tap', 0.3);
      }
      if (puck.y - PUCK_R < PLAY_Y) {
        puck.y = PLAY_Y + PUCK_R;
        puck.vy = Math.abs(puck.vy);
        game.audio.play('se_tap', 0.3);
      }
      if (puck.y + PUCK_R > PLAY_Y + PLAY_H) {
        puck.y = PLAY_Y + PLAY_H - PUCK_R;
        puck.vy = -Math.abs(puck.vy);
        game.audio.play('se_tap', 0.3);
      }

      // Target hit
      var tdx = puck.x - target.x, tdy = puck.y - target.y;
      if (Math.sqrt(tdx * tdx + tdy * tdy) < PUCK_R + target.r) {
        score++;
        feedbackOk = true;
        feedback = 0.5;
        game.audio.play('se_success');
        puck = null;
        placeTarget();
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 50 + Math.ceil(timeLeft) * 10 + ammo * 15); }, 500);
          return;
        }
      }

      // Trail
      trail.push({ x: puck.x, y: puck.y, age: 0 });
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
      trail = trail.filter(function(t) { return t.age < 0.6; });

      // Stop if too slow
      var spd = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
      if (spd < 20) {
        feedbackOk = false;
        feedback = 0.3;
        puck = null;
        trail = [];
        if (ammo <= 0 && score < needed && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice surface
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H, C.ice);
    // Ice shimmer lines
    for (var ix = PLAY_X + 20; ix < PLAY_X + PLAY_W; ix += 60) {
      var ia = 0.05 + 0.05 * Math.abs(Math.sin(game.time.elapsed * 0.5 + ix));
      game.draw.line(ix, PLAY_Y, ix, PLAY_Y + PLAY_H, '#fff', 1);
    }

    // Walls
    game.draw.rect(PLAY_X - 16, PLAY_Y - 16, PLAY_W + 32, 16, C.wall);
    game.draw.rect(PLAY_X - 16, PLAY_Y + PLAY_H, PLAY_W + 32, 16, C.wall);
    game.draw.rect(PLAY_X - 16, PLAY_Y, 16, PLAY_H, C.wall);
    game.draw.rect(PLAY_X + PLAY_W, PLAY_Y, 16, PLAY_H, C.wall);
    // Wall highlights
    game.draw.rect(PLAY_X - 16, PLAY_Y - 16, PLAY_W + 32, 4, C.wallHi);

    // Target
    var tPulse = 0.5 + 0.3 * Math.abs(Math.sin(game.time.elapsed * 2));
    game.draw.circle(target.x, target.y, target.r + 12, C.targetHi, tPulse * 0.3);
    game.draw.circle(target.x, target.y, target.r, C.target, 0.5);
    game.draw.circle(target.x, target.y, target.r * 0.6, C.target, 0.7);
    game.draw.circle(target.x, target.y, target.r * 0.3, C.targetHi);
    game.draw.text('+1', target.x, target.y, { size: 28, color: '#fff', bold: true });

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      game.draw.circle(tr.x, tr.y, PUCK_R * (1 - tr.age / 0.6) * 0.8, C.trail, (1 - tr.age / 0.6) * 0.3);
    }

    // Puck
    if (puck) {
      game.draw.circle(puck.x, puck.y, PUCK_R + 6, C.puckHi, 0.3);
      game.draw.circle(puck.x, puck.y, PUCK_R, C.puck);
      game.draw.circle(puck.x, puck.y, PUCK_R * 0.5, C.puckHi, 0.4);
    } else if (ammo > 0 && !done) {
      // Show launch point
      var lx = PLAY_X + PLAY_W / 2;
      var ly = PLAY_Y + PLAY_H - 60;
      var lPulse = 0.5 + 0.5 * Math.abs(Math.sin(game.time.elapsed * 3));
      game.draw.circle(lx, ly, PUCK_R + 8, C.puckHi, lPulse * 0.4);
      game.draw.circle(lx, ly, PUCK_R, C.puck, 0.5);
      game.draw.text('↑タップ', lx, ly + 60, { size: 36, color: C.ui });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '命中！' : '滑り止め…', W / 2, H * 0.81, {
        size: 64, color: feedbackOk ? C.correct : '#64748b', bold: true
      });
    }

    // Ammo
    for (var ai = 0; ai < 10; ai++) {
      var aix = W / 2 + (ai - 4.5) * 60;
      game.draw.circle(aix, H * 0.88, 20, ai < ammo ? C.puck : '#0a1428');
    }

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: '#f1f5f9', bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, '#040c18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    placeTarget();
  });
})(game);
