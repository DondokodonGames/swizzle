// 493-bubble-pop.js
// バブルポップ — 大きくなったシャボン玉をジャストタイミングで割る
// 操作: バブルが最大サイズに近づいたらタップで割る
// 成功: 20個割る  失敗: 5個割れずに飛んでいく or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020818',
    sky:    '#041028',
    bubble: '#7dd3fc',
    bubbleHi:'#e0f2fe',
    bubbleRim:'#0ea5e9',
    pop:    '#f0f9ff',
    danger: '#ef4444',
    safe:   '#22c55e',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var bubbles = [];
  var particles = [];
  var popped = 0;
  var NEEDED = 20;
  var escaped = 0;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var nextSpawn = 1.5;
  var spawnInterval = 1.5;

  function spawnBubble() {
    var x = 120 + Math.random() * (W - 240);
    var startY = H * 0.85;
    var maxR = 60 + Math.random() * 80;
    bubbles.push({
      x: x,
      y: startY,
      r: 8,
      maxR: maxR,
      growing: true,
      growRate: 30 + Math.random() * 30,
      floatVy: -(30 + Math.random() * 40),
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random() * 2,
      wobbleAmp: 15 + Math.random() * 20,
      shimmer: Math.random() * Math.PI * 2,
      life: 1.0,
      popping: false,
      popTimer: 0
    });
  }

  function tryPop(tx, ty) {
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      if (b.popping) continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) {
        b.popping = true;
        b.popTimer = 0.3;
        var ratio = b.r / b.maxR;
        if (ratio >= 0.75) {
          popped++;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var spd = 100 + Math.random() * 200;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.5, r: 8 + Math.random() * 8, col: C.bubbleHi });
          }
        } else {
          game.audio.play('se_tap', 0.3);
          for (var pi2 = 0; pi2 < 6; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang2) * 80, vy: Math.sin(ang2) * 80, life: 0.3, r: 4, col: C.bubble });
          }
        }
        return;
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    tryPop(tx, ty);
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

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnBubble();
      spawnInterval = Math.max(0.8, spawnInterval - 0.03);
      nextSpawn = spawnInterval;
    }

    // Update bubbles
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.wobble += b.wobbleSpeed * dt;
      b.shimmer += 3 * dt;
      b.x += Math.sin(b.wobble) * b.wobbleAmp * dt;

      if (b.popping) {
        b.r *= (1 + dt * 5);
        b.popTimer -= dt;
        if (b.popTimer <= 0) bubbles.splice(i, 1);
        continue;
      }

      if (b.growing) {
        b.r += b.growRate * dt;
        if (b.r >= b.maxR) {
          b.r = b.maxR;
          b.growing = false;
        }
      } else {
        // Float upward
        b.y += b.floatVy * dt;
        if (b.y + b.r < -20) {
          escaped++;
          bubbles.splice(i, 1);
          game.audio.play('se_failure', 0.3);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
      }
    }

    if (popped >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(popped * 200 + Math.ceil(timeLeft) * 100); }, 700);
      return;
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

    // Background gradient hint
    for (var gi = 0; gi < 4; gi++) {
      game.draw.rect(0, H * 0.7 + gi * H * 0.08, W, H * 0.08, C.sky, 0.2 - gi * 0.04);
    }

    // Bubbles
    for (var bi = 0; bi < bubbles.length; bi++) {
      var bub = bubbles[bi];
      var ratio = bub.r / bub.maxR;
      var alpha = bub.popping ? (1 - bub.popTimer / 0.3) * 0.5 : 0.85;

      if (!bub.popping) {
        var isReady = !bub.growing && ratio >= 1.0;
        var rimCol = isReady ? C.safe : (ratio >= 0.75 ? C.bubbleRim : C.ui);
        // Outer glow
        game.draw.circle(bub.x, bub.y, bub.r + 12, rimCol, isReady ? 0.3 : 0.1);
        // Bubble body
        game.draw.circle(bub.x, bub.y, bub.r, C.bubble, 0.18);
        // Rim
        game.draw.circle(bub.x, bub.y, bub.r, rimCol, 0.5);
        // Shimmer
        var shx = bub.x - bub.r * 0.3;
        var shy = bub.y - bub.r * 0.3;
        game.draw.circle(shx, shy, bub.r * 0.2, '#fff', 0.5 + Math.sin(bub.shimmer) * 0.2);
        // Small shimmer
        game.draw.circle(bub.x + bub.r * 0.2, bub.y - bub.r * 0.4, bub.r * 0.08, '#fff', 0.7);
      } else {
        game.draw.circle(bub.x, bub.y, bub.r, C.pop, alpha);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r * p.life, p.col, p.life * 0.7);
    }

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 60 + ei * 120, H * 0.955, 22, ei < escaped ? C.danger : C.ui, 0.9);
    }

    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio2, 72, ratio2 > 0.3 ? C.bubbleRim : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnBubble();
  });
})(game);
