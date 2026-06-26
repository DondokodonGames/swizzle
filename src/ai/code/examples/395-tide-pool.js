// 395-tide-pool.js
// タイドプール — 満ち潮に流されるヒトデを岩の上に救出する
// 操作: ヒトデをタップして岩の上に移動
// 成功: 8個救出  失敗: 5個流される or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1628',
    ocean:  '#1e3a5f',
    oceanHi:'#2563eb',
    wave:   '#3b82f6',
    rock:   '#374151',
    rockHi: '#4b5563',
    sand:   '#92400e',
    sandHi: '#b45309',
    star:   '#f97316',
    starHi: '#fed7aa',
    saved:  '#22c55e',
    lost:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var WATER_Y = H * 0.7;  // rising water level
  var waterLevel = WATER_Y;
  var RISE_SPEED = 12;    // pixels per second

  // Rocks (safe zones)
  var rocks = [
    { x: W*0.18, y: H*0.58, w: 180, h: 80 },
    { x: W*0.52, y: H*0.52, w: 160, h: 90 },
    { x: W*0.82, y: H*0.60, w: 170, h: 75 }
  ];

  // Starfish
  var starfish = [];
  var nextSpawn = 1.0;

  function spawnStar() {
    starfish.push({
      x: 80 + Math.random()*(W-160),
      y: H*0.75 + Math.random()*H*0.1,
      vx: (Math.random()-0.5)*40,
      vy: 0,
      r: 38,
      angle: Math.random()*Math.PI*2,
      onRock: false,
      saved: false
    });
  }

  var saved = 0;
  var lost = 0;
  var NEEDED = 8;
  var MAX_LOST = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var selected = null;
  var wavePhase = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    // If star selected, place it on nearest rock
    if (selected !== null) {
      var s = selected;
      // Check if tap is near a rock
      for (var ri = 0; ri < rocks.length; ri++) {
        var r = rocks[ri];
        if (tx > r.x - r.w/2 && tx < r.x + r.w/2 && ty > r.y - r.h && ty < r.y + 20) {
          s.x = r.x + (Math.random()-0.5)*(r.w-60);
          s.y = r.y - r.h/2 - 10;
          s.vx = 0; s.vy = 0;
          s.onRock = true;
          s.saved = true;
          saved++;
          game.audio.play('se_success', 0.4);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random()*Math.PI*2;
            particles.push({ x:s.x, y:s.y, vx:Math.cos(ang)*150, vy:Math.sin(ang)*150, life:0.6, col:C.saved });
          }
          if (saved >= NEEDED && !done) {
            done = true;
            setTimeout(function(){ game.end.success(saved*400+Math.ceil(timeLeft)*80); }, 600);
          }
          selected = null;
          return;
        }
      }
      selected = null;
      return;
    }
    // Pick up a starfish
    for (var i = starfish.length-1; i >= 0; i--) {
      var sf = starfish[i];
      if (!sf.saved && Math.hypot(tx-sf.x, ty-sf.y) < sf.r+20) {
        selected = sf;
        game.audio.play('se_tap', 0.3);
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

    wavePhase += dt * 1.8;
    if (!done) waterLevel -= RISE_SPEED * dt;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnStar();
      nextSpawn = 2.5 + Math.random()*2;
    }

    // Update starfish
    for (var i = starfish.length-1; i >= 0; i--) {
      var sf2 = starfish[i];
      if (sf2.saved) continue;
      sf2.x += sf2.vx*dt;
      sf2.angle += 0.5*dt;

      // Water carries them
      if (sf2.y > waterLevel) {
        sf2.vx += (Math.random()-0.3)*20*dt;
        sf2.vx = Math.max(-80, Math.min(80, sf2.vx));
      }

      // Off sides
      if (sf2.x < -sf2.r*2 || sf2.x > W+sf2.r*2) {
        lost++;
        game.audio.play('se_failure', 0.3);
        starfish.splice(i, 1);
        if (lost >= MAX_LOST && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 400); }
        continue;
      }

      // Off bottom
      if (sf2.y > H + 60) {
        lost++;
        starfish.splice(i, 1);
        if (lost >= MAX_LOST && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 400); }
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sand bottom
    game.draw.rect(0, H*0.82, W, H*0.18, C.sand, 0.8);
    game.draw.rect(0, H*0.82, W, 20, C.sandHi, 0.4);

    // Water
    game.draw.rect(0, waterLevel, W, H - waterLevel, C.ocean, 0.85);
    // Wave top
    for (var wx = 0; wx < W; wx += 80) {
      var wy = waterLevel + Math.sin(wavePhase + wx*0.008)*18;
      game.draw.circle(wx+40, wy, 40, C.wave, 0.25);
    }

    // Rocks
    for (var ri2 = 0; ri2 < rocks.length; ri2++) {
      var rk = rocks[ri2];
      game.draw.rect(rk.x-rk.w/2-8, rk.y-rk.h-8, rk.w+16, rk.h+16, C.rock, 0.6);
      game.draw.rect(rk.x-rk.w/2, rk.y-rk.h, rk.w, rk.h, C.rockHi, 0.9);
    }

    // Starfish (draw water-covered ones faded)
    for (var i2 = 0; i2 < starfish.length; i2++) {
      var sf3 = starfish[i2];
      var inWater = sf3.y > waterLevel;
      var alpha = sf3.saved ? 0.5 : (inWater ? 0.4 : 0.9);
      var col = sf3.saved ? C.saved : C.star;
      var isSelected = (sf3 === selected);

      // Draw 5-pointed star shape using lines
      if (isSelected) game.draw.circle(sf3.x, sf3.y, sf3.r+14, C.starHi, 0.3);
      game.draw.circle(sf3.x, sf3.y, sf3.r, col, alpha);
      // Star points
      for (var sp = 0; sp < 5; sp++) {
        var ang2 = sf3.angle + sp*Math.PI*2/5;
        var px = sf3.x + Math.cos(ang2)*sf3.r*0.9;
        var py = sf3.y + Math.sin(ang2)*sf3.r*0.9;
        game.draw.circle(px, py, 12, col, alpha);
      }
      game.draw.circle(sf3.x, sf3.y, 18, C.starHi, alpha*0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.9);
    }

    // Instructions
    if (selected) {
      game.draw.text('岩をタップして置く', W/2, H*0.91, { size: 40, color: C.starHi, bold: true });
    } else {
      game.draw.text('ヒトデをタップ→岩の上に置く', W/2, H*0.91, { size: 36, color: C.ui });
    }

    // Water level warning
    if (waterLevel < H*0.45) {
      game.draw.text('水位上昇中！', W/2, H*0.5, { size: 48, color: C.lost, bold: true });
    }

    // Lost dots
    for (var li = 0; li < MAX_LOST; li++) {
      game.draw.circle(W/2-(MAX_LOST-1)*30+li*60, H*0.935, 12, li < lost ? C.lost : C.ui, 0.9);
    }

    game.draw.text(saved + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.wave : C.lost);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    waterLevel = WATER_Y;
  });
})(game);
