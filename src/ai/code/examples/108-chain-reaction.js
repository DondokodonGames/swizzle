// 108-chain-reaction.js
// チェーンリアクション — 1つの爆発が次々と連鎖し画面中の球体を一掃する爽快感
// 操作: タップで爆発を起こす（大きい球を狙うほど連鎖しやすい）
// 成功: 20個以上連鎖で消滅させる  失敗: 足りない数しか消えない（3回チャレンジ）

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040608',
    ui:      '#334155',
    correct: '#22c55e',
    wrong:   '#ef4444'
  };

  var BALL_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'];
  var NUM_BALLS = 30;
  var TARGET_CHAIN = 20;

  var balls = []; // { x, y, vx, vy, r, color, exploding, explodeR, explodeMax }
  var attempts = 3;
  var score = 0;
  var bestChain = 0;
  var timeLeft = 30;
  var done = false;
  var chainCount = 0;
  var phase = 'ready'; // 'ready' | 'exploding' | 'result'
  var resultTimer = 0;
  var resultOk = false;
  var particles = [];
  var totalExploded = 0;

  function initBalls() {
    balls = [];
    for (var i = 0; i < NUM_BALLS; i++) {
      var r = 20 + Math.random() * 30;
      var x = r + Math.random() * (W - r * 2);
      var y = H * 0.15 + Math.random() * (H * 0.65);
      var spd = 40 + Math.random() * 80;
      var ang = Math.random() * Math.PI * 2;
      balls.push({
        x: x, y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: r,
        color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
        exploding: false,
        explodeR: 0,
        explodeMax: 0,
        exploded: false
      });
    }
    totalExploded = 0;
    chainCount = 0;
    phase = 'ready';
  }

  function triggerExplosion(ball) {
    if (ball.exploding || ball.exploded) return;
    ball.exploding = true;
    ball.explodeR = ball.r;
    ball.explodeMax = ball.r * 3.5;
    totalExploded++;
    // Particles
    for (var p = 0; p < 8; p++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 100 + Math.random() * 200;
      particles.push({ x: ball.x, y: ball.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 0.5, color: ball.color });
    }
    game.audio.play('se_tap', 0.5);
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'ready') return;
    // Find ball under tap
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.exploded || b.exploding) continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.r + 16) {
        triggerExplosion(b);
        phase = 'exploding';
        return;
      }
    }
    // Tap empty space — direct explosion
    phase = 'exploding';
    // Create a small explosion at tap point
    particles.push({ x: tx, y: ty, vx: 0, vy: 0, life: 0.3, color: '#fff' });
    // Check if any ball nearby
    for (var j = 0; j < balls.length; j++) {
      var b2 = balls[j];
      if (b2.exploded || b2.exploding) continue;
      var dx2 = tx - b2.x, dy2 = ty - b2.y;
      if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < b2.r + 60) {
        triggerExplosion(b2);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Move balls
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.exploded) continue;
      if (!b.exploding) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Bounce
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < H * 0.12) { b.y = H * 0.12 + b.r; b.vy = Math.abs(b.vy); }
        if (b.y + b.r > H * 0.88) { b.y = H * 0.88 - b.r; b.vy = -Math.abs(b.vy); }
      } else {
        // Expand explosion
        b.explodeR += (b.explodeMax - b.r) * 3 * dt;
        // Check chain: any non-exploded ball inside explosion radius?
        for (var j = 0; j < balls.length; j++) {
          if (i === j || balls[j].exploded || balls[j].exploding) continue;
          var dx = b.x - balls[j].x, dy = b.y - balls[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < b.explodeR + balls[j].r) {
            triggerExplosion(balls[j]);
          }
        }
        if (b.explodeR >= b.explodeMax) {
          b.exploding = false;
          b.exploded = true;
        }
      }
    }

    // Update particles
    for (var pi = 0; pi < particles.length; pi++) {
      var p = particles[pi];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 200 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // Check if chain finished
    if (phase === 'exploding') {
      var anyActive = balls.some(function(b) { return b.exploding; });
      if (!anyActive) {
        // Chain complete
        phase = 'result';
        resultOk = totalExploded >= TARGET_CHAIN;
        if (resultOk) {
          score++;
          game.audio.play('se_success');
          if (score >= 1 && !done) {
            done = true;
            setTimeout(function() { game.end.success(totalExploded * 15 + Math.ceil(timeLeft) * 10); }, 1200);
            return;
          }
        } else {
          game.audio.play('se_failure', 0.6);
          attempts--;
          if (attempts <= 0 && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 1200);
            return;
          }
        }
        bestChain = Math.max(bestChain, totalExploded);
        resultTimer = 1.2;
      }
    }

    if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0) {
        initBalls();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Balls
    for (var bi = 0; bi < balls.length; bi++) {
      var ball = balls[bi];
      if (ball.exploded) continue;
      if (ball.exploding) {
        var ef = ball.explodeR / ball.explodeMax;
        game.draw.circle(ball.x, ball.y, ball.explodeR, ball.color, (1 - ef) * 0.5);
        game.draw.circle(ball.x, ball.y, ball.explodeR * 0.6, ball.color, (1 - ef) * 0.8);
      } else {
        game.draw.circle(ball.x, ball.y, ball.r + 4, ball.color, 0.2);
        game.draw.circle(ball.x, ball.y, ball.r, ball.color);
        game.draw.circle(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.25, '#fff', 0.4);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8 * part.life * 2, part.color, part.life);
    }

    // Counter
    if (phase === 'exploding' || phase === 'result') {
      game.draw.text(totalExploded + '/' + TARGET_CHAIN, W / 2, H * 0.5, {
        size: 88, color: totalExploded >= TARGET_CHAIN ? C.correct : '#f1f5f9', bold: true
      });
    }

    // Result overlay
    if (phase === 'result') {
      game.draw.rect(0, 0, W, H, '#000', 0.4);
      game.draw.text(resultOk ? '連鎖成功！' : '連鎖不足…', W / 2, H * 0.4, {
        size: 88, color: resultOk ? C.correct : C.wrong, bold: true
      });
      game.draw.text(totalExploded + ' 個爆破！', W / 2, H * 0.52, { size: 56, color: '#f1f5f9' });
      if (attempts > 0) {
        game.draw.text('残り' + attempts + '回', W / 2, H * 0.63, { size: 48, color: '#64748b' });
      }
    }

    // Guide
    if (phase === 'ready') {
      game.draw.text('球をタップして連鎖爆発！', W / 2, H * 0.9, { size: 48, color: C.ui });
      game.draw.text(TARGET_CHAIN + '個以上爆破せよ', W / 2, H * 0.95, { size: 36, color: '#475569' });
    }

    // Attempts
    for (var ai = 0; ai < 3; ai++) {
      game.draw.circle(W / 2 + (ai - 1) * 64, 148, 24, ai < attempts ? '#fbbf24' : '#0a1428');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#040608');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#8b5cf6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initBalls();
  });
})(game);
