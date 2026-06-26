// 461-meteor-catch.js
// 隕石キャッチ — 落下する隕石の軌道を予測してバケツを置く
// 操作: タップでバケツの位置を指定する（隕石が当たれば成功）
// 成功: 15個キャッチ  失敗: 10個外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000308',
    sky:    '#020810',
    trail:  '#f97316',
    trailHi:'#fbbf24',
    meteor: '#ef4444',
    meteorHi:'#fca5a5',
    bucket: '#3b82f6',
    bucketHi:'#93c5fd',
    ground: '#1e3a5f',
    groundHi:'#2563eb',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    star:   '#e2e8f0'
  };

  var BUCKET_W = 110;
  var BUCKET_H = 70;
  var GROUND_Y = H * 0.85;
  var BUCKET_Y = GROUND_Y - BUCKET_H;

  var meteors = [];
  var bucketX = W / 2;
  var placed = false;
  var particles = [];
  var caught = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var nextSpawn = 1.0;

  // Stars
  var stars = [];
  for (var si = 0; si < 70; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.8, r: 1 + Math.random() * 2 });
  }

  function spawnMeteor() {
    var x = 50 + Math.random() * (W - 100);
    var vx = (Math.random() - 0.5) * 200;
    var vy = 300 + Math.random() * 200;
    meteors.push({ x: x, y: -40, vx: vx, vy: vy, trail: [], r: 22 + Math.random() * 12 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty < GROUND_Y - 100) return; // Only tap in lower area
    bucketX = Math.max(BUCKET_W/2, Math.min(W - BUCKET_W/2, tx));
    placed = true;
    game.audio.play('se_tap', 0.3);
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

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnMeteor();
      nextSpawn = 0.8 + Math.random() * 0.6 - caught * 0.01;
      if (nextSpawn < 0.4) nextSpawn = 0.4;
    }

    // Update meteors
    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 12) m.trail.shift();
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Hit bucket
      if (placed && m.y + m.r >= BUCKET_Y && m.y - m.r <= BUCKET_Y + BUCKET_H) {
        if (Math.abs(m.x - bucketX) < BUCKET_W/2 + m.r * 0.5) {
          caught++;
          flashCol = C.correct;
          flashAnim = 0.5;
          game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: m.x, y: BUCKET_Y, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160 - 100, life: 0.5, col: C.trailHi });
          }
          meteors.splice(mi, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.8);
            setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 80); }, 700);
          }
          continue;
        }
      }

      // Hit ground (missed)
      if (m.y > GROUND_Y + 50) {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.3);
        for (var pi2 = 0; pi2 < 6; pi2++) {
          var ang2 = Math.random() * Math.PI - Math.PI * 0.8;
          particles.push({ x: m.x, y: GROUND_Y, vx: Math.cos(ang2)*100, vy: Math.sin(ang2)*80, life: 0.4, col: C.meteor });
        }
        meteors.splice(mi, 1);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }

      // Off sides
      if (m.x < -100 || m.x > W + 100) meteors.splice(mi, 1);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      game.draw.circle(stars[sti].x, stars[sti].y, stars[sti].r, C.star, 0.5);
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.rect(0, GROUND_Y, W, 8, C.groundHi, 0.5);

    // Meteor trails and bodies
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      for (var ti = 0; ti < m2.trail.length; ti++) {
        var tRatio = ti / m2.trail.length;
        game.draw.circle(m2.trail[ti].x, m2.trail[ti].y, m2.r * tRatio * 0.7, C.trail, tRatio * 0.4);
      }
      game.draw.circle(m2.x, m2.y, m2.r * 1.4, C.trailHi, 0.15);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor, 0.9);
      game.draw.circle(m2.x - m2.r*0.3, m2.y - m2.r*0.3, m2.r*0.3, C.meteorHi, 0.4);

      // Trajectory preview line
      if (placed) {
        var predX = m2.x + m2.vx * (GROUND_Y - m2.y) / m2.vy;
        game.draw.line(m2.x, m2.y, predX, GROUND_Y, C.ui, 2);
        game.draw.circle(predX, GROUND_Y - 10, 8, C.ui, 0.5);
      }
    }

    // Bucket
    if (placed) {
      var bx = bucketX - BUCKET_W/2;
      game.draw.rect(bx, BUCKET_Y, BUCKET_W, BUCKET_H, C.bucket, 0.85);
      game.draw.rect(bx, BUCKET_Y, BUCKET_W, 10, C.bucketHi, 0.7);
      game.draw.rect(bx + 8, BUCKET_Y + 14, BUCKET_W - 16, BUCKET_H - 14, C.bucket, 0.5);
    } else {
      game.draw.text('タップでバケツを置く', W/2, GROUND_Y + 60, { size: 38, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    var missPerRow = 5;
    for (var mi3 = 0; mi3 < MAX_MISS; mi3++) {
      var mx = W*0.1 + (mi3 % missPerRow) * (W*0.8/(missPerRow-1));
      var my2 = mi3 < missPerRow ? H*0.948 : H*0.963;
      game.draw.circle(mx, my2, 14, mi3 < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bucket : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
  });
})(game);
