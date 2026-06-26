// 443-balloon-pop.js
// 風船割り — 膨らみすぎる前に風船を割る
// 操作: タップで風船を割る（大きくなりすぎると爆発して失敗）
// 成功: 20個割る  失敗: 5回爆発 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0014',
    bal0:   '#f43f5e',
    bal1:   '#f97316',
    bal2:   '#eab308',
    bal2b:  '#84cc16',
    bal3:   '#22c55e',
    bal4:   '#06b6d4',
    bal5:   '#8b5cf6',
    balHi:  '#fef9c3',
    string: '#94a3b8',
    pop:    '#fef08a',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var COLORS = [C.bal0, C.bal1, C.bal2, C.bal2b, C.bal3, C.bal4, C.bal5];

  var balloons = [];
  var particles = [];
  var popped = 0;
  var NEEDED = 20;
  var explosions = 0;
  var MAX_EXPLODE = 5;
  var done = false;
  var timeLeft = 60;
  var flashAnim = 0;
  var flashCol = C.wrong;

  function spawnBalloon() {
    var col = COLORS[Math.floor(Math.random() * COLORS.length)];
    var x = 120 + Math.random() * (W - 240);
    var y = H + 60;
    var growSpeed = 18 + Math.random() * 22 + popped * 0.3;
    var maxR = 70 + Math.random() * 50;
    var driftX = (Math.random() - 0.5) * 60;
    balloons.push({
      x: x, y: y, r: 20, maxR: maxR,
      grow: growSpeed,
      vy: -(60 + Math.random() * 40),
      vx: driftX,
      col: col,
      age: 0,
      string: Math.random() * 0.3
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = -1;
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      var dx = tx - b.x;
      var dy = ty - b.y;
      if (Math.sqrt(dx*dx + dy*dy) < b.r + 20) {
        hit = i;
        break;
      }
    }
    if (hit >= 0) {
      var b2 = balloons[hit];
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: b2.x, y: b2.y, vx: Math.cos(ang)*220, vy: Math.sin(ang)*220, life: 0.5, col: b2.col });
      }
      balloons.splice(hit, 1);
      popped++;
      flashCol = '#fbbf24';
      flashAnim = 0.3;
      game.audio.play('se_tap', 0.5);
      if (popped >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(popped * 300 + Math.ceil(timeLeft) * 80); }, 600);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Spawn
    var target = 2 + Math.floor(popped / 5);
    while (balloons.length < target && !done) spawnBalloon();

    // Update balloons
    for (var bi = balloons.length - 1; bi >= 0; bi--) {
      var b = balloons[bi];
      b.age += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.r += b.grow * dt;
      b.vy += 10 * dt; // slight gravity
      // Drift walls
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }

      if (b.r >= b.maxR) {
        // Explode!
        for (var pi2 = 0; pi2 < 16; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang2)*280, vy: Math.sin(ang2)*280, life: 0.7, col: C.wrong });
        }
        balloons.splice(bi, 1);
        explosions++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.4);
        if (explosions >= MAX_EXPLODE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Balloons
    for (var bi2 = 0; bi2 < balloons.length; bi2++) {
      var b3 = balloons[bi2];
      var ratio = b3.r / b3.maxR;
      // Danger pulse when near limit
      var pulse = ratio > 0.8 ? (Math.sin(b3.age * 20) * 0.5 + 0.5) * 0.3 : 0;
      // String
      var stringLen = b3.r * 1.8;
      game.draw.line(b3.x, b3.y + b3.r, b3.x + Math.sin(b3.string * Math.PI * 2) * 20, b3.y + b3.r + stringLen, C.string, 3);
      // Balloon
      game.draw.circle(b3.x, b3.y, b3.r * (1 + pulse), b3.col, 0.85);
      game.draw.circle(b3.x - b3.r * 0.3, b3.y - b3.r * 0.3, b3.r * 0.25, C.balHi, 0.4);
      // Danger ring
      if (ratio > 0.75) {
        game.draw.circle(b3.x, b3.y, b3.r + 10, C.wrong, ratio - 0.7);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Explosion dots
    for (var ei = 0; ei < MAX_EXPLODE; ei++) {
      game.draw.circle(W/2 - (MAX_EXPLODE-1)*44 + ei*88, H*0.955, 18, ei < explosions ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(popped + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio2, 72, ratio2 > 0.3 ? C.bal4 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnBalloon();
    spawnBalloon();
  });
})(game);
