// 441-neon-catcher.js
// ネオンキャッチ — 高速で動くネオン球をタップ連打でキャッチ
// 操作: 画面をタップして光の球を捕まえる
// 成功: 40個キャッチ  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#03001a',
    neon0:  '#f0abfc',
    neon1:  '#a78bfa',
    neon2:  '#22d3ee',
    neon3:  '#4ade80',
    neon4:  '#fbbf24',
    neon5:  '#f87171',
    trail0: '#7c3aed',
    trail1: '#0e7490',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444'
  };

  var NEONS = [C.neon0, C.neon1, C.neon2, C.neon3, C.neon4, C.neon5];
  var TRAILS = [C.trail0, C.trail1, C.neon3, C.neon4];

  var balls = [];
  var particles = [];
  var caught = 0;
  var NEEDED = 40;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var flashAnim = 0;
  var combo = 0;
  var comboTimer = 0;

  function spawnBall() {
    var col = NEONS[Math.floor(Math.random() * NEONS.length)];
    var r = 28 + Math.random() * 20;
    var margin = r + 20;
    var x = margin + Math.random() * (W - margin * 2);
    var y = margin + Math.random() * (H * 0.8 - margin * 2) + 80;
    var speed = 180 + Math.random() * 300 + caught * 3;
    var angle = Math.random() * Math.PI * 2;
    balls.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: r,
      col: col,
      trail: [],
      pulse: Math.random() * Math.PI * 2,
      spawning: 0.3
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    var hit = -1;
    var hitDist = 999;
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      if (b.spawning > 0) continue;
      var dx = tx - b.x;
      var dy = ty - b.y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < b.r + 20 && d < hitDist) {
        hitDist = d;
        hit = bi;
      }
    }

    if (hit >= 0) {
      var b2 = balls[hit];
      caught++;
      combo++;
      comboTimer = 1.5;
      flashAnim = 0.3;
      game.audio.play('se_tap', 0.3 + Math.min(0.4, combo * 0.05));

      // Burst particles
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var speed2 = 150 + Math.random() * 150;
        particles.push({ x: b2.x, y: b2.y, vx: Math.cos(ang)*speed2, vy: Math.sin(ang)*speed2, life: 0.5, maxLife: 0.5, col: b2.col, r: 5 + Math.random()*5 });
      }
      balls.splice(hit, 1);

      if (caught >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(caught * 150 + combo * 30 + Math.ceil(timeLeft) * 80); }, 600);
      }
    } else {
      combo = 0;
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

    if (flashAnim > 0) flashAnim -= dt * 4;
    if (comboTimer > 0) comboTimer -= dt;
    else combo = Math.max(0, combo - 1);

    // Maintain ball count
    var targetCount = 3 + Math.floor(caught / 8);
    while (balls.length < targetCount && !done) {
      spawnBall();
    }

    // Update balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b3 = balls[bi2];
      if (b3.spawning > 0) { b3.spawning -= dt * 3; continue; }

      b3.trail.push({ x: b3.x, y: b3.y });
      if (b3.trail.length > 12) b3.trail.shift();

      b3.x += b3.vx * dt;
      b3.y += b3.vy * dt;
      b3.pulse += dt * 4;

      // Bounce
      if (b3.x < b3.r) { b3.x = b3.r; b3.vx = Math.abs(b3.vx); }
      if (b3.x > W - b3.r) { b3.x = W - b3.r; b3.vx = -Math.abs(b3.vx); }
      if (b3.y < b3.r + 80) { b3.y = b3.r + 80; b3.vy = Math.abs(b3.vy); }
      if (b3.y > H - b3.r - 80) { b3.y = H - b3.r - 80; b3.vy = -Math.abs(b3.vy); }
    }

    // Particles
    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vx *= (1 - dt * 2);
      particles[pp].vy *= (1 - dt * 2);
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Scanlines effect
    for (var sl = 0; sl < H; sl += 6) {
      game.draw.line(0, sl, W, sl, '#000', 2);
    }

    // Draw trails
    for (var bi3 = 0; bi3 < balls.length; bi3++) {
      var b4 = balls[bi3];
      if (b4.spawning > 0) continue;
      for (var ti = 0; ti < b4.trail.length; ti++) {
        var tRatio = ti / b4.trail.length;
        game.draw.circle(b4.trail[ti].x, b4.trail[ti].y, b4.r * tRatio * 0.6, b4.col, tRatio * 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      var lifeRatio = p.life / p.maxLife;
      game.draw.circle(p.x, p.y, p.r * lifeRatio, p.col, lifeRatio);
    }

    // Draw balls
    for (var bi4 = 0; bi4 < balls.length; bi4++) {
      var b5 = balls[bi4];
      var pulse = Math.sin(b5.pulse) * 0.15;
      var spawnAlpha = b5.spawning > 0 ? 1 - b5.spawning : 1;

      // Outer glow
      game.draw.circle(b5.x, b5.y, b5.r * (1.6 + pulse), b5.col, 0.1 * spawnAlpha);
      game.draw.circle(b5.x, b5.y, b5.r * (1.2 + pulse), b5.col, 0.2 * spawnAlpha);
      // Core
      game.draw.circle(b5.x, b5.y, b5.r, b5.col, 0.9 * spawnAlpha);
      game.draw.circle(b5.x, b5.y, b5.r * 0.6, '#fff', 0.5 * spawnAlpha);
      game.draw.circle(b5.x - b5.r*0.25, b5.y - b5.r*0.25, b5.r * 0.25, '#fff', 0.6 * spawnAlpha);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, balls.length > 0 ? balls[0].col : C.neon0, flashAnim * 0.15);

    // Combo
    if (combo >= 3) {
      var comboCol = NEONS[combo % NEONS.length];
      game.draw.text('x' + combo + ' コンボ！', W/2, H*0.87, { size: 52, color: comboCol, bold: true });
    }

    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.neon2 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnBall();
    spawnBall();
    spawnBall();
  });
})(game);
