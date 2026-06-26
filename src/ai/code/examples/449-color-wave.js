// 449-color-wave.js
// カラーウェーブ — 流れる色の波に合わせてスワイプ
// 操作: 画面を流れる色の帯の色に合わせてスワイプ（色=方向）
// 成功: 30回正解  失敗: 5ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0020',
    up:     '#22d3ee',    // cyan = up
    down:   '#f43f5e',    // red = down
    left2:  '#22c55e',    // green = left
    right2: '#f97316',    // orange = right
    wave:   '#1e1040',
    text:   '#f1f5f9',
    ui:     '#475569',
    correct:'#fbbf24',
    wrong:  '#ef4444',
    hint:   '#a855f7'
  };

  var DIR_COLORS = { up: C.up, down: C.down, left: C.left2, right: C.right2 };
  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

  var waves = [];
  var currentDir = null;
  var nextSpawn = 0;
  var SPAWN_INTERVAL = 1.8;
  var WAVE_SPEED = 280;
  var particles = [];
  var correct = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var hitFeedback = '';
  var hitTimer = 0;
  var hitCol = C.correct;

  function spawnWave() {
    var dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    var col = DIR_COLORS[dir];
    waves.push({ dir: dir, col: col, y: -80, alpha: 1.0 });
    currentDir = dir;
  }

  game.onSwipe(function(dir) {
    if (done || !currentDir) return;
    if (dir === currentDir) {
      correct++;
      hitFeedback = DIR_ARROWS[dir] + ' 正解！';
      hitCol = C.correct;
      hitTimer = 0.5;
      game.audio.play('se_tap', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H/2, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.5, col: DIR_COLORS[dir] });
      }
      // Remove active wave
      for (var wi = waves.length - 1; wi >= 0; wi--) {
        if (waves[wi].dir === currentDir) { waves.splice(wi, 1); break; }
      }
      currentDir = waves.length > 0 ? waves[waves.length-1].dir : null;

      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(correct * 200 + Math.ceil(timeLeft) * 80); }, 600);
      }
    } else {
      misses++;
      hitFeedback = DIR_ARROWS[dir] + ' ミス！';
      hitCol = C.wrong;
      hitTimer = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    if (hitTimer > 0) hitTimer -= dt;

    // Spawn waves
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnWave();
      nextSpawn = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    // Move waves down
    for (var wi = waves.length - 1; wi >= 0; wi--) {
      waves[wi].y += WAVE_SPEED * dt;
      if (waves[wi].y > H + 80) {
        // Missed wave
        misses++;
        hitFeedback = 'ミス！';
        hitCol = C.wrong;
        hitTimer = 0.5;
        waves.splice(wi, 1);
        currentDir = waves.length > 0 ? waves[waves.length-1].dir : null;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
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

    // Background grid lines
    for (var gl = 0; gl < H; gl += 80) {
      game.draw.line(0, gl, W, gl, C.wave, 2);
    }

    // Waves
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var w = waves[wi2];
      var alpha = 1.0;
      game.draw.rect(0, w.y - 60, W, 120, w.col, 0.15 * alpha);
      game.draw.rect(0, w.y - 4, W, 8, w.col, 0.8 * alpha);
      // Arrow
      game.draw.text(DIR_ARROWS[w.dir], W/2, w.y + 20, { size: 80, color: w.col, bold: true });
    }

    // Legend bar at bottom
    var legendY = H * 0.85;
    game.draw.rect(0, legendY - 10, W, 100, '#000', 0.5);
    var dirs2 = ['up', 'down', 'left', 'right'];
    for (var di = 0; di < dirs2.length; di++) {
      var lx = W * 0.1 + di * (W * 0.8 / 3);
      var lcol = DIR_COLORS[dirs2[di]];
      game.draw.circle(lx, legendY + 30, 28, lcol, 0.8);
      game.draw.text(DIR_ARROWS[dirs2[di]], lx, legendY + 42, { size: 44, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Feedback
    if (hitTimer > 0) {
      game.draw.text(hitFeedback, W/2, H * 0.78, { size: 52, color: hitCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.963, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hint : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnWave();
  });
})(game);
