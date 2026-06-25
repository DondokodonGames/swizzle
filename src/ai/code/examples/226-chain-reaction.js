// 226-chain-reaction.js
// チェーンリアクション — 1回のタップでどれだけ多くの爆発を連鎖させるか挑戦
// 操作: タップで爆発開始  1タップのみ
// 成功: 連鎖が全体の80%以上を巻き込む  失敗: 届かない

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020408',
    particle: '#f59e0b',
    partHi:   '#fde68a',
    explode:  '#ef4444',
    expHi:    '#fca5a5',
    waiting:  '#3b82f6',
    waitHi:   '#93c5fd',
    success:  '#22c55e',
    ui:       '#475569'
  };

  var NUM_PARTICLES = 80;
  var EXPLODE_R = 100; // explosion radius that triggers neighbors
  var particles = [];
  var exploding = [];  // currently exploding particle indices
  var done = false;
  var tapped = false;
  var elapsed = 0;
  var chainCount = 0;
  var phase = 'aim'; // 'aim' | 'exploding' | 'result'
  var explodeQueue = [];
  var explodeTimer = 0;
  var EXPLODE_SPEED = 0.06; // delay between chained explosions
  var resultTimer = 0;

  function initParticles() {
    particles = [];
    for (var i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: 60 + Math.random() * (W - 120),
        y: 120 + Math.random() * (H * 0.82 - 120),
        r: 20 + Math.random() * 16,
        exploded: false,
        exploding: false,
        explodeTime: 0,
        EXPLODE_DUR: 0.4,
        idx: i
      });
    }
  }

  function startExplosion(idx) {
    if (idx < 0 || idx >= particles.length) return;
    if (particles[idx].exploded || particles[idx].exploding) return;
    particles[idx].exploding = true;
    particles[idx].explodeTime = 0;
    chainCount++;
  }

  function processExplosion(idx, dt) {
    var p = particles[idx];
    if (!p.exploding) return;
    p.explodeTime += dt;
    if (p.explodeTime >= p.EXPLODE_DUR) {
      p.exploded = true;
      p.exploding = false;
      // Chain to nearby particles
      for (var ni = 0; ni < particles.length; ni++) {
        if (particles[ni].exploded || particles[ni].exploding) continue;
        var dx = particles[ni].x - p.x, dy = particles[ni].y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < EXPLODE_R + p.r) {
          explodeQueue.push(ni);
        }
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (phase !== 'aim') return;
    // Find closest particle to tap
    var best = -1, bestDist = 120;
    for (var i = 0; i < particles.length; i++) {
      var dx = tx - particles[i].x, dy = ty - particles[i].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { best = i; bestDist = d; }
    }
    if (best >= 0) {
      phase = 'exploding';
      startExplosion(best);
      game.audio.play('se_tap', 0.8);
    }
  });

  game.onUpdate(function(dt) {
    elapsed += dt;

    if (phase === 'exploding') {
      explodeTimer -= dt;
      if (explodeTimer <= 0 && explodeQueue.length > 0) {
        var nextIdx = explodeQueue.shift();
        startExplosion(nextIdx);
        explodeTimer = EXPLODE_SPEED;
        game.audio.play('se_tap', Math.min(1, 0.2 + chainCount * 0.005));
      }

      // Process all exploding particles
      var anyExploding = false;
      for (var i = 0; i < particles.length; i++) {
        if (particles[i].exploding) {
          processExplosion(i, dt);
          anyExploding = true;
        }
      }

      // Done when no active explosions and queue empty
      if (!anyExploding && explodeQueue.length === 0) {
        phase = 'result';
        resultTimer = 2.0;
        var percent = Math.round((chainCount / NUM_PARTICLES) * 100);
        if (percent >= 80) {
          game.audio.play('se_success');
          done = true;
          setTimeout(function() { game.end.success(chainCount * 50 + percent * 20); }, 500);
        } else {
          game.audio.play('se_failure');
          done = true;
          setTimeout(function() { game.end.failure(); }, 1500);
        }
      }
    }

    if (phase === 'result') {
      resultTimer -= dt;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Particles
    for (var i2 = 0; i2 < particles.length; i2++) {
      var p = particles[i2];
      if (p.exploded) {
        // Show as dark ash
        game.draw.circle(p.x, p.y, p.r * 0.5, '#1e293b', 0.4);
      } else if (p.exploding) {
        // Explosion animation
        var prog = p.explodeTime / p.EXPLODE_DUR;
        var expR = p.r + prog * EXPLODE_R;
        game.draw.circle(p.x, p.y, expR + 20, C.expHi, (1 - prog) * 0.3);
        game.draw.circle(p.x, p.y, expR, C.explode, (1 - prog) * 0.8);
        game.draw.circle(p.x, p.y, p.r, '#fff', 0.9);
      } else {
        // Waiting
        var pulse = 0.6 + 0.4 * Math.abs(Math.sin(elapsed * 2 + i2 * 0.3));
        game.draw.circle(p.x, p.y, p.r + 4, C.waitHi, pulse * 0.15);
        game.draw.circle(p.x, p.y, p.r, C.waiting, 0.75);
      }
    }

    // Status
    if (phase === 'aim') {
      game.draw.text('タップで爆発開始！', W / 2, H * 0.92, { size: 48, color: C.ui, bold: true });
      game.draw.text('1回のみ', W / 2, H * 0.96, { size: 34, color: '#334155' });
    } else if (phase === 'exploding' || phase === 'result') {
      var percent2 = Math.round((chainCount / NUM_PARTICLES) * 100);
      var col2 = percent2 >= 80 ? C.success : percent2 >= 50 ? C.particle : C.explode;
      game.draw.text('連鎖 ' + chainCount + '個 (' + percent2 + '%)', W / 2, H * 0.92, { size: 48, color: col2, bold: true });
      game.draw.text('目標: 80%以上', W / 2, H * 0.96, { size: 34, color: C.ui });
    }

    // Chain count top
    game.draw.text(chainCount + ' / ' + NUM_PARTICLES, W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    var fillRatio = chainCount / NUM_PARTICLES;
    var barCol = fillRatio >= 0.8 ? C.success : C.particle;
    game.draw.rect(0, 0, W * fillRatio, 72, barCol);
    game.draw.text('80%ライン', W * 0.8, 36, { size: 28, color: '#fff' });
    game.draw.line(W * 0.8, 0, W * 0.8, 72, '#fff', 3);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initParticles();
  });
})(game);
