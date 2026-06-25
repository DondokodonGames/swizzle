// 174-catch-rain.js
// 雨水収穫 — 落ちてくる雨粒を移動バケツで受け止め、特定の組み合わせを集める集中力
// 操作: スワイプ/タップで3つのバケツを左右移動
// 成功: 3色各10滴ずつ  失敗: 間違ったバケツに20滴 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020810',
    sky:    '#040c18',
    rain:   ['#06b6d4', '#a855f7', '#f59e0b'],
    bucket: ['#164e63', '#4c1d95', '#78350f'],
    bucketHi:['#0891b2', '#7c3aed', '#d97706'],
    correct:'#22c55e',
    wrong:  '#ef4444',
    ui:     '#334155'
  };

  var BUCKET_W = 160;
  var BUCKET_H = 120;
  var BUCKET_Y = H * 0.82;
  var BUCKET_GAP = 20;
  var RAIN_R = 20;
  var RAIN_SPEED = 300;

  // 3 buckets, each associated with 1 color
  var bucketX = [W * 0.2, W * 0.5, W * 0.8]; // positions (can shift)
  var bucketColors = [0, 1, 2]; // which rain color each bucket accepts
  var SHIFT = W * 0.3; // how far buckets move per swipe

  var drops = [];
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.35;

  var collected = [0, 0, 0]; // count per color
  var wrong = 0;
  var NEEDED_EACH = 10;
  var MAX_WRONG = 20;
  var timeLeft = 50;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function spawnDrop() {
    var colorIdx = Math.floor(Math.random() * 3);
    drops.push({
      x: 60 + Math.random() * (W - 120),
      y: -RAIN_R,
      color: colorIdx,
      speed: RAIN_SPEED + Math.random() * 80
    });
  }

  function shiftBuckets(delta) {
    for (var bi = 0; bi < bucketX.length; bi++) {
      bucketX[bi] = Math.max(BUCKET_W / 2 + 20, Math.min(W - BUCKET_W / 2 - 20, bucketX[bi] + delta));
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') { shiftBuckets(-SHIFT); game.audio.play('se_tap', 0.3); }
    else if (dir === 'right') { shiftBuckets(SHIFT); game.audio.play('se_tap', 0.3); }
  });

  game.onTap(function(tx) {
    if (done) return;
    if (tx < W / 2) { shiftBuckets(-SHIFT); game.audio.play('se_tap', 0.3); }
    else { shiftBuckets(SHIFT); game.audio.play('se_tap', 0.3); }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6); spawnDrop(); }

    for (var di = drops.length - 1; di >= 0; di--) {
      var d = drops[di];
      d.y += d.speed * dt;

      // Check bucket catch
      if (d.y + RAIN_R > BUCKET_Y) {
        var caught = false;
        for (var bi = 0; bi < bucketX.length; bi++) {
          var bLeft = bucketX[bi] - BUCKET_W / 2;
          var bRight = bucketX[bi] + BUCKET_W / 2;
          if (d.x > bLeft && d.x < bRight) {
            if (bucketColors[bi] === d.color) {
              collected[d.color]++;
              feedbackOk = true; feedback = 0.2;
              game.audio.play('se_success', 0.5);
              for (var pi = 0; pi < 4; pi++) {
                var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
                particles.push({ x: d.x, y: BUCKET_Y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120 - 60, life: 0.4, color: d.color });
              }
            } else {
              wrong++;
              feedbackOk = false; feedback = 0.3;
              game.audio.play('se_failure', 0.4);
              if (wrong >= MAX_WRONG && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
            }
            caught = true;
            break;
          }
        }
        if (!caught) wrong++; // missed entirely
        drops.splice(di, 1);
        continue;
      }
      if (d.y > H + 40) { drops.splice(di, 1); wrong++; }
    }

    // Check win
    var allDone = collected[0] >= NEEDED_EACH && collected[1] >= NEEDED_EACH && collected[2] >= NEEDED_EACH;
    if (allDone && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success((collected[0] + collected[1] + collected[2]) * 10 + Math.ceil(timeLeft) * 20); }, 400);
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Rain drops (falling)
    for (var di2 = 0; di2 < drops.length; di2++) {
      var d2 = drops[di2];
      var dCol = C.rain[d2.color];
      game.draw.circle(d2.x, d2.y, RAIN_R, dCol, 0.9);
      game.draw.circle(d2.x, d2.y - RAIN_R * 0.5, RAIN_R * 0.4, '#fff', 0.3);
      // Trailing streaks
      for (var si = 1; si <= 3; si++) {
        game.draw.circle(d2.x, d2.y - si * 20, RAIN_R * (1 - si * 0.25), dCol, 0.15 * (1 - si / 4));
      }
    }

    // Buckets
    for (var bi2 = 0; bi2 < bucketX.length; bi2++) {
      var bx2 = bucketX[bi2];
      var bc = bucketColors[bi2];
      var bCol = C.bucket[bc];
      var bHi = C.bucketHi[bc];
      var rCol = C.rain[bc];

      // Bucket body
      game.draw.rect(bx2 - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, bCol, 0.9);
      game.draw.rect(bx2 - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 12, bHi, 0.7);
      // Water level
      var fillRatio = Math.min(1, collected[bc] / NEEDED_EACH);
      var fillH = (BUCKET_H - 16) * fillRatio;
      if (fillH > 0) {
        game.draw.rect(bx2 - BUCKET_W / 2 + 6, BUCKET_Y + BUCKET_H - fillH - 6, BUCKET_W - 12, fillH, rCol, 0.7);
      }
      // Color indicator
      game.draw.circle(bx2, BUCKET_Y - 36, 28, rCol, 0.85);
      // Count
      game.draw.text(collected[bc] + '/' + NEEDED_EACH, bx2, BUCKET_Y + BUCKET_H + 44, { size: 36, color: bHi });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8 * part.life * 2, C.rain[part.color], part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.1);
    }

    // Wrong counter
    var wrongRatio = wrong / MAX_WRONG;
    game.draw.rect(W - 160, H * 0.1, 120, 32, C.wrong, wrongRatio * 0.6 + 0.1);
    game.draw.text('NG: ' + wrong, W - 100, H * 0.1 + 16, { size: 32, color: '#fff' });

    game.draw.text('← タップ  タップ →', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.rain[2] : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); spawnDrop(); });
})(game);
