// 595-shimmer-catch.js
// シマーキャッチ — 水面の揺らぎに隠れた魚の影をタイミングよく掴む
// 操作: タップで狙った位置に網を投げる
// 成功: 15匹捕獲  失敗: 10回空振り or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000510',
    sky:     '#001020',
    water:   '#001830',
    waterHi: '#002848',
    shimmer: '#0055aa',
    shimHi:  '#0088ff',
    fish:    '#ff8822',
    fishHi:  '#ffaa55',
    net:     '#aacc88',
    netHi:   '#ddeebb',
    caught:  '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a1a2a'
  };

  var WATER_Y = H * 0.3;
  var fishes = [];
  var netAnim = null; // { x, y, r, timer, hit }
  var caught = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.caught;
  var shimmerWaves = [];
  var nextFish = 1.0;
  var resultText = '';
  var resultTimer = 0;

  function spawnFish() {
    var side = Math.random() < 0.5 ? -1 : 1;
    var x = side < 0 ? -60 : W + 60;
    var y = WATER_Y + 60 + Math.random() * (H - WATER_Y - 180);
    var speed = 100 + Math.random() * 80;
    fishes.push({
      x: x, y: y,
      vx: side * speed,
      vy: (Math.random() - 0.5) * 40,
      r: 28 + Math.random() * 14,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 3,
      visible: false, // shimmer shows position approximately
      phase: Math.random() * Math.PI * 2,
      shimmerX: 0, shimmerY: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (netAnim) return; // net in flight

    // Cast net toward tap position
    netAnim = { x: tx, y: ty, r: 0, timer: 0.5, hit: false };
    game.audio.play('se_tap', 0.3);

    // Check hit on fishes
    var hitFish = -1;
    for (var fi = 0; fi < fishes.length; fi++) {
      var f = fishes[fi];
      var dx = tx - f.shimmerX, dy = ty - f.shimmerY;
      if (dx * dx + dy * dy < (f.r + 50) * (f.r + 50)) {
        hitFish = fi;
        break;
      }
    }

    if (hitFish >= 0) {
      var f2 = fishes[hitFish];
      netAnim.hit = true;
      caught++;
      flashCol = C.caught;
      flashAnim = 0.2;
      resultText = 'つかまえた!';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: f2.shimmerX, y: f2.shimmerY, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.fishHi });
      }
      // Splash ripple
      shimmerWaves.push({ x: f2.shimmerX, y: f2.shimmerY, r: 0, maxR: 80, alpha: 0.6 });
      fishes.splice(hitFish, 1);
      if (caught >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(caught * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      misses++;
      flashCol = C.miss;
      flashAnim = 0.2;
      resultText = 'はずれ...';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.25);
      shimmerWaves.push({ x: tx, y: ty, r: 0, maxR: 50, alpha: 0.3 });
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (resultTimer > 0) resultTimer -= dt;

    // Spawn fish
    nextFish -= dt;
    if (nextFish <= 0) {
      if (fishes.length < 4) spawnFish();
      nextFish = 0.8 + Math.random() * 0.8;
    }

    // Update fishes
    for (var fi = fishes.length - 1; fi >= 0; fi--) {
      var f = fishes[fi];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.wobble += f.wobbleSpeed * dt;
      f.phase += dt * 2;

      // Shimmer position = fish pos + random offset (makes it hard to pinpoint)
      var shimmerOffset = 20 + Math.sin(f.phase) * 15;
      f.shimmerX = f.x + Math.sin(f.phase * 1.7) * shimmerOffset;
      f.shimmerY = f.y + Math.cos(f.phase * 2.3) * shimmerOffset * 0.5;

      // Bounce off water floor/ceiling
      if (f.y < WATER_Y + f.r) { f.y = WATER_Y + f.r; f.vy = Math.abs(f.vy); }
      if (f.y > H - 100 - f.r) { f.y = H - 100 - f.r; f.vy = -Math.abs(f.vy); }

      // Remove if off screen horizontally
      if (f.x < -120 || f.x > W + 120) fishes.splice(fi, 1);
    }

    // Net animation
    if (netAnim) {
      netAnim.timer -= dt;
      netAnim.r = (1 - netAnim.timer / 0.5) * 80;
      if (netAnim.timer <= 0) netAnim = null;
    }

    // Shimmer waves
    for (var wi = shimmerWaves.length - 1; wi >= 0; wi--) {
      shimmerWaves[wi].r += 150 * dt;
      shimmerWaves[wi].alpha -= dt * 2.5;
      if (shimmerWaves[wi].alpha <= 0) shimmerWaves.splice(wi, 1);
    }

    // Ambient shimmer
    if (Math.random() < 0.3) {
      shimmerWaves.push({
        x: Math.random() * W,
        y: WATER_Y + Math.random() * (H - WATER_Y - 100),
        r: 0, maxR: 40, alpha: 0.15
      });
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky
    game.draw.rect(0, 0, W, WATER_Y, C.sky, 0.8);

    // Water
    game.draw.rect(0, WATER_Y, W, H - WATER_Y, C.water, 0.9);

    // Water surface ripples
    for (var si = 0; si < 6; si++) {
      var lineY = WATER_Y + si * 4;
      var lineAlpha = 0.3 - si * 0.04;
      game.draw.rect(0, lineY, W, 2, C.shimHi, lineAlpha);
    }
    // Caustics
    for (var ci = 0; ci < 8; ci++) {
      var lx = (ci * 160 + Math.sin(elapsed * 1.2 + ci) * 40) % W;
      var ly = WATER_Y + 10;
      game.draw.line(lx, ly, lx + 30, ly + Math.random() * 60 + 20, C.shimHi, 1);
    }

    // Shimmer waves
    for (var wi2 = 0; wi2 < shimmerWaves.length; wi2++) {
      var sw = shimmerWaves[wi2];
      game.draw.circle(sw.x, sw.y, sw.r, C.shimHi, sw.alpha);
    }

    // Fish shimmer indicators (hint at position but distorted)
    for (var fi2 = 0; fi2 < fishes.length; fi2++) {
      var f2 = fishes[fi2];
      if (f2.shimmerX < 0 || f2.shimmerX > W) continue;
      var shimA = 0.3 + Math.sin(f2.phase * 3) * 0.15;
      game.draw.circle(f2.shimmerX, f2.shimmerY, f2.r * 1.4, C.shimmer, shimA * 0.5);
      game.draw.circle(f2.shimmerX, f2.shimmerY, f2.r * 0.7, C.shimHi, shimA * 0.3);
    }

    // Net
    if (netAnim) {
      var netA = netAnim.timer / 0.5;
      game.draw.circle(netAnim.x, netAnim.y, netAnim.r, netAnim.hit ? C.caught : C.net, netA * 0.5);
      game.draw.circle(netAnim.x, netAnim.y, netAnim.r * 0.6, netAnim.hit ? C.caught : C.netHi, netA * 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 38 + mi * 76, H * 0.955, 16, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.shimHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnFish();
    spawnFish();
  });
})(game);
