// 677-firefly.js
// 蛍狩り — 暗闇で瞬く光が消える前につかまえろ
// 操作: タップで光っている蛍を捕まえる
// 成功: 25匹捕獲  失敗: 10匹逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010508',
    firefly: '#d9f99d',
    glow:    '#86efac',
    caught:  '#22c55e',
    missed:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030a05'
  };

  var flies = [];
  var spawnTimer = 0;
  var SPAWN_RATE = 0.9;
  var MAX_FLIES = 10;

  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.caught;
  var resultTimer = 0, resultText = '';

  var stars = [];
  for (var s = 0; s < 80; s++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * (H * 0.85),
      r: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2
    });
  }

  function spawnFly() {
    flies.push({
      x: 100 + Math.random() * (W - 200),
      y: H * 0.18 + Math.random() * (H * 0.62),
      vx: (Math.random() - 0.5) * 55,
      vy: (Math.random() - 0.5) * 55,
      phase: Math.random() * Math.PI * 2,
      blinkPeriod: 1.4 + Math.random() * 1.0,
      blinkOn: 0.38 + Math.random() * 0.14,
      lit: false,
      age: 0,
      maxAge: 7 + Math.random() * 5,
      tapped: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = flies.length - 1; i >= 0; i--) {
      var f = flies[i];
      if (!f.lit || f.tapped) continue;
      var dx = tx - f.x, dy = ty - f.y;
      if (dx * dx + dy * dy < 72 * 72) {
        f.tapped = true;
        caught++;
        flashCol = C.caught;
        flashAnim = 0.28;
        resultText = 'キャッチ！';
        resultTimer = 0.45;
        game.audio.play('se_success', 0.45);
        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(pa) * 130, vy: Math.sin(pa) * 130, life: 0.5, col: C.glow });
        }
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_RATE && flies.length < MAX_FLIES) {
      spawnTimer = 0;
      spawnFly();
    }

    for (var i = flies.length - 1; i >= 0; i--) {
      var f = flies[i];
      if (f.tapped) { flies.splice(i, 1); continue; }

      f.age += dt;
      f.phase += dt;
      var t = f.phase % f.blinkPeriod;
      f.lit = t < f.blinkOn;

      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx += (Math.random() - 0.5) * 50 * dt;
      f.vy += (Math.random() - 0.5) * 50 * dt;
      var spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      if (spd > 80) { f.vx = f.vx / spd * 80; f.vy = f.vy / spd * 80; }
      if (f.x < 60) f.vx = Math.abs(f.vx);
      if (f.x > W - 60) f.vx = -Math.abs(f.vx);
      if (f.y < H * 0.14) f.vy = Math.abs(f.vy);
      if (f.y > H * 0.84) f.vy = -Math.abs(f.vy);

      if (f.age >= f.maxAge) {
        if (f.lit) {
          missed++;
          flashCol = C.missed;
          flashAnim = 0.22;
          resultText = '逃げた！';
          resultTimer = 0.35;
          game.audio.play('se_failure', 0.18);
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        flies.splice(i, 1);
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

    // Stars
    for (var si = 0; si < stars.length; si++) {
      var star = stars[si];
      var alpha = 0.15 + 0.2 * Math.sin(elapsed * 1.3 + star.phase);
      game.draw.circle(star.x, star.y, star.r, '#e2e8f0', alpha);
    }

    // Silhouette trees
    for (var ti = 0; ti < 7; ti++) {
      var tx2 = ti * (W / 6);
      var th = 120 + (ti * 53 % 80);
      game.draw.line(tx2, H * 0.87, tx2 + (ti % 3 - 1) * 14, H * 0.87 - th, '#0a2205', 28 + ti % 12);
    }

    // Ground
    game.draw.rect(0, H * 0.87, W, H * 0.13, '#071204', 0.95);
    game.draw.rect(0, H * 0.87, W, 10, '#0f2208', 0.7);

    // Fireflies
    for (var fi = 0; fi < flies.length; fi++) {
      var fly = flies[fi];
      if (fly.lit) {
        game.draw.circle(fly.x, fly.y, 50, C.glow, 0.10);
        game.draw.circle(fly.x, fly.y, 30, C.glow, 0.20);
        game.draw.circle(fly.x, fly.y, 15, C.firefly, 0.95);
      } else {
        game.draw.circle(fly.x, fly.y, 8, '#1e3a0d', 0.45);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 60, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.missed : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.caught : C.missed);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    spawnFly();
    spawnFly();
    spawnFly();
  });
})(game);
