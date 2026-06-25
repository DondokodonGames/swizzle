// 270-chain-reaction.js
// チェーンリアクション — 1個のタップが連鎖爆発を引き起こす快感
// 操作: タップで爆発を起こし、隣接する泡を巻き込む連鎖を狙う
// 成功: 60個の泡を消す  失敗: 15タップ使い切る or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#03010a',
    bub1:   '#7c3aed',
    bub2:   '#2563eb',
    bub3:   '#dc2626',
    bub4:   '#d97706',
    bubHi:  '#e2e8f0',
    boom:   '#fde68a',
    boomHi: '#fef3c7',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var BUB_COLORS = [C.bub1, C.bub2, C.bub3, C.bub4];
  var bubbles = [];
  var explosions = [];
  var popped = 0;
  var NEEDED = 60;
  var tapsLeft = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var chainCount = 0;
  var bestChain = 0;
  var chainTimer = 0;
  var particles = [];

  function spawnBubbles() {
    for (var i = 0; i < 45; i++) {
      bubbles.push({
        x: 80 + Math.random() * (W - 160),
        y: H * 0.18 + Math.random() * (H * 0.68),
        r: 30 + Math.random() * 30,
        col: BUB_COLORS[Math.floor(Math.random() * BUB_COLORS.length)],
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        wobble: Math.random() * Math.PI * 2,
        exploding: false,
        explodeTimer: 0
      });
    }
  }

  function triggerExplosion(x, y, r, fromChain) {
    explosions.push({ x: x, y: y, r: 0, maxR: r * 2.5, speed: r * 5, done: false });
    popped++;
    if (fromChain) {
      chainCount++;
      if (chainCount > bestChain) bestChain = chainCount;
    } else {
      chainCount = 1;
    }
    chainTimer = 0.5;
    for (var pi = 0; pi < 5; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: x, y: y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.4, r: 8 + Math.random() * 8 });
    }
    game.audio.play('se_success', 0.3);
  }

  game.onTap(function(tx, ty) {
    if (done || tapsLeft <= 0) return;

    // Find closest bubble
    var closest = null, minD = 80;
    for (var i = 0; i < bubbles.length; i++) {
      if (bubbles[i].exploding) continue;
      var dx = tx - bubbles[i].x, dy = ty - bubbles[i].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bubbles[i].r + 30 && d < minD) { minD = d; closest = i; }
    }
    if (closest === null) return;
    tapsLeft--;
    bubbles[closest].exploding = true;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (chainTimer > 0) chainTimer -= dt;
    else chainCount = 0;

    // Move bubbles
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi];
      if (b.exploding) {
        b.explodeTimer += dt;
        if (b.explodeTimer < 0.05) continue; // brief delay before blast
        if (!b.fired) {
          b.fired = true;
          triggerExplosion(b.x, b.y, b.r, false);
        }
        continue;
      }
      b.wobble += dt * 1.5;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x - b.r < 60) { b.x = 60 + b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W - 60) { b.x = W - 60 - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < H * 0.17) { b.y = H * 0.17 + b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > H * 0.86) { b.y = H * 0.86 - b.r; b.vy = -Math.abs(b.vy); }
    }

    // Chain explosions
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var exp = explosions[ei];
      exp.r += exp.speed * dt;
      if (exp.r >= exp.maxR) { exp.done = true; explosions.splice(ei, 1); continue; }

      // Check if blast catches other bubbles
      for (var bi2 = bubbles.length - 1; bi2 >= 0; bi2--) {
        var b2 = bubbles[bi2];
        if (b2.exploding) continue;
        var dx = b2.x - exp.x, dy = b2.y - exp.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < exp.r + b2.r * 0.5) {
          b2.exploding = true;
          triggerExplosion(b2.x, b2.y, b2.r, true);
          bubbles.splice(bi2, 1);
        }
      }
    }

    // Remove fired exploding bubbles
    for (var bi3 = bubbles.length - 1; bi3 >= 0; bi3--) {
      if (bubbles[bi3].exploding && bubbles[bi3].fired) bubbles.splice(bi3, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    if (popped >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(popped * 30 + tapsLeft * 200 + bestChain * 100); }, 400);
    }
    if (tapsLeft <= 0 && explosions.length === 0 && bubbles.every(function(b) { return !b.exploding; }) && !done) {
      setTimeout(function() {
        if (!done) { done = true; game.audio.play('se_failure'); game.end.failure(); }
      }, 600);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bubbles
    for (var bi4 = 0; bi4 < bubbles.length; bi4++) {
      var b4 = bubbles[bi4];
      if (b4.exploding) continue;
      var pulse = 1 + 0.05 * Math.sin(b4.wobble);
      var r4 = b4.r * pulse;
      game.draw.circle(b4.x, b4.y, r4, b4.col, 0.75);
      game.draw.circle(b4.x, b4.y, r4, C.bubHi, 0.15);
      game.draw.circle(b4.x - r4 * 0.3, b4.y - r4 * 0.3, r4 * 0.2, C.bubHi, 0.5);
    }

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex = explosions[ei2];
      var a5 = 1 - ex.r / ex.maxR;
      game.draw.circle(ex.x, ex.y, ex.r, C.boom, a5 * 0.6);
      game.draw.circle(ex.x, ex.y, ex.r * 0.6, C.boomHi, a5 * 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r * p.life * 2.5, C.boom, p.life * 0.8);
    }

    // Chain indicator
    if (chainTimer > 0 && chainCount > 1) {
      game.draw.text(chainCount + '連鎖!', W / 2, H * 0.86, { size: 54, color: C.boomHi, bold: true });
    }

    game.draw.text('タップ残り: ' + tapsLeft, W * 0.5, H * 0.91, { size: 40, color: C.ui });
    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bub1 : C.bub3);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnBubbles();
  });
})(game);
