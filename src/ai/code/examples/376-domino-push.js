// 376-domino-push.js
// ドミノ倒し — 最初の1枚を倒して全部倒れるか見届ける
// 操作: タップでドミノを押す位置を選ぶ
// 成功: 全部のドミノを倒す  失敗: 途中で止まる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0f1a',
    floor:  '#1e1b4b',
    floorHi:'#312e81',
    domino: '#e2e8f0',
    dominoFall:'#fbbf24',
    dominoFallHi:'#fef3c7',
    dominoStand:'#818cf8',
    tap:    '#22c55e',
    tapHi:  '#86efac',
    danger: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var N = 20;
  var dominoes = [];
  var falling = false;
  var allFallen = false;
  var fallIdx = 0;
  var fallTimer = 0;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];
  var stoppedTimer = 0;

  // Gap sizes — some wider, creating chain-break risk
  var gaps = [];

  function setupDominoes() {
    dominoes = [];
    gaps = [];
    var x = 80;
    var y = H * 0.68;
    for (var i = 0; i < N; i++) {
      var gap = 64 + Math.random() * 24;
      if (i > 0 && Math.random() < 0.25) gap += 40; // wider gap occasionally
      gaps.push(gap);
      dominoes.push({
        x: x,
        y: y,
        angle: 0,       // 0 = standing, 90 = fully fallen
        standing: true,
        r: 18,
        h: 90
      });
      x += gap;
      if (x > W - 80) {
        // Next row
        x = 80;
        y += 200;
      }
    }
  }

  var pushedIdx = -1;

  game.onTap(function(tx, ty) {
    if (done || falling) return;
    // Find nearest standing domino within touch radius
    var best = -1, bestDist = 100;
    for (var i = 0; i < dominoes.length; i++) {
      if (!dominoes[i].standing) continue;
      var d = Math.hypot(tx - dominoes[i].x, ty - dominoes[i].y);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best >= 0) {
      pushedIdx = best;
      falling = true;
      fallIdx = best;
      game.audio.play('se_tap', 0.5);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (falling) {
      fallTimer += dt * 3;

      // Advance fall along chain
      var fallSpeed = 4;
      if (fallIdx < N && dominoes[fallIdx].standing) {
        dominoes[fallIdx].angle += fallSpeed * dt * 90;
        if (dominoes[fallIdx].angle >= 85) {
          dominoes[fallIdx].angle = 90;
          dominoes[fallIdx].standing = false;
          // Particle burst
          for (var pi = 0; pi < 4; pi++) {
            var ang = Math.random() * Math.PI;
            particles.push({ x: dominoes[fallIdx].x, y: dominoes[fallIdx].y, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100-60, life:0.5, col: C.dominoFallHi });
          }
          game.audio.play('se_tap', 0.2);
          // Check if next domino is reachable
          var nextIdx = fallIdx + 1;
          if (nextIdx < N) {
            var gapToNext = dominoes[nextIdx].x - dominoes[fallIdx].x;
            if (gapToNext <= dominoes[fallIdx].h + 20) {
              fallIdx = nextIdx;
            } else {
              // Gap too large — chain breaks
              falling = false;
              stoppedTimer = elapsed;
              game.audio.play('se_failure', 0.5);
              // Fail after showing the stop
              if (!done) {
                setTimeout(function() {
                  if (!done) { done = true; game.end.failure(); }
                }, 1500);
              }
            }
          } else {
            // All fallen!
            allFallen = true;
            falling = false;
            for (var pi2 = 0; pi2 < 20; pi2++) {
              var ang2 = Math.random() * Math.PI * 2;
              particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang2)*300, vy: Math.sin(ang2)*300, life:0.8, col: C.tap });
            }
            game.audio.play('se_success', 0.8);
            if (!done) {
              done = true;
              game.end.success(N * 300 + Math.ceil(timeLeft) * 100);
            }
          }
        }
      }
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

    // Floor
    game.draw.rect(0, H * 0.72, W, H * 0.28, C.floor, 0.8);
    for (var fi = 0; fi < W; fi += 120) {
      game.draw.line(fi, H * 0.72, fi, H, C.floorHi, 2);
    }

    // Dominoes
    for (var di = 0; di < N; di++) {
      var d = dominoes[di];
      var angleRad = (d.angle / 180) * Math.PI;
      var tipX = d.x + Math.sin(angleRad) * d.h;
      var tipY = d.y - Math.cos(angleRad) * d.h;
      var col = d.standing ? C.dominoStand : C.dominoFall;
      // Draw domino as thick line from base to tip
      game.draw.line(d.x, d.y, tipX, tipY, col, 24);
      // Dot
      game.draw.circle((d.x + tipX) / 2, (d.y + tipY) / 2, 6, '#fff', 0.6);
    }

    // Push indicator (first domino, pre-push)
    if (!falling && !allFallen && pushedIdx < 0) {
      game.draw.text('タップで押す', W / 2, H * 0.2, { size: 48, color: C.tap, bold: true });
      // Highlight first domino
      var d0 = dominoes[0];
      game.draw.circle(d0.x, d0.y - d0.h / 2, 36, C.tap, 0.3 + Math.sin(elapsed * 4) * 0.15);
    }

    // Chain break warning
    if (!falling && stoppedTimer > 0 && !done) {
      game.draw.text('倒れ止まった！', W / 2, H * 0.2, { size: 52, color: C.danger, bold: true });
    }

    // Progress
    var fallenCount = 0;
    for (var fi2 = 0; fi2 < N; fi2++) { if (!dominoes[fi2].standing) fallenCount++; }
    game.draw.text(fallenCount + ' / ' + N, W / 2, 148, { size: 56, color: C.text, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dominoStand : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    setupDominoes();
  });
})(game);
