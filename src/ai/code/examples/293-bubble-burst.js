// 293-bubble-burst.js
// バブルバースト — 大きな泡が小さく分裂する前に弾けさせる爽快感
// 操作: タップで泡を弾く（大→中→小→消える）
// 成功: 50個の小泡まで完全に消す  失敗: 画面が泡で埋まる(15個) or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#03020f',
    b3:     '#7c3aed',
    b3Hi:   '#c4b5fd',
    b2:     '#2563eb',
    b2Hi:   '#93c5fd',
    b1:     '#0891b2',
    b1Hi:   '#67e8f9',
    pop:    '#fde68a',
    popHi:  '#fef3c7',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var bubbles = [];
  var popped = 0;
  var NEEDED = 50;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];

  var SIZES = [
    { r: 55, col: C.b3, hi: C.b3Hi, splits: 2, next: 1 },
    { r: 34, col: C.b2, hi: C.b2Hi, splits: 2, next: 2 },
    { r: 20, col: C.b1, hi: C.b1Hi, splits: 0, next: -1 }
  ];

  function spawnBubble(x, y, sizeIdx, vx, vy) {
    var sz = SIZES[sizeIdx];
    bubbles.push({
      x: x || 100 + Math.random() * (W - 200),
      y: y || H * 0.85,
      vx: vx !== undefined ? vx : (Math.random() - 0.5) * 150,
      vy: vy !== undefined ? vy : -120 - Math.random() * 80,
      r: sz.r,
      sizeIdx: sizeIdx,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random()
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      var b = bubbles[bi];
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < (b.r + 12) * (b.r + 12)) {
        var sz = SIZES[b.sizeIdx];
        // Spawn children
        if (sz.splits > 0 && sz.next >= 0) {
          for (var s = 0; s < sz.splits; s++) {
            var ang = -Math.PI / 2 + (s / sz.splits) * Math.PI + (Math.random() - 0.5) * 0.4;
            spawnBubble(b.x, b.y, sz.next, Math.cos(ang) * 120, Math.sin(ang) * 120 - 80);
          }
        } else {
          // Final pop
          popped++;
        }
        // Pop particles
        for (var pi = 0; pi < 6; pi++) {
          var pang = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(pang) * 200, vy: Math.sin(pang) * 200, life: 0.4, col: sz.hi, r: 8 });
        }
        bubbles.splice(bi, 1);
        game.audio.play('se_success', 0.3);

        if (popped >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(popped * 40 + Math.ceil(timeLeft) * 80); }, 400);
        }
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

    // Too many bubbles
    if (bubbles.length >= 15 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done && bubbles.length < 8) {
      spawnBubble();
      spawnTimer = 1.5 + Math.random() * 1.0;
    }

    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      var b = bubbles[bi];
      b.wobble += b.wobbleSpeed * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 60 * dt; // gravity
      b.vx *= (1 - dt * 0.3);
      // Bounce off walls
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < H * 0.1) { b.y = H * 0.1 + b.r; b.vy = Math.abs(b.vy) * 0.7; }
      // Remove if sunk
      if (b.y > H + 80) bubbles.splice(bi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b2 = bubbles[bi2];
      var sz2 = SIZES[b2.sizeIdx];
      var pulse = b2.r + 3 * Math.sin(b2.wobble);
      game.draw.circle(b2.x, b2.y, pulse + 8, sz2.col, 0.15);
      game.draw.circle(b2.x, b2.y, pulse, sz2.col, 0.8);
      game.draw.circle(b2.x, b2.y, pulse, sz2.hi, 0.15);
      game.draw.circle(b2.x - pulse * 0.3, b2.y - pulse * 0.3, pulse * 0.2, '#fff', 0.4);
      // Size label
      var label = b2.sizeIdx === 0 ? 'L' : b2.sizeIdx === 1 ? 'M' : 'S';
      game.draw.text(label, b2.x, b2.y + 10, { size: 28, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r * p.life * 2.5, p.col, p.life * 0.8);
    }

    // Bubble count warning
    if (bubbles.length >= 10) {
      game.draw.text('⚠ 泡が多すぎる！', W / 2, H * 0.88, { size: 44, color: C.b3Hi, bold: true });
    }

    game.draw.text('泡をタップ: L→M→S→消', W / 2, H * 0.92, { size: 36, color: C.ui });
    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.b2 : C.b3);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnBubble();
    spawnBubble();
    spawnTimer = 1.5;
  });
})(game);
