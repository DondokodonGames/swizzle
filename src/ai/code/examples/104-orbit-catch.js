// 104-orbit-catch.js
// 軌道キャッチ — 円軌道を周回するキャッチャーで落下する隕石を受け止める
// 操作: タップでキャッチャーを時計回り/反時計回りに切り替える
// 成功: 15個キャッチ  失敗: 5個落とす or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03040a',
    orbit:   '#0f172a',
    orbitHi: '#1e293b',
    catcher: '#3b82f6',
    catcherHi:'#93c5fd',
    meteor:  '#f97316',
    meteorHi:'#fed7aa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    star:    '#fef9c3',
    ui:      '#334155'
  };

  var CENTER_X = W / 2;
  var CENTER_Y = H * 0.46;
  var ORBIT_R = 240;
  var CATCHER_ARC = 0.28; // arc length in radians
  var CATCHER_W = 24;

  var catcherAngle = 0; // current position on orbit (radians)
  var catcherDir = 1; // 1=clockwise, -1=counter
  var CATCH_SPEED = 2.2; // rad/sec

  var meteors = []; // { angle, r, vy(fall speed) }
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.2;

  var score = 0;
  var needed = 15;
  var drops = 0;
  var maxDrops = 5;
  var timeLeft = 30;
  var done = false;
  var catchFlash = 0;
  var dropFlash = 0;

  // Background stars
  var bgStars = [];
  for (var i = 0; i < 60; i++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 1 });
  }

  function spawnMeteor() {
    // Spawn at a random angle, falling toward center
    var angle = Math.random() * Math.PI * 2;
    meteors.push({
      angle: angle,
      r: ORBIT_R + 160 + Math.random() * 100, // start outside orbit
      fallSpeed: 80 + score * 5
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    catcherDir = -catcherDir;
    game.audio.play('se_tap', 0.3);
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

    // Move catcher
    catcherAngle += catcherDir * CATCH_SPEED * dt;

    // Spawn meteors
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - score * 0.03;
      if (spawnTimer < 0.6) spawnTimer = 0.6;
      spawnMeteor();
    }

    // Update meteors
    var toRemove = [];
    for (var i = 0; i < meteors.length; i++) {
      var m = meteors[i];
      m.r -= m.fallSpeed * dt;

      if (m.r <= ORBIT_R) {
        // Reach orbit — check if catcher is there
        // Normalize angles
        var mAngle = ((m.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var cAngle = ((catcherAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var diff = Math.abs(mAngle - cAngle);
        diff = Math.min(diff, Math.PI * 2 - diff);

        if (diff < CATCHER_ARC) {
          // Caught!
          score++;
          catchFlash = 0.25;
          game.audio.play('se_tap', 0.9);
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 30 + Math.ceil(timeLeft) * 10); }, 400);
          }
        } else {
          // Dropped
          drops++;
          dropFlash = 0.2;
          game.audio.play('se_failure', 0.5);
          if (drops >= maxDrops && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        toRemove.push(i);
      }
    }
    for (var j = toRemove.length - 1; j >= 0; j--) meteors.splice(toRemove[j], 1);

    if (catchFlash > 0) catchFlash -= dt;
    if (dropFlash > 0) dropFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars
    for (var si = 0; si < bgStars.length; si++) {
      var bs = bgStars[si];
      var tw = 0.3 + 0.7 * Math.abs(Math.sin(game.time.elapsed * 0.7 + si));
      game.draw.circle(bs.x, bs.y, bs.r, C.star, tw * 0.5);
    }

    // Orbit ring
    game.draw.circle(CENTER_X, CENTER_Y, ORBIT_R + CATCHER_W, C.orbitHi, 0.15);
    game.draw.circle(CENTER_X, CENTER_Y, ORBIT_R, C.orbitHi, 0.08);

    // Meteors
    for (var mi = 0; mi < meteors.length; mi++) {
      var met = meteors[mi];
      var mx = CENTER_X + Math.cos(met.angle) * met.r;
      var my = CENTER_Y + Math.sin(met.angle) * met.r;
      var mPulse = 0.6 + 0.4 * Math.abs(Math.sin(game.time.elapsed * 5 + mi));
      game.draw.circle(mx, my, 24 + mPulse * 4, C.meteorHi, mPulse * 0.3);
      game.draw.circle(mx, my, 20, C.meteor);
      // Trail
      var trailLen = 3;
      for (var ti = 1; ti <= trailLen; ti++) {
        var trailR = met.r + ti * 18;
        var trailX = CENTER_X + Math.cos(met.angle) * trailR;
        var trailY = CENTER_Y + Math.sin(met.angle) * trailR;
        game.draw.circle(trailX, trailY, 10 - ti * 2, C.meteor, (trailLen - ti + 1) / trailLen * 0.4);
      }
    }

    // Catcher arc
    var cArcStart = catcherAngle - CATCHER_ARC;
    var cArcEnd = catcherAngle + CATCHER_ARC;
    // Draw arc as thick line segments
    var steps = 16;
    for (var si2 = 0; si2 < steps; si2++) {
      var a1 = cArcStart + (si2 / steps) * (cArcEnd - cArcStart);
      var a2 = cArcStart + ((si2 + 1) / steps) * (cArcEnd - cArcStart);
      var x1 = CENTER_X + Math.cos(a1) * ORBIT_R;
      var y1 = CENTER_Y + Math.sin(a1) * ORBIT_R;
      var x2 = CENTER_X + Math.cos(a2) * ORBIT_R;
      var y2 = CENTER_Y + Math.sin(a2) * ORBIT_R;
      game.draw.line(x1, y1, x2, y2, C.catcher, CATCHER_W);
    }
    // Glow
    if (catchFlash > 0) {
      for (var si3 = 0; si3 < steps; si3++) {
        var a3 = cArcStart + (si3 / steps) * (cArcEnd - cArcStart);
        var a4 = cArcStart + ((si3 + 1) / steps) * (cArcEnd - cArcStart);
        var x3 = CENTER_X + Math.cos(a3) * ORBIT_R;
        var y3 = CENTER_Y + Math.sin(a3) * ORBIT_R;
        var x4 = CENTER_X + Math.cos(a4) * ORBIT_R;
        var y4 = CENTER_Y + Math.sin(a4) * ORBIT_R;
        game.draw.line(x3, y3, x4, y4, C.correct, CATCHER_W * catchFlash * 4);
      }
    }

    // Direction indicator at center
    var dirArrow = catcherDir > 0 ? '↻' : '↺';
    game.draw.circle(CENTER_X, CENTER_Y, 40, C.orbit);
    game.draw.text(dirArrow, CENTER_X, CENTER_Y, { size: 48, color: C.catcherHi, bold: true });

    // Flash overlays
    if (dropFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, dropFlash * 0.3);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#03040a');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.catcher : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + drops
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 60;
      game.draw.circle(sx, 136, 18, s < score ? C.correct : '#060810');
    }
    for (var d = 0; d < maxDrops; d++) {
      var dx2 = W / 2 + (d - (maxDrops - 1) / 2) * 56;
      game.draw.circle(dx2, 200, 18, d < drops ? C.wrong : '#060810');
    }

    // Guide
    game.draw.text('タップで方向転換！', W / 2, H * 0.88, { size: 48, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
