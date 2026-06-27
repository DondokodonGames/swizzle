// 601-gem-burst.js
// ジェムバースト — 落ちてくる宝石を素早くタップして砕く爽快感ゲーム
// 操作: タップで宝石を砕く、同色3連続でコンボ！
// 成功: 40個砕く  失敗: 10個落とす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030008',
    text:    '#f1f5f9',
    ui:      '#1a1a2e',
    combo:   '#ffdd00',
    comboHi: '#ffffff',
    miss:    '#ef4444'
  };

  var GEM_COLORS = [
    { main: '#ff3366', hi: '#ff99bb', glow: '#ff006644' },
    { main: '#3388ff', hi: '#88bbff', glow: '#0055ff44' },
    { main: '#33ff88', hi: '#88ffcc', glow: '#00ff6644' },
    { main: '#ffaa00', hi: '#ffdd88', glow: '#ff880044' },
    { main: '#cc33ff', hi: '#ee99ff', glow: '#8800ff44' }
  ];

  var gems = [];
  var shattered = 0;
  var NEEDED = 40;
  var dropped = 0;
  var MAX_DROP = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = '#ffdd00';
  var comboCount = 0;
  var lastGemColor = -1;
  var comboTimer = 0;
  var nextGem = 0.5;
  var difficulty = 1;

  function spawnGem() {
    var col = Math.floor(Math.random() * GEM_COLORS.length);
    var size = 48 + Math.random() * 24;
    gems.push({
      x: 80 + Math.random() * (W - 160),
      y: -size,
      vy: 180 + difficulty * 30 + Math.random() * 60,
      r: size,
      colorIdx: col,
      phase: Math.random() * Math.PI * 2,
      shatter: false,
      shatterTimer: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var gi = gems.length - 1; gi >= 0; gi--) {
      var g = gems[gi];
      if (g.shatter) continue;
      var dx = tx - g.x, dy = ty - g.y;
      if (dx * dx + dy * dy < (g.r + 20) * (g.r + 20)) {
        g.shatter = true;
        g.shatterTimer = 0;
        shattered++;
        var gc = GEM_COLORS[g.colorIdx];

        // Combo check
        if (g.colorIdx === lastGemColor) {
          comboCount++;
          comboTimer = 1.2;
        } else {
          comboCount = 1;
          lastGemColor = g.colorIdx;
          comboTimer = 1.2;
        }

        // Burst particles
        var burstCount = comboCount >= 3 ? 16 : 10;
        for (var pi = 0; pi < burstCount; pi++) {
          var ang = Math.random() * Math.PI * 2;
          var speed = 150 + Math.random() * 200;
          particles.push({ x: g.x, y: g.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - 100, life: 0.6, col: gc.hi, size: 12 });
        }

        if (comboCount >= 3) {
          flashCol = C.combo;
          flashAnim = 0.3;
          game.audio.play('se_success', 0.8);
        } else {
          game.audio.play('se_success', 0.4);
        }

        if (shattered >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(shattered * 80 + comboCount * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
        hit = true;
        break;
      }
    }
    if (!hit) {
      comboCount = 0;
      lastGemColor = -1;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      difficulty = 1 + elapsed / 10;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (comboTimer > 0) comboTimer -= dt;

    // Spawn gems
    nextGem -= dt;
    if (nextGem <= 0 && !done) {
      spawnGem();
      nextGem = Math.max(0.25, 0.7 - elapsed * 0.01);
    }

    // Update gems
    for (var gi = gems.length - 1; gi >= 0; gi--) {
      var g = gems[gi];
      g.phase += dt * 3;

      if (g.shatter) {
        g.shatterTimer += dt;
        if (g.shatterTimer > 0.3) gems.splice(gi, 1);
        continue;
      }

      g.y += g.vy * dt;

      if (g.y > H + g.r + 20) {
        gems.splice(gi, 1);
        dropped++;
        flashCol = C.miss;
        flashAnim = 0.2;
        comboCount = 0;
        lastGemColor = -1;
        game.audio.play('se_failure', 0.2);
        if (dropped >= MAX_DROP && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Gems
    for (var gi2 = 0; gi2 < gems.length; gi2++) {
      var g2 = gems[gi2];
      var gc2 = GEM_COLORS[g2.colorIdx];
      var pulse = 1 + Math.sin(g2.phase) * 0.06;

      if (g2.shatter) {
        var sa = 1 - g2.shatterTimer / 0.3;
        for (var si = 0; si < 6; si++) {
          var fAng = si / 6 * Math.PI * 2 + g2.phase;
          var fX = g2.x + Math.cos(fAng) * g2.r * 0.6 * (1 - sa);
          var fY = g2.y + Math.sin(fAng) * g2.r * 0.6 * (1 - sa);
          game.draw.circle(fX, fY, g2.r * 0.3 * sa, gc2.main, sa * 0.8);
        }
        continue;
      }

      // Glow
      game.draw.circle(g2.x, g2.y, g2.r * pulse * 1.4, gc2.main, 0.12);
      // Diamond shape approximated with layered circles
      game.draw.circle(g2.x, g2.y, g2.r * pulse, gc2.main, 0.85);
      game.draw.circle(g2.x, g2.y - g2.r * 0.2, g2.r * pulse * 0.7, gc2.hi, 0.4);
      game.draw.circle(g2.x - g2.r * 0.25, g2.y - g2.r * 0.25, g2.r * 0.25, '#ffffff', 0.5);
      // Inner facet
      game.draw.circle(g2.x, g2.y, g2.r * pulse * 0.45, gc2.hi, 0.25);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, (p.size || 12) * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Combo display
    if (comboTimer > 0 && comboCount >= 2) {
      var comboAlpha = Math.min(1, comboTimer);
      game.draw.text(comboCount + 'x COMBO!', W / 2, H * 0.85, { size: 60 + comboCount * 4, color: C.combo, bold: true });
    }

    // Drop dots
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W / 2 - (MAX_DROP - 1) * 38 + di * 76, H * 0.955, 16, di < dropped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(shattered + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? GEM_COLORS[0].main : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnGem();
    spawnGem();
  });
})(game);
