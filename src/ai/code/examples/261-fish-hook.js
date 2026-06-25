// 261-fish-hook.js
// フィッシュフック — 水中を泳ぐ魚に釣り針を合わせてタイミングよく引き上げる
// 操作: タップで釣り針を下ろす/引き上げる
// 成功: 魚を10匹釣る  失敗: 3回空振り or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020510',
    sky:    '#0a1428',
    water:  '#0c2a4a',
    waterHi:'#1a4a7a',
    deep:   '#051020',
    hook:   '#94a3b8',
    hookHi: '#cbd5e1',
    line:   '#e2e8f0',
    fish:   '#f59e0b',
    fishHi: '#fde68a',
    fish2:  '#22c55e',
    fish3:  '#a855f7',
    wrong:  '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var WATER_Y = H * 0.35;
  var HOOK_X = W / 2;
  var hookY = WATER_Y - 40; // hook starts above water
  var hookTarget = hookY;
  var hookSpeed = 400;
  var hookState = 'UP'; // UP, DOWN, REELING
  var hookDepth = 0;
  var caughtFish = null;

  var fish = [];
  var caught = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var wavePhase = 0;
  var bubbles = [];

  var FISH_COLORS = [
    { body: C.fish, fin: C.fishHi, val: 1 },
    { body: C.fish2, fin: '#86efac', val: 2 },
    { body: C.fish3, fin: '#d8b4fe', val: 3 }
  ];

  function spawnFish() {
    var side = Math.random() < 0.5 ? 'left' : 'right';
    var fc = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
    fish.push({
      x: side === 'left' ? -80 : W + 80,
      y: WATER_Y + 60 + Math.random() * (H - WATER_Y - 200),
      vx: side === 'left' ? (80 + Math.random() * 80) : -(80 + Math.random() * 80),
      r: 28 + Math.random() * 16,
      col: fc,
      caught: false,
      wobble: Math.random() * Math.PI * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (hookState === 'UP') {
      // Cast line down
      hookTarget = WATER_Y + 60 + Math.random() * (H * 0.45);
      hookState = 'DOWN';
      game.audio.play('se_tap', 0.3);
    } else if (hookState === 'DOWN') {
      // Reel in
      hookState = 'REELING';
      hookTarget = WATER_Y - 40;
      // Check if any fish was caught
      var hooked = false;
      for (var fi = 0; fi < fish.length; fi++) {
        var f = fish[fi];
        if (f.caught) continue;
        var dx = HOOK_X - f.x, dy = hookY - f.y;
        if (dx * dx + dy * dy < (f.r + 20) * (f.r + 20)) {
          f.caught = true;
          caughtFish = fi;
          hooked = true;
          game.audio.play('se_success', 0.7);
          break;
        }
      }
      if (!hooked && hookY > WATER_Y) {
        // Was in water but missed
        misses++;
        feedback = '空振り！';
        feedbackCol = C.wrong;
        feedbackTimer = 0.6;
        game.audio.play('se_failure', 0.4);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    wavePhase += dt * 2;
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // Move hook
    if (hookY < hookTarget) hookY = Math.min(hookTarget, hookY + hookSpeed * dt);
    else if (hookY > hookTarget) hookY = Math.max(hookTarget, hookY - hookSpeed * dt);

    // If reeling and reached top
    if (hookState === 'REELING' && hookY <= WATER_Y - 30) {
      if (caughtFish !== null && fish[caughtFish]) {
        caught++;
        feedback = '釣れた！ ' + caught + '/' + NEEDED;
        feedbackCol = C.fishHi;
        feedbackTimer = 0.7;
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: HOOK_X, y: WATER_Y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6 });
        }
        fish.splice(caughtFish, 1);
        caughtFish = null;
        if (caught >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(caught * 150 + Math.ceil(timeLeft) * 80); }, 500);
          return;
        }
      }
      hookState = 'UP';
    }

    // Update caught fish position
    if (caughtFish !== null && fish[caughtFish]) {
      fish[caughtFish].x = HOOK_X;
      fish[caughtFish].y = hookY + 20;
    }

    // Move fish
    for (var fi2 = fish.length - 1; fi2 >= 0; fi2--) {
      var f2 = fish[fi2];
      if (f2.caught) continue;
      f2.x += f2.vx * dt;
      f2.wobble += dt * 3;
      f2.y += Math.sin(f2.wobble) * 0.5;
      if (f2.x < -120 || f2.x > W + 120) fish.splice(fi2, 1);
    }

    // Spawn fish
    if (fish.length < 5 && Math.random() < 0.02) spawnFish();

    // Bubbles
    if (Math.random() < 0.08) {
      bubbles.push({ x: Math.random() * W, y: H, r: 2 + Math.random() * 5, vy: -30 - Math.random() * 40, life: 2 });
    }
    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      bubbles[bi].y += bubbles[bi].vy * dt;
      bubbles[bi].x += Math.sin(elapsed * 2 + bi) * 10 * dt;
      bubbles[bi].life -= dt;
      if (bubbles[bi].y < WATER_Y || bubbles[bi].life <= 0) bubbles.splice(bi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, WATER_Y, C.sky);
    // Water
    game.draw.rect(0, WATER_Y, W, H - WATER_Y, C.water, 0.9);
    game.draw.rect(0, WATER_Y + H * 0.3, W, H - WATER_Y - H * 0.3, C.deep, 0.5);

    // Waves
    for (var xi = 0; xi < W; xi += 6) {
      var wy = WATER_Y + Math.sin(xi * 0.02 + wavePhase) * 8 + Math.sin(xi * 0.04 + wavePhase * 1.3) * 4;
      game.draw.rect(xi, wy, 6, 6, C.waterHi, 0.5);
    }

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b2 = bubbles[bi2];
      game.draw.circle(b2.x, b2.y, b2.r, C.waterHi, 0.3);
    }

    // Fish
    for (var fi3 = 0; fi3 < fish.length; fi3++) {
      var f3 = fish[fi3];
      var fc = f3.col;
      var dir = f3.vx > 0 ? 1 : -1;
      // Body
      game.draw.circle(f3.x, f3.y, f3.r, fc.body, 0.9);
      // Tail
      game.draw.circle(f3.x - dir * (f3.r + 10), f3.y, f3.r * 0.5, fc.body, 0.7);
      // Eye
      game.draw.circle(f3.x + dir * f3.r * 0.4, f3.y - f3.r * 0.2, 6, '#fff', 0.8);
      game.draw.circle(f3.x + dir * f3.r * 0.5, f3.y - f3.r * 0.2, 3, '#000', 0.9);
    }

    // Fishing line
    game.draw.line(HOOK_X, H * 0.22 - 20, HOOK_X, hookY, C.line, 2);

    // Hook
    game.draw.circle(HOOK_X, hookY, 10, C.hookHi, 0.9);
    game.draw.line(HOOK_X, hookY, HOOK_X + 14, hookY + 14, C.hook, 4);
    game.draw.line(HOOK_X + 14, hookY + 14, HOOK_X + 14, hookY, C.hook, 4);

    // Rod
    game.draw.line(W * 0.3, H * 0.2, HOOK_X, H * 0.22, C.hook, 6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.6), C.fishHi, p.life * 0.8);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.9, { size: 50, color: feedbackCol, bold: true });
    }

    // Instructions
    if (hookState === 'UP') game.draw.text('タップで投げ込む', W / 2, H * 0.25, { size: 36, color: C.ui });
    else if (hookState === 'DOWN') game.draw.text('タップで引き上げる！', W / 2, H * 0.25, { size: 36, color: C.fishHi, bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.95, 16, mi < misses ? C.wrong : '#050310');
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.fish2 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    for (var i = 0; i < 4; i++) spawnFish();
  });
})(game);
