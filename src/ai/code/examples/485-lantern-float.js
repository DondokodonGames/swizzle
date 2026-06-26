// 485-lantern-float.js
// ランタン浮遊 — 空に浮かぶランタンを触れると爆発する障害物から守りながら誘導
// 操作: タップした場所にランタンが引き寄せられる
// 成功: 高度2000m達成  失敗: ランタンが3回爆発 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050020',
    sky:    '#0a0035',
    lantern:'#f59e0b',
    lanternHi:'#fde68a',
    lanternGlo:'#fef3c7',
    flame:  '#ef4444',
    star:   '#e2e8f0',
    hazard: '#ef4444',
    hazardHi:'#fca5a5',
    cloud:  '#1e3a5f',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    altitude:'#60a5fa'
  };

  var lantern = { x: W / 2, y: H * 0.7, vx: 0, vy: -30, r: 40 };
  var hazards = [];
  var stars = [];
  var clouds = [];
  var altitude = 0;
  var GOAL = 2000;
  var explosions = 0;
  var MAX_EXPLODE = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var nextHazard = 1.5;
  var particles = [];
  var touchX = W / 2;
  var touchY = H * 0.5;
  var isTouching = false;
  var flashAnim = 0;
  var invincibleTimer = 0;

  // Generate stars
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.5, twinkle: Math.random() * Math.PI * 2 });
  }

  function spawnHazard() {
    var side = Math.floor(Math.random() * 3); // 0=top, 1=left, 2=right
    var x, y, vx, vy;
    var spd = 150 + Math.random() * 120 + altitude * 0.05;
    if (side === 0) {
      x = 80 + Math.random() * (W - 160);
      y = -60;
      vx = (Math.random() - 0.5) * spd * 0.5;
      vy = spd * 0.6 + Math.random() * spd * 0.4;
    } else if (side === 1) {
      x = -60;
      y = Math.random() * H * 0.8;
      vx = spd;
      vy = (Math.random() - 0.5) * spd * 0.4;
    } else {
      x = W + 60;
      y = Math.random() * H * 0.8;
      vx = -spd;
      vy = (Math.random() - 0.5) * spd * 0.4;
    }
    hazards.push({
      x: x, y: y, vx: vx, vy: vy,
      r: 28 + Math.random() * 22,
      col: C.hazard,
      life: 6
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    touchX = tx;
    touchY = ty;
    isTouching = true;
  });

  game.onHold(function(tx, ty, duration) {
    if (done) return;
    touchX = tx;
    touchY = ty;
    isTouching = true;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      altitude += 30 * dt + Math.max(0, (H * 0.5 - lantern.y) / H) * 50 * dt;
      if (altitude >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(altitude) * 10 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincibleTimer > 0) invincibleTimer -= dt;

    // Lantern movement — drift toward touch point
    if (isTouching) {
      var dx = touchX - lantern.x;
      var dy = touchY - lantern.y;
      lantern.vx += dx * 2 * dt;
      lantern.vy += dy * 2 * dt;
      isTouching = false;
    }

    // Buoyancy (upward drift)
    lantern.vy -= 60 * dt;
    // Damping
    lantern.vx *= 0.96;
    lantern.vy *= 0.97;
    // Speed limit
    var spd2 = Math.sqrt(lantern.vx * lantern.vx + lantern.vy * lantern.vy);
    if (spd2 > 500) { lantern.vx = lantern.vx / spd2 * 500; lantern.vy = lantern.vy / spd2 * 500; }

    lantern.x += lantern.vx * dt;
    lantern.y += lantern.vy * dt;

    // Bounce off sides
    if (lantern.x < lantern.r + 30) { lantern.x = lantern.r + 30; lantern.vx = Math.abs(lantern.vx) * 0.7; }
    if (lantern.x > W - lantern.r - 30) { lantern.x = W - lantern.r - 30; lantern.vx = -Math.abs(lantern.vx) * 0.7; }
    if (lantern.y > H - lantern.r - 40) { lantern.y = H - lantern.r - 40; lantern.vy = -Math.abs(lantern.vy) * 0.7; }
    if (lantern.y < lantern.r + 80) { lantern.y = lantern.r + 80; lantern.vy = Math.abs(lantern.vy) * 0.5; }

    // Spawn hazards
    nextHazard -= dt;
    if (nextHazard <= 0 && !done) {
      spawnHazard();
      nextHazard = 0.6 + Math.random() * 0.9;
    }

    // Move hazards
    for (var hi = hazards.length - 1; hi >= 0; hi--) {
      var h = hazards[hi];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.life -= dt;

      // Collision with lantern
      if (invincibleTimer <= 0) {
        var dx2 = lantern.x - h.x;
        var dy2 = lantern.y - h.y;
        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < lantern.r + h.r - 10) {
          explosions++;
          flashAnim = 0.6;
          invincibleTimer = 1.5;
          game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 14; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: lantern.x, y: lantern.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.7, col: C.flame });
          }
          hazards.splice(hi, 1);
          if (explosions >= MAX_EXPLODE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
          continue;
        }
      }

      if (h.x < -100 || h.x > W + 100 || h.y > H + 100 || h.life <= 0) {
        hazards.splice(hi, 1);
        continue;
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.5);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      var tw = Math.sin(elapsed * 1.5 + s.twinkle) * 0.3 + 0.7;
      game.draw.circle(s.x, s.y, s.r, C.star, tw * 0.7);
    }

    // Hazards
    for (var hi2 = 0; hi2 < hazards.length; hi2++) {
      var h2 = hazards[hi2];
      var pulse = Math.sin(elapsed * 8 + hi2) * 0.1 + 0.9;
      game.draw.circle(h2.x, h2.y, h2.r + 10, C.hazardHi, 0.15 * pulse);
      game.draw.circle(h2.x, h2.y, h2.r, C.hazard, 0.85);
      game.draw.circle(h2.x, h2.y, h2.r * 0.45, C.hazardHi, 0.5);
      // Spikes visual
      for (var sk = 0; sk < 6; sk++) {
        var ska = (sk / 6) * Math.PI * 2 + elapsed * 2;
        game.draw.line(h2.x + Math.cos(ska) * h2.r, h2.y + Math.sin(ska) * h2.r,
                       h2.x + Math.cos(ska) * (h2.r + 16), h2.y + Math.sin(ska) * (h2.r + 16), C.hazardHi, 4);
      }
    }

    // Lantern
    var invBlink = invincibleTimer > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 1;
    if (invBlink > 0.3) {
      game.draw.circle(lantern.x, lantern.y, lantern.r + 20, C.lanternGlo, 0.15);
      game.draw.circle(lantern.x, lantern.y, lantern.r + 8, C.lanternHi, 0.3);
      game.draw.rect(lantern.x - lantern.r * 0.7, lantern.y - lantern.r * 0.8, lantern.r * 1.4, lantern.r * 1.6, C.lantern, 0.9);
      game.draw.circle(lantern.x, lantern.y, lantern.r * 0.5, C.lanternHi, 0.6);
      // Flame
      game.draw.circle(lantern.x, lantern.y - lantern.r * 0.5, 18 + Math.sin(elapsed * 10) * 4, C.flame, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.flame, flashAnim * 0.12);

    // Altitude bar
    var altRatio = Math.min(1, altitude / GOAL);
    game.draw.rect(W - 60, 80, 40, H * 0.75, C.ui, 0.3);
    game.draw.rect(W - 60, 80 + H * 0.75 * (1 - altRatio), 40, H * 0.75 * altRatio, C.altitude, 0.8);
    game.draw.text(Math.floor(altitude) + 'm', W - 40, H * 0.86, { size: 32, color: C.altitude });

    // Explosion dots
    for (var ei = 0; ei < MAX_EXPLODE; ei++) {
      game.draw.circle(W * 0.14 + ei * (W * 0.72 / (MAX_EXPLODE - 1)), H * 0.955, 22, ei < explosions ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(Math.floor(altitude) + ' / ' + GOAL + 'm', W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio2, 72, ratio2 > 0.3 ? C.lantern : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
