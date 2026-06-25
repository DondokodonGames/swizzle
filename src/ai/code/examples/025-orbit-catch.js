// 025-orbit-catch.js
// 軌道キャッチ — 重力圏を周回する隕石を正確なタイミングで捕獲する
// 操作: タップで発射口から捕獲ビームを出す
// 成功: 軌道上の隕石を5個捕獲  失敗: 3回ミス or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020510',
    space:    '#050815',
    planet:   '#1e3a5f',
    planetHi: '#2563eb',
    orbit:    '#1e293b',
    meteor:   '#f97316',
    meteorHi: '#fed7aa',
    beam:     '#22d3ee',
    hit:      '#22c55e',
    miss:     '#ef4444',
    ui:       '#475569'
  };

  var cx = W / 2;
  var cy = H * 0.42;
  var ORBIT_R = 320;  // orbital radius

  // Multiple meteors at different orbital positions
  var meteors = [];
  var METEOR_R = 44;
  var METEOR_SPEED = 1.4; // radians per second (angular velocity)

  function spawnMeteor() {
    var startAngle = Math.random() * Math.PI * 2;
    var dir = Math.random() < 0.5 ? 1 : -1; // CW or CCW
    meteors.push({
      angle: startAngle,
      dir: dir,
      speed: METEOR_SPEED * (0.8 + Math.random() * 0.5),
      alive: true
    });
  }

  // Beam from bottom center
  var BEAM_ORIGIN_Y = H * 0.82;
  var beamActive = false;
  var beamAngle = 0;    // which angle the beam points at
  var beamTimer = 0;
  var beamHitMeteor = -1;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  // Stars
  var stars = [];
  for (var i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 3 + 1, twinkle: Math.random() * Math.PI * 2 });
  }

  game.onTap(function(x, y) {
    if (done || beamActive) return;

    // Find which meteor is closest to the "aimed" position
    // Beam goes from (W/2, BEAM_ORIGIN_Y) toward where user tapped → determines angle
    var bx = x - cx;
    var by = y - cy;
    var tapAngle = Math.atan2(by, bx);

    // Find if any meteor is near that angle
    var hitIdx = -1;
    var bestDiff = Math.PI * 0.18; // ~32 degrees tolerance
    for (var i = 0; i < meteors.length; i++) {
      if (!meteors[i].alive) continue;
      var mAngle = meteors[i].angle;
      var diff = Math.abs(mAngle - tapAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < bestDiff) {
        bestDiff = diff;
        hitIdx = i;
      }
    }

    beamActive = true;
    beamAngle = tapAngle;
    beamTimer = 0.35;

    if (hitIdx >= 0) {
      meteors[hitIdx].alive = false;
      beamHitMeteor = hitIdx;
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.ceil(timeLeft) * 6);
        }, 400);
      } else {
        // Replace the caught meteor after a delay
        setTimeout(function() { spawnMeteor(); }, 600);
      }
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
    feedback = 0.4;
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

    // Orbit meteors
    for (var i = 0; i < meteors.length; i++) {
      if (meteors[i].alive) {
        meteors[i].angle += meteors[i].dir * meteors[i].speed * dt;
      }
    }

    if (beamTimer > 0) beamTimer -= dt;
    else { beamActive = false; beamHitMeteor = -1; }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var sa = 0.4 + 0.3 * Math.sin(game.time.elapsed * 1.5 + st.twinkle);
      game.draw.circle(st.x, st.y, st.r, '#ffffff', sa);
    }

    // Orbit ring
    for (var ring = 1; ring <= 2; ring++) {
      var rr = ORBIT_R + (ring - 1) * 20;
      // approximate ring with many small dots
      for (var d = 0; d < 48; d++) {
        var a = (d / 48) * Math.PI * 2;
        var rx2 = cx + Math.cos(a) * rr;
        var ry2 = cy + Math.sin(a) * rr;
        game.draw.circle(rx2, ry2, 4, C.orbit, ring === 1 ? 0.5 : 0.2);
      }
    }

    // Planet (center)
    game.draw.circle(cx, cy, 100, '#0f2040');
    game.draw.circle(cx, cy, 88, C.planet);
    game.draw.circle(cx, cy, 60, C.planetHi, 0.5);
    game.draw.circle(cx - 20, cy - 20, 30, '#fff', 0.08);

    // Meteors
    for (var m = 0; m < meteors.length; m++) {
      var met = meteors[m];
      if (!met.alive) continue;
      var mx2 = cx + Math.cos(met.angle) * ORBIT_R;
      var my2 = cy + Math.sin(met.angle) * ORBIT_R;
      // Trail
      for (var tr = 1; tr <= 4; tr++) {
        var ta = met.angle - met.dir * 0.12 * tr;
        var tx = cx + Math.cos(ta) * ORBIT_R;
        var ty = cy + Math.sin(ta) * ORBIT_R;
        game.draw.circle(tx, ty, METEOR_R * (1 - tr * 0.2), C.meteor, 0.12);
      }
      // Body
      game.draw.circle(mx2, my2, METEOR_R + 8, C.meteor, 0.25);
      game.draw.circle(mx2, my2, METEOR_R, C.meteor);
      game.draw.circle(mx2 - 12, my2 - 12, METEOR_R * 0.4, C.meteorHi, 0.7);
    }

    // Beam
    if (beamActive) {
      var bEndX = cx + Math.cos(beamAngle) * (ORBIT_R + METEOR_R);
      var bEndY = cy + Math.sin(beamAngle) * (ORBIT_R + METEOR_R);
      var beamAlpha = beamTimer / 0.35;
      game.draw.line(cx, cy, bEndX, bEndY, C.beam, 8);
      game.draw.line(cx, cy, bEndX, bEndY, '#fff', 3);
      // Impact flash
      if (feedbackOk) {
        game.draw.circle(bEndX, bEndY, 60, C.hit, beamAlpha * 0.6);
      }
    }

    // Beam launcher (at planet center now, visual only)
    game.draw.circle(cx, cy, 28, C.beam, 0.5);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#020508');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#0891b2' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.beam, bold: true });
    for (var mm = 0; mm < maxMisses; mm++) {
      var mmx = W / 2 + (mm - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mmx, 200, 18, mm < misses ? C.miss : C.orbit);
    }

    // Feedback
    if (feedback > 0) {
      var prog = 1 - feedback / 0.4;
      if (feedbackOk) {
        game.draw.text('CATCH!', W / 2, H * 0.7 - 60 - prog * 70, { size: 88, color: C.hit, bold: true });
      } else {
        game.draw.text('MISS', W / 2, H * 0.7 - 40, { size: 80, color: C.miss, bold: true });
      }
    }

    // Guide
    game.draw.text('隕石をタップで捕獲！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnMeteor();
    spawnMeteor();
  });
})(game);
