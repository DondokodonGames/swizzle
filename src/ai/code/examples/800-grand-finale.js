// 800-grand-finale.js
// グランドフィナーレ — 800本目！全てのスキルを総動員して頂点を目指せ
// 操作: タップ — 流れ星が輝きの頂点に達した瞬間（複数同時に光る）
// 成功: 40個キャッチ  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020208',
    star:    '#fbbf24',
    starHi:  '#fef3c7',
    starGlow:'#92400e',
    peak:    '#fff',
    trail:   '#a78bfa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040412'
  };

  var stars = []; // { x, y, vx, vy, brightness, growing, peakTimer, PEAK_DUR, answered, size }
  var spawnTimer = 0;
  var SPAWN_RATE = 1.0;
  var MAX_STARS = 5;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  // Background star field
  var bgStars = [];
  for (var i = 0; i < 80; i++) {
    bgStars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 3,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2.5
    });
  }

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var titleFade = 1.0; // fade out the "800" title

  function spawnStar() {
    var side = Math.floor(Math.random() * 3); // 0=top, 1=left, 2=right
    var x, y, vx, vy;
    var speed = 180 + Math.random() * 150 + score * 3;
    if (side === 0) { x = Math.random() * W; y = -60; vx = (Math.random() - 0.5) * 120; vy = speed; }
    else if (side === 1) { x = -60; y = Math.random() * H * 0.7; vx = speed; vy = (Math.random() - 0.5) * 120; }
    else { x = W + 60; y = Math.random() * H * 0.7; vx = -speed; vy = (Math.random() - 0.5) * 120; }

    var growSpeed = 0.5 + Math.random() * 0.4;
    var PEAK_DUR = Math.max(0.2, 0.55 - score * 0.008);
    stars.push({
      x: x, y: y, vx: vx, vy: vy,
      brightness: 0, growing: true,
      peakTimer: 0, PEAK_DUR: PEAK_DUR,
      growSpeed: growSpeed,
      answered: false, missed: false,
      size: 24 + Math.random() * 20,
      trail: []
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = stars.length - 1; i >= 0; i--) {
      var s = stars[i];
      if (s.answered || s.missed) continue;
      var atPeak = s.brightness >= 0.88;
      var dx = tx - s.x;
      var dy = ty - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < s.size + 40) {
        s.answered = true;
        if (atPeak) {
          score++;
          flashCol = C.correct;
          flashAnim = 0.18;
          resultText = score >= 30 ? '★PERFECT★' : 'キャッチ！';
          resultTimer = 0.35;
          game.audio.play('se_success', 0.7);
          // Grand particle burst
          var numP = score >= 30 ? 14 : 8;
          for (var p = 0; p < numP; p++) {
            var pa = Math.random() * Math.PI * 2;
            var sp = 150 + Math.random() * 200;
            var cols2 = [C.star, C.starHi, '#a78bfa', '#38bdf8', '#34d399'];
            particles.push({ x: s.x, y: s.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 60, life: 0.55, col: cols2[Math.floor(Math.random() * cols2.length)] });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 450 + Math.ceil(timeLeft) * 150); }, 700);
            return;
          }
        } else {
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.28;
          resultText = s.brightness < 0.88 ? 'まだ暗い！' : '輝き終わり！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.3);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
            return;
          }
        }
        hit = true;
        break;
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

    // Spawn
    spawnTimer -= dt;
    SPAWN_RATE = Math.max(0.45, 1.0 - score * 0.01);
    var active = 0;
    for (var i = 0; i < stars.length; i++) if (!stars[i].answered && !stars[i].missed) active++;
    if (spawnTimer <= 0 && active < MAX_STARS && !done) {
      spawnTimer = SPAWN_RATE;
      spawnStar();
    }

    // Update stars
    for (var si = stars.length - 1; si >= 0; si--) {
      var s = stars[si];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.trail.push({ x: s.x, y: s.y, life: 0.5 });

      for (var ti = s.trail.length - 1; ti >= 0; ti--) {
        s.trail[ti].life -= dt * 4;
        if (s.trail[ti].life <= 0) s.trail.splice(ti, 1);
      }

      if (!s.answered && !s.missed) {
        if (s.growing) {
          s.brightness += s.growSpeed * dt;
          if (s.brightness >= 1.0) {
            s.brightness = 1.0;
            s.growing = false;
            s.peakTimer = 0;
          }
        } else {
          s.peakTimer += dt;
          if (s.peakTimer < s.PEAK_DUR) {
            // hold at peak
          } else {
            // fade
            s.brightness -= (s.growSpeed * 1.5) * dt;
            if (s.brightness <= 0) {
              s.brightness = 0;
              s.missed = true;
              // Only count as error if not already answered
              errors++;
              flashCol = C.wrong;
              flashAnim = 0.24;
              resultText = '見逃した！';
              resultTimer = 0.38;
              game.audio.play('se_failure', 0.24);
              if (errors >= MAX_ERR && !done) {
                done = true;
                setTimeout(function() { game.end.failure(); }, 600);
              }
            }
          }
        }
      }

      if (s.x < -200 || s.x > W + 200 || s.y > H + 200) {
        stars.splice(si, 1);
      }
    }

    if (titleFade > 0) titleFade -= dt * 0.5;

    // Background stars twinkle
    for (var bi = 0; bi < bgStars.length; bi++) {
      bgStars[bi].twinkle += bgStars[bi].speed * dt;
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt * 1.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars
    for (var bi2 = 0; bi2 < bgStars.length; bi2++) {
      var bs = bgStars[bi2];
      var a = 0.1 + 0.2 * Math.sin(bs.twinkle);
      game.draw.circle(bs.x, bs.y, bs.r, '#fff', a);
    }

    // Star trails
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s2 = stars[si2];
      for (var ti2 = 0; ti2 < s2.trail.length; ti2++) {
        var tr = s2.trail[ti2];
        game.draw.circle(tr.x, tr.y, s2.size * 0.3 * tr.life, C.trail, tr.life * 0.4);
      }
    }

    // Shooting stars
    for (var si3 = 0; si3 < stars.length; si3++) {
      var s3 = stars[si3];
      var b = s3.brightness;
      if (b <= 0) continue;

      var atPeak2 = b >= 0.88 && s3.peakTimer < s3.PEAK_DUR;
      var r = s3.size * b;
      var starCol = atPeak2 ? C.peak : C.star;

      if (atPeak2) {
        // Glow aura
        game.draw.circle(s3.x, s3.y, r * 3, C.starGlow, 0.15);
        game.draw.circle(s3.x, s3.y, r * 2, C.star, 0.2);
      }

      // 6-pointed star shape
      for (var sj = 0; sj < 6; sj++) {
        var sa = sj * Math.PI * 2 / 6 + elapsed * 0.5;
        game.draw.circle(s3.x + Math.cos(sa) * r * 0.7, s3.y + Math.sin(sa) * r * 0.7, r * 0.4, starCol, b * 0.8);
      }
      game.draw.circle(s3.x, s3.y, r * 0.5, starCol, b * 0.95);
      if (atPeak2) {
        game.draw.circle(s3.x, s3.y, r * 0.2, '#fff', 0.95);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    // 800th game title
    if (titleFade > 0.05) {
      game.draw.text('GAME 800', W / 2, H * 0.48, { size: 80, color: C.starHi, bold: true });
      game.draw.text('グランドフィナーレ', W / 2, H * 0.56, { size: 44, color: C.trail });
    }

    if (!done) {
      game.draw.text('輝きの頂点でタップ！', W / 2, H * 0.88, { size: 38, color: C.text + '55' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.19, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnStar();
    spawnStar();
  });
})(game);
