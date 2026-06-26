// 388-balloon-pop.js
// バルーンポップ — 膨らみすぎる前に風船を割る、でも早すぎても小さくてNG
// 操作: タップで風船を割る
// 成功: 10個ちょうどいいサイズで割る  失敗: 爆発3回 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0530',
    balloon0:'#ef4444',
    balloon1:'#f97316',
    balloon2:'#eab308',
    balloon3:'#22c55e',
    balloon4:'#3b82f6',
    balloon5:'#a855f7',
    string: '#cbd5e1',
    zone:   '#22c55e',
    zoneHi: '#86efac',
    danger: '#ef4444',
    pop:    '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var BALLOON_COLORS = [C.balloon0,C.balloon1,C.balloon2,C.balloon3,C.balloon4,C.balloon5];
  var MIN_R = 60;
  var MAX_R = 160;
  var TARGET_MIN = 100;
  var TARGET_MAX = 130;

  var balloons = [];
  var particles = [];
  var popped = 0;
  var NEEDED = 10;
  var exploded = 0;
  var MAX_EXPLODE = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var spawnTimer = 0;

  function spawnBalloon() {
    var col = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    balloons.push({
      x: 100 + Math.random() * (W - 200),
      y: H - 60,
      r: MIN_R,
      growSpeed: 30 + Math.random() * 30,
      col: col,
      vy: -40 - Math.random() * 30,
      wobble: Math.random() * Math.PI * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      if (Math.hypot(tx - b.x, ty - b.y) < b.r) {
        // Pop it
        var ratio = (b.r - TARGET_MIN) / (TARGET_MAX - TARGET_MIN);
        var inZone = b.r >= TARGET_MIN && b.r <= TARGET_MAX;
        if (inZone) {
          popped++;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang)*220, vy: Math.sin(ang)*220, life:0.6, col: b.col });
          }
          if (popped >= NEEDED && !done) {
            done = true;
            game.end.success(popped * 400 + Math.ceil(timeLeft) * 80);
          }
        } else {
          // Too small
          game.audio.play('se_failure', 0.2);
          for (var pi2 = 0; pi2 < 4; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang2)*80, vy: Math.sin(ang2)*80, life:0.3, col: '#888' });
          }
        }
        balloons.splice(i, 1);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnBalloon();
      spawnTimer = 1.5 + Math.random() * 1.5;
    }

    // Update balloons
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      b.r += b.growSpeed * dt;
      b.y += b.vy * dt;
      b.x += Math.sin(elapsed * 1.5 + b.wobble) * 25 * dt;

      // Off top
      if (b.y + b.r < 0) {
        balloons.splice(i, 1);
        continue;
      }

      // Too big = explodes
      if (b.r >= MAX_R) {
        exploded++;
        game.audio.play('se_failure', 0.5);
        for (var pi3 = 0; pi3 < 12; pi3++) {
          var ang3 = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang3)*280, vy: Math.sin(ang3)*280, life:0.7, col: b.col });
        }
        balloons.splice(i, 1);
        if (exploded >= MAX_EXPLODE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target zone indicator (subtle)
    game.draw.text('ちょうどいいサイズで割る！', W / 2, H * 0.9, { size: 36, color: C.ui });

    // Balloons
    for (var bi = 0; bi < balloons.length; bi++) {
      var b2 = balloons[bi];
      var inZone = b2.r >= TARGET_MIN && b2.r <= TARGET_MAX;

      // String
      game.draw.line(b2.x, b2.y + b2.r, b2.x + Math.sin(elapsed + bi) * 20, b2.y + b2.r + 80, C.string, 3);

      // Balloon body
      game.draw.circle(b2.x, b2.y, b2.r + 6, b2.col, 0.1);
      game.draw.circle(b2.x, b2.y, b2.r, b2.col, 0.88);
      // Shine
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.25, '#fff', 0.4);

      // Zone glow
      if (inZone) {
        game.draw.circle(b2.x, b2.y, b2.r + 12, C.zone, 0.2 + Math.sin(elapsed * 8) * 0.1);
      }

      // Danger glow near max
      if (b2.r > TARGET_MAX) {
        var dangerFrac = (b2.r - TARGET_MAX) / (MAX_R - TARGET_MAX);
        game.draw.circle(b2.x, b2.y, b2.r + 16, C.danger, dangerFrac * 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Target size reference
    game.draw.circle(80, H * 0.88, (TARGET_MIN + TARGET_MAX) / 2, '#fff', 0.05);
    game.draw.circle(80, H * 0.88, TARGET_MIN, C.zone, 0.3);
    game.draw.circle(80, H * 0.88, TARGET_MAX, C.zone, 0.15);

    // Explode dots
    for (var ei = 0; ei < MAX_EXPLODE; ei++) {
      game.draw.circle(W/2 - (MAX_EXPLODE-1)*40 + ei*80, H*0.935, 16, ei < exploded ? C.danger : C.ui, 0.9);
    }

    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.balloon4 : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.8;
  });
})(game);
