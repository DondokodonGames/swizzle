// 565-pipe-burst.js
// パイプバースト — 水圧が高まるパイプを素早くタップして破裂を防ぐ
// 操作: タップで圧力を抜く
// 成功: 60秒生存  失敗: 5本のパイプ破裂

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1628',
    pipe:    '#334466',
    pipeHi:  '#4477aa',
    water:   '#3b82f6',
    waterHi: '#93c5fd',
    danger:  '#ef4444',
    dangerHi:'#fca5a5',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#374151',
    burst:   '#ff6600'
  };

  var NUM_PIPES = 6;
  var pipes = [];
  var bursts = 0;
  var MAX_BURST = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var SURVIVE_TIME = 60;

  var PIPE_W = 120;
  var PIPE_GAP = (W - NUM_PIPES * PIPE_W) / (NUM_PIPES + 1);

  function initPipes() {
    pipes = [];
    for (var i = 0; i < NUM_PIPES; i++) {
      pipes.push({
        x: PIPE_GAP + i * (PIPE_W + PIPE_GAP) + PIPE_W / 2,
        pressure: Math.random() * 0.3,
        fillRate: 0.04 + Math.random() * 0.08,
        cracked: false,
        burstTimer: 0
      });
    }
  }

  function releasePressure(idx) {
    if (pipes[idx].pressure > 0) {
      pipes[idx].pressure = Math.max(0, pipes[idx].pressure - 0.5);
      pipes[idx].cracked = false;
      game.audio.play('se_tap', 0.3);
      // Splash particles
      for (var pi = 0; pi < 6; pi++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        particles.push({
          x: pipes[idx].x, y: getPipeTop(idx),
          vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200,
          life: 0.4, col: C.waterHi
        });
      }
    }
  }

  function getPipeTop(idx) {
    return H * 0.25 + (1 - pipes[idx].pressure) * H * 0.45;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped pipe
    for (var i = 0; i < pipes.length; i++) {
      var px = pipes[i].x;
      if (Math.abs(tx - px) < PIPE_W * 0.7) {
        releasePressure(i);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0 && bursts < MAX_BURST) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(elapsed) * 200 + (MAX_BURST - bursts) * 500); }, 700);
        return;
      }
    }

    // Update pipes
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      if (p.burstTimer > 0) {
        p.burstTimer -= dt;
        if (p.burstTimer <= 0) {
          // Reset pipe after burst
          p.pressure = 0;
          p.cracked = false;
          p.fillRate = 0.05 + Math.random() * 0.1;
        }
        continue;
      }

      p.pressure += p.fillRate * dt;
      if (p.pressure >= 0.8 && !p.cracked) {
        p.cracked = true;
        game.audio.play('se_failure', 0.2);
      }
      if (p.pressure >= 1) {
        // Burst!
        p.pressure = 1;
        p.burstTimer = 1.2;
        bursts++;
        game.audio.play('se_failure', 0.6);
        for (var bi = 0; bi < 14; bi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({
            x: p.x, y: H * 0.25,
            vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 - 200,
            life: 0.6, col: C.water
          });
        }
        if (bursts >= MAX_BURST && !done) {
          done = true;
          game.audio.play('se_failure', 0.8);
          setTimeout(function() { game.end.failure(); }, 700);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 600 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ceiling pipe header
    game.draw.rect(0, H * 0.2, W, 40, C.pipe, 0.9);
    game.draw.rect(0, H * 0.2, W, 8, C.pipeHi, 0.6);

    // Pipes
    for (var i2 = 0; i2 < pipes.length; i2++) {
      var p2 = pipes[i2];
      var px = p2.x - PIPE_W / 2;
      var pipeH = H * 0.5;
      var pipeTop = H * 0.24;
      var pipeBot = pipeTop + pipeH;

      // Pipe body
      game.draw.rect(px, pipeTop, PIPE_W, pipeH, C.pipe, 0.9);
      // Pipe shine
      game.draw.rect(px + 8, pipeTop, 12, pipeH, C.pipeHi, 0.3);

      if (p2.burstTimer > 0) {
        // Burst animation
        var bt = p2.burstTimer / 1.2;
        game.draw.rect(px - 20, pipeTop, PIPE_W + 40, pipeH, C.burst, bt * 0.3);
        game.draw.text('破裂!', p2.x, pipeTop + pipeH / 2, { size: 44, color: C.burst, bold: true });
        continue;
      }

      // Water fill
      var waterH = pipeH * p2.pressure;
      var waterY = pipeBot - waterH;
      var col = p2.pressure > 0.8 ? C.danger : (p2.pressure > 0.5 ? '#f59e0b' : C.water);
      game.draw.rect(px + 4, waterY, PIPE_W - 8, waterH, col, 0.85);
      // Water surface ripple
      if (waterH > 10) {
        game.draw.rect(px + 4, waterY, PIPE_W - 8, 8, C.waterHi, 0.4 + Math.sin(elapsed * 8 + i2) * 0.2);
      }

      // Crack effect
      if (p2.cracked) {
        game.draw.line(px + PIPE_W * 0.3, pipeTop + 20, px + PIPE_W * 0.7, pipeTop + 80, C.dangerHi, 4);
        game.draw.line(px + PIPE_W * 0.5, pipeTop + 40, px + PIPE_W * 0.8, pipeTop + 120, C.dangerHi, 3);
      }

      // Pressure gauge
      var gaugeY = pipeBot + 20;
      game.draw.rect(px, gaugeY, PIPE_W, 24, C.ui, 0.6);
      game.draw.rect(px, gaugeY, PIPE_W * p2.pressure, 24, col, 0.9);

      // Tap indicator
      game.draw.circle(p2.x, pipeBot + 100, 36, col, 0.2 + Math.sin(elapsed * 5 + i2) * 0.1);
      game.draw.text('TAP', p2.x, pipeBot + 115, { size: 28, color: col });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var part = particles[pp2];
      game.draw.circle(part.x, part.y, 10 * part.life, part.col, part.life * 0.7);
    }

    // Burst indicator dots
    for (var bi2 = 0; bi2 < MAX_BURST; bi2++) {
      game.draw.circle(W / 2 - (MAX_BURST - 1) * 50 + bi2 * 100, H * 0.955, 20, bi2 < bursts ? C.danger : C.safe, 0.9);
    }

    game.draw.text('破裂: ' + bursts + ' / ' + MAX_BURST, W / 2, 148, { size: 52, color: bursts > 2 ? C.danger : C.text, bold: true });
    var ratio = Math.max(0, timeLeft / SURVIVE_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.water : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initPipes();
  });
})(game);
