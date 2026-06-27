// 743-firefly.js
// ホタル狩り — 光るホタルが点灯している間にタップしてつかまえろ
// 操作: タップ — 点灯中のホタルに当てると成功
// 成功: 30匹捕獲  失敗: 10回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010a03',
    firefly: '#d4f73a',
    glow:    '#8fc020',
    dark:    '#2a3a05',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#d1fae5',
    ui:      '#040f06'
  };

  var fireflies = [];
  var MAX_FF = 10;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnFirefly() {
    var margin = 120;
    var litDur = 0.5 + Math.random() * 0.7;
    var darkDur = 0.8 + Math.random() * 1.2;
    fireflies.push({
      x: margin + Math.random() * (W - margin * 2),
      y: H * 0.18 + Math.random() * (H * 0.68),
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      lit: false,
      litTimer: darkDur * 0.5 + Math.random() * darkDur,
      litDur: litDur,
      darkDur: darkDur,
      phase: Math.random() * Math.PI * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = fireflies.length - 1; i >= 0; i--) {
      var ff = fireflies[i];
      if (!ff.lit) continue;
      var dx = tx - ff.x, dy = ty - ff.y;
      if (dx * dx + dy * dy < 70 * 70) {
        fireflies.splice(i, 1);
        score++;
        hit = true;
        flashCol = C.correct;
        flashAnim = 0.22;
        resultText = 'つかまえた！';
        resultTimer = 0.38;
        game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.firefly });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
        break;
      }
    }
    if (!hit) {
      // Check if tapped on a dark firefly (wrong)
      for (var j = 0; j < fireflies.length; j++) {
        var ff2 = fireflies[j];
        var dx2 = tx - ff2.x, dy2 = ty - ff2.y;
        if (dx2 * dx2 + dy2 * dy2 < 60 * 60) {
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.25;
          resultText = '消えてた！';
          resultTimer = 0.38;
          game.audio.play('se_failure', 0.22);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
          return;
        }
      }
      // Tap in empty space — minor miss penalty
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.18;
      resultText = 'ハズレ！';
      resultTimer = 0.32;
      game.audio.play('se_failure', 0.15);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }
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

    // Maintain firefly count
    while (fireflies.length < MAX_FF && !done) spawnFirefly();

    for (var fi = 0; fi < fireflies.length; fi++) {
      var ff = fireflies[fi];
      ff.phase += dt * 2.5;
      ff.x += ff.vx * dt;
      ff.y += ff.vy * dt;
      // Bounce off walls
      if (ff.x < 80 || ff.x > W - 80) { ff.vx = -ff.vx; ff.x = Math.max(80, Math.min(W - 80, ff.x)); }
      if (ff.y < H * 0.15 || ff.y > H * 0.88) { ff.vy = -ff.vy; ff.y = Math.max(H * 0.15, Math.min(H * 0.88, ff.y)); }

      ff.litTimer -= dt;
      if (ff.litTimer <= 0) {
        ff.lit = !ff.lit;
        ff.litTimer = ff.lit ? ff.litDur : ff.darkDur;
        if (ff.lit) {
          ff.litDur = Math.max(0.3, 0.5 + Math.random() * 0.6 - score * 0.006);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Night foliage hints
    for (var gl = 0; gl < 5; gl++) {
      var gy = H * 0.85 + gl * 20;
      game.draw.rect(0, gy, W, 6, '#0a1f0c', 0.6);
    }

    // Fireflies
    for (var fi2 = 0; fi2 < fireflies.length; fi2++) {
      var ff3 = fireflies[fi2];
      if (ff3.lit) {
        var glow = 0.5 + 0.3 * Math.sin(ff3.phase * 4);
        game.draw.circle(ff3.x, ff3.y, 55, C.glow, glow * 0.18);
        game.draw.circle(ff3.x, ff3.y, 30, C.glow, glow * 0.35);
        game.draw.circle(ff3.x, ff3.y, 14, C.firefly, 0.9);
        game.draw.circle(ff3.x - 4, ff3.y - 4, 5, '#fff', 0.6);
      } else {
        game.draw.circle(ff3.x, ff3.y, 8, C.dark, 0.5);
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#d1fae5', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    for (var i = 0; i < 6; i++) spawnFirefly();
  });
})(game);
