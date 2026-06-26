// 487-wave-surfer.js
// 波乗りサーファー — 押し寄せる波のタイミングに合わせてスワイプでライド
// 操作: 波のクレストが来たら上スワイプ（波の高さに応じてタイミング）
// 成功: 10回ライド成功  失敗: 5回落下 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000a20',
    sea:    '#1e40af',
    seaHi:  '#3b82f6',
    foam:   '#bfdbfe',
    foamHi: '#eff6ff',
    surfer: '#f59e0b',
    surferHi:'#fde68a',
    board:  '#dc2626',
    crest:  '#67e8f9',
    wrong:  '#ef4444',
    correct:'#22c55e',
    sky:    '#0c1a40',
    sun:    '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var waves = [];
  var particles = [];
  var surfer = { x: W * 0.25, y: H * 0.6, vy: 0, onWave: false, riding: false, ridingTimer: 0 };
  var rides = 0;
  var NEEDED = 10;
  var falls = 0;
  var MAX_FALLS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var nextWave = 2.0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var resultText = '';
  var resultAnim = 0;

  function spawnWave() {
    waves.push({
      x: W + 200,
      y: H * 0.62,
      vx: -(200 + Math.random() * 80 + rides * 5),
      height: 140 + Math.random() * 120,
      width: 350 + Math.random() * 200,
      crestX: 0,  // relative to wave center
      phase: 0,
      ridden: false
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir !== 'up') return;

    // Check if a wave crest is near the surfer
    var hitWave = false;
    for (var wi = 0; wi < waves.length; wi++) {
      var w = waves[wi];
      if (w.ridden) continue;
      // Crest position
      var crestX = w.x - w.width * 0.15;
      var crestY = w.y - w.height * 0.9;
      var distX = Math.abs(surfer.x - crestX);
      var distY = Math.abs(surfer.y - crestY);

      if (distX < 160 && distY < 200) {
        // Ride!
        w.ridden = true;
        rides++;
        surfer.riding = true;
        surfer.ridingTimer = 1.8;
        surfer.vy = -350;
        flashCol = C.correct;
        flashAnim = 0.4;
        resultText = 'ライド！';
        resultAnim = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: surfer.x, y: surfer.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 100, life: 0.7, col: C.foam });
        }
        hitWave = true;
        if (rides >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(rides * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }

    if (!hitWave) {
      // Fell into water
      falls++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '転落！';
      resultAnim = 0.8;
      surfer.vy = 100;
      game.audio.play('se_failure', 0.5);
      if (falls >= MAX_FALLS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onTap(function(tx, ty) {
    // No-op
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

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultAnim > 0) resultAnim -= dt * 1.5;

    // Spawn wave
    nextWave -= dt;
    if (nextWave <= 0 && !done) {
      spawnWave();
      nextWave = 1.5 + Math.random() * 1.5;
    }

    // Update surfer
    if (surfer.riding) {
      surfer.ridingTimer -= dt;
      surfer.vy += 300 * dt;
      surfer.y += surfer.vy * dt;
      if (surfer.ridingTimer <= 0) {
        surfer.riding = false;
        surfer.vy = 0;
      }
    } else {
      surfer.vy += 400 * dt;
      surfer.y += surfer.vy * dt;
    }

    // Find wave under surfer
    var seaLevel = H * 0.65;
    var waveSurface = seaLevel;
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var w2 = waves[wi2];
      var distFromCenter = surfer.x - w2.x;
      if (Math.abs(distFromCenter) < w2.width) {
        var waveH = w2.height * Math.pow(Math.max(0, 1 - Math.abs(distFromCenter) / w2.width), 2);
        var surface = w2.y - waveH;
        if (surface < waveSurface) waveSurface = surface;
      }
    }

    if (surfer.y + 30 >= waveSurface) {
      surfer.y = waveSurface - 30;
      surfer.vy = Math.min(0, surfer.vy * -0.2);
    }
    if (surfer.y < H * 0.1) { surfer.y = H * 0.1; surfer.vy = 0; }

    // Move waves
    for (var wi3 = waves.length - 1; wi3 >= 0; wi3--) {
      var w3 = waves[wi3];
      w3.x += w3.vx * dt;
      w3.phase += dt * 3;
      if (w3.x < -w3.width - 200) {
        waves.splice(wi3, 1);
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Foam particles from waves
    if (Math.random() < dt * 8) {
      for (var wi4 = 0; wi4 < waves.length; wi4++) {
        var w4 = waves[wi4];
        var crestX4 = w4.x - w4.width * 0.15;
        var crestY4 = w4.y - w4.height * 0.85;
        if (crestX4 > 0 && crestX4 < W) {
          particles.push({ x: crestX4, y: crestY4, vx: -40 + Math.random() * 80, vy: -60, life: 0.5, col: C.foamHi });
        }
      }
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.65, C.sky, 0.8);

    // Sun
    game.draw.circle(W * 0.85, H * 0.12, 60, C.sun, 0.9);
    game.draw.circle(W * 0.85, H * 0.12, 75, C.sun, 0.2);

    // Sea base
    game.draw.rect(0, H * 0.63, W, H * 0.37, C.sea, 0.9);

    // Waves
    for (var wi5 = 0; wi5 < waves.length; wi5++) {
      var w5 = waves[wi5];
      // Draw wave shape as multiple circles/rects
      var cx5 = w5.x;
      var halfW = w5.width;
      // Main wave body
      for (var xi = -halfW; xi <= halfW; xi += 30) {
        var frac = 1 - Math.abs(xi) / halfW;
        var wh = w5.height * frac * frac;
        var wx5 = cx5 + xi;
        if (wx5 < -20 || wx5 > W + 20) continue;
        var wy5 = w5.y - wh;
        game.draw.rect(wx5 - 16, wy5, 32, wh + 100, C.seaHi, 0.8);
      }
      // Crest foam
      var crestX5 = cx5 - halfW * 0.15;
      var crestY5 = w5.y - w5.height * 0.9;
      if (crestX5 > -20 && crestX5 < W + 20) {
        game.draw.circle(crestX5, crestY5, 40, C.foam, 0.8);
        game.draw.circle(crestX5, crestY5, 26, C.foamHi, 0.9);
      }
    }

    // Surfer
    game.draw.rect(surfer.x - 40, surfer.y - 20, 80, 12, C.board, 0.9);
    game.draw.circle(surfer.x, surfer.y - 30, 20, C.surfer, 0.9);
    game.draw.circle(surfer.x, surfer.y - 52, 18, C.surferHi, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Result feedback
    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 72, color: resultAnim > 0 ? flashCol : C.ui, bold: true });
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 50 + fi * 100, H * 0.955, 20, fi < falls ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(rides + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.seaHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnWave();
  });
})(game);
