// 435-petal-fall.js
// 花びらの舞 — 舞い落ちる花びらをタップして全て受け止める
// 操作: 花びらに素早くタップ（地面に落ちると失点）
// 成功: 30枚キャッチ  失敗: 10枚落とす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d0408',
    sky:    '#1a0814',
    petal0: '#f9a8d4',
    petal1: '#ec4899',
    petal2: '#fda4af',
    petal3: '#fb7185',
    petal4: '#f0abfc',
    petal5: '#e879f9',
    ground: '#1a0d1a',
    groundHi:'#2d1a2d',
    tree:   '#3b1a00',
    treeHi: '#78350f',
    leaf:   '#166534',
    correct:'#f9a8d4',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var PETAL_COLORS = [C.petal0, C.petal1, C.petal2, C.petal3, C.petal4, C.petal5];
  var GROUND_Y = H * 0.87;

  var petals = [];
  var caught = 0;
  var NEEDED = 30;
  var dropped = 0;
  var MAX_DROP = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var spawnTimer = 0;
  var spawnInterval = 1.2;
  var wind = 0;
  var windTimer = 0;

  function spawnPetal() {
    var col = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    var x = 100 + Math.random() * (W - 200);
    petals.push({
      x: x, y: -40,
      vx: (Math.random() - 0.5) * 80,
      vy: 60 + Math.random() * 80 + caught * 1.5,
      r: 20 + Math.random() * 16,
      col: col,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      wobble: Math.random() * Math.PI * 2,
      touched: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var pi = petals.length - 1; pi >= 0; pi--) {
      var p = petals[pi];
      if (p.touched) continue;
      var dx = tx - p.x;
      var dy = ty - p.y;
      if (Math.sqrt(dx*dx + dy*dy) < p.r + 30) {
        p.touched = true;
        caught++;
        flashCol = C.correct;
        flashAnim = 0.35;
        game.audio.play('se_tap', 0.3);
        for (var ci = 0; ci < 6; ci++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: p.x, y: p.y, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100-50, life: 0.5, col: p.col });
        }
        petals.splice(pi, 1);
        hit = true;
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 200 + Math.ceil(timeLeft) * 80); }, 600);
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

    // Wind
    windTimer += dt;
    wind = Math.sin(windTimer * 0.4) * 40 + Math.sin(windTimer * 0.9) * 20;

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnPetal();
      spawnInterval = Math.max(0.6, 1.2 - caught * 0.01);
      spawnTimer = spawnInterval + Math.random() * 0.3;
    }

    // Update petals
    for (var pi2 = petals.length - 1; pi2 >= 0; pi2--) {
      var p = petals[pi2];
      p.vx += (wind - p.vx) * dt * 0.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      p.wobble += dt * 3;

      // Bounce off walls
      if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > W - p.r) { p.x = W - p.r; p.vx = -Math.abs(p.vx) * 0.5; }

      // Landed on ground
      if (p.y > GROUND_Y) {
        dropped++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.2);
        petals.splice(pi2, 1);
        if (dropped >= MAX_DROP && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 150 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.6);

    // Cherry blossom tree (decorative)
    game.draw.rect(W*0.5 - 20, H*0.3, 40, H*0.6, C.tree, 0.8);
    game.draw.rect(W*0.5 - 10, H*0.15, 20, H*0.3, C.treeHi, 0.7);
    // Blossom clusters
    for (var bi = 0; bi < 5; bi++) {
      var bAng = (bi / 5) * Math.PI * 2;
      var bR = 80 + Math.random() * 30;
      var bx = W*0.5 + Math.cos(bAng) * bR;
      var by = H*0.22 + Math.sin(bAng) * bR * 0.4;
      game.draw.circle(bx, by, 60, C.petal0, 0.3);
      game.draw.circle(bx, by, 45, C.petal1, 0.25);
    }
    game.draw.circle(W*0.5, H*0.2, 90, C.petal0, 0.2);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.line(0, GROUND_Y, W, GROUND_Y, C.groundHi, 4);

    // Petals on ground (visual indicator of drops)
    for (var gi = 0; gi < Math.min(dropped, 5); gi++) {
      game.draw.circle(80 + gi * 100, GROUND_Y + 20, 16, C.petal1, 0.5);
    }

    // Falling petals
    for (var pi3 = 0; pi3 < petals.length; pi3++) {
      var pt = petals[pi3];
      var wsx = Math.sin(pt.wobble) * 8;
      var wsy = Math.cos(pt.wobble * 0.7) * 4;

      // Petal shape (ellipse)
      game.draw.circle(pt.x + wsx, pt.y + wsy, pt.r * 1.2, pt.col, 0.85);
      game.draw.circle(pt.x + wsx - pt.r * 0.3, pt.y + wsy - pt.r * 0.3, pt.r * 0.4, '#fff', 0.3);
      // Inner color
      game.draw.circle(pt.x + wsx, pt.y + wsy, pt.r * 0.5, C.petal4, 0.4);

      // Tap target ring
      var tDist = Math.min(1, (H - pt.y) / (H * 0.5));
      if (tDist > 0.2) {
        game.draw.circle(pt.x + wsx, pt.y + wsy, pt.r + 20, pt.col, tDist * 0.2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    // Drop counter
    game.draw.text('落とした: ' + dropped + '/' + MAX_DROP, W/2, H*0.9, { size: 40, color: dropped >= 7 ? C.wrong : C.ui });

    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.petal1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.4;
  });
})(game);
