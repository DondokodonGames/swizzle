// 212-domino-chain.js
// ドミノ連鎖 — ドミノを一個倒してどれだけ連鎖するか、最高連鎖数を競う
// 操作: タップでドミノの位置を選んで倒し始める
// 成功: 連鎖が20本以上  失敗: 45秒以内に達成できない

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    domino:  '#1e3a5f',
    dominoHi:'#2d5a8e',
    falling: '#f59e0b',
    falHi:   '#fde68a',
    fallen:  '#374151',
    spark:   '#22c55e',
    ui:      '#334155'
  };

  var NUM_DOMINOS = 40;
  var DOMINO_W = 24;
  var DOMINO_H = 64;
  var FALL_RADIUS = 90; // chain reaction radius
  var dominos = [];
  var fallingIdx = -1;
  var chainCount = 0;
  var maxChain = 0;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var chainTimer = 0;
  var CHAIN_SPEED = 0.18; // seconds between chain reactions
  var particles = [];
  var started = false;
  var waitTimer = 0;

  function initDominos() {
    dominos = [];
    // Arrange in a winding line
    var x = W * 0.1, y = H * 0.2;
    var dx2 = 1, dy2 = 0;
    var spacing = (W * 0.8) / (NUM_DOMINOS + 2);
    for (var i = 0; i < NUM_DOMINOS; i++) {
      var jitter = (Math.random() - 0.5) * 20;
      dominos.push({
        x: W * 0.1 + i * spacing + jitter,
        y: H * 0.35 + Math.sin(i * 0.4) * H * 0.25 + jitter,
        fallen: false,
        falling: false,
        fallAngle: 0,
        fallDir: 1
      });
    }
  }

  function startFalling(idx) {
    if (idx < 0 || idx >= dominos.length) return;
    if (dominos[idx].fallen) return;
    dominos[idx].falling = true;
    dominos[idx].fallDir = 1;
    fallingIdx = idx;
    chainCount = 0;
    chainTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!started) {
      // Find closest domino
      var best = -1, bestDist = 9999;
      for (var di = 0; di < dominos.length; di++) {
        if (dominos[di].fallen) continue;
        var dx = tx - dominos[di].x, dy = ty - dominos[di].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { best = di; bestDist = d; }
      }
      if (best >= 0 && bestDist < 80) {
        started = true;
        startFalling(best);
        game.audio.play('se_tap', 0.6);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (started) {
      chainTimer -= dt;
      if (chainTimer <= 0 && fallingIdx >= 0) {
        // Animate fall
        var d = dominos[fallingIdx];
        if (d.falling && !d.fallen) {
          d.fallAngle += 6 * dt;
          if (d.fallAngle >= Math.PI / 2) {
            d.fallAngle = Math.PI / 2;
            d.fallen = true;
            d.falling = false;
            chainCount++;
            if (chainCount > maxChain) maxChain = chainCount;

            // Emit particles
            for (var pi = 0; pi < 4; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: d.x, y: d.y, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.4 });
            }

            // Check chain reaction: find next domino in range
            var nextIdx = -1, nextDist = FALL_RADIUS;
            for (var di2 = 0; di2 < dominos.length; di2++) {
              if (dominos[di2].fallen || dominos[di2].falling) continue;
              var dx2 = dominos[di2].x - d.x, dy2 = dominos[di2].y - d.y;
              var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              if (dist2 < nextDist) { nextIdx = di2; nextDist = dist2; }
            }

            if (nextIdx >= 0) {
              dominos[nextIdx].falling = true;
              fallingIdx = nextIdx;
              chainTimer = CHAIN_SPEED;
              game.audio.play('se_tap', Math.min(1, 0.2 + chainCount * 0.01));
            } else {
              // Chain ended
              fallingIdx = -1;
              if (chainCount >= 20 && !done) {
                done = true;
                game.audio.play('se_success');
                setTimeout(function() { game.end.success(chainCount * 50 + Math.ceil(timeLeft) * 30); }, 400);
              } else if (!done) {
                // Allow retry after short wait
                setTimeout(function() {
                  started = false;
                  initDominos();
                }, 1500);
              }
            }
          }
        }
      }
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Dominos
    for (var di3 = 0; di3 < dominos.length; di3++) {
      var dm = dominos[di3];
      if (dm.fallen) {
        // Draw flat
        game.draw.rect(dm.x - DOMINO_H / 2, dm.y, DOMINO_H, DOMINO_W, C.fallen, 0.6);
      } else if (dm.falling) {
        // Tilting
        var ang = dm.fallAngle;
        var cx2 = dm.x + Math.sin(ang) * DOMINO_H * 0.5;
        var cy2 = dm.y - Math.cos(ang) * DOMINO_H * 0.5;
        game.draw.line(dm.x, dm.y, cx2, cy2, C.falling, DOMINO_W);
        game.draw.circle(cx2, cy2, DOMINO_W * 0.6, C.falHi, 0.6);
      } else {
        // Standing
        game.draw.rect(dm.x - DOMINO_W / 2, dm.y - DOMINO_H, DOMINO_W, DOMINO_H, C.domino, 0.9);
        game.draw.rect(dm.x - DOMINO_W / 2, dm.y - DOMINO_H, DOMINO_W, 10, C.dominoHi, 0.4);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8 * part.life * 2, C.spark, part.life);
    }

    // Status
    if (!started) {
      game.draw.text('ドミノをタップして倒す！', W / 2, H * 0.92, { size: 42, color: C.ui, bold: true });
    } else {
      game.draw.text('連鎖中: ' + chainCount, W / 2, H * 0.92, { size: 48, color: C.falHi, bold: true });
    }

    game.draw.text('最高: ' + maxChain + ' / 20', W / 2, 148, { size: 56, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initDominos();
  });
})(game);
