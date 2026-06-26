// 434-arrow-rain.js
// 矢の雨 — 降り注ぐ矢の方向を見て素早くスワイプ
// 操作: 矢印が指す方向にスワイプ
// 成功: 50回正解  失敗: 3回間違い or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0800',
    sky:    '#1a0e00',
    arrow:  '#f59e0b',
    arrowHi:'#fde68a',
    shaft:  '#92400e',
    feather:'#dc2626',
    flash0: '#22c55e',
    flash1: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444',
    correct:'#22c55e'
  };

  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_ANGLES = { up: -Math.PI/2, down: Math.PI/2, left: Math.PI, right: 0 };

  var arrows = [];
  var currentArrow = null;
  var nextSpawn = 0.5;
  var spawnInterval = 2.0;

  var correct = 0;
  var NEEDED = 50;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var combo = 0;

  function spawnArrow() {
    var dir = DIRS[Math.floor(Math.random() * 4)];
    var x = W / 2 + (Math.random() - 0.5) * 300;
    var entryY = -200;
    var targetY = H * 0.42;
    var speed = 400 + correct * 4;
    currentArrow = {
      x: x,
      y: entryY,
      dir: dir,
      angle: DIR_ANGLES[dir],
      vy: speed,
      arrived: false,
      answered: false,
      flashTimer: 0,
      result: null
    };
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (!currentArrow || !currentArrow.arrived || currentArrow.answered) return;

    currentArrow.answered = true;

    if (dir === currentArrow.dir) {
      correct++;
      combo++;
      currentArrow.result = 'correct';
      currentArrow.flashTimer = 0.5;
      flashCol = C.correct;
      flashAnim = 0.4;
      var bonus = combo >= 5 ? 0.8 : 0.5;
      game.audio.play('se_success', bonus);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: currentArrow.x, y: currentArrow.y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.4, col: C.arrowHi });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 200 + combo * 50 + Math.ceil(timeLeft) * 80); }, 600);
      }
    } else {
      misses++;
      combo = 0;
      currentArrow.result = 'wrong';
      currentArrow.flashTimer = 0.5;
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
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

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !currentArrow && !done) {
      spawnArrow();
      spawnInterval = Math.max(0.9, 2.0 - correct * 0.02);
    }

    // Update arrow
    if (currentArrow) {
      if (!currentArrow.arrived) {
        currentArrow.y += currentArrow.vy * dt;
        if (currentArrow.y >= H * 0.42) {
          currentArrow.y = H * 0.42;
          currentArrow.arrived = true;
          game.audio.play('se_tap', 0.15);
        }
      } else {
        if (currentArrow.flashTimer > 0) currentArrow.flashTimer -= dt;
        if (currentArrow.answered && currentArrow.flashTimer <= 0) {
          // Remove after answered
          if (currentArrow.result === 'correct') {
            currentArrow.y -= 300 * dt;  // arrow flies off
          } else {
            currentArrow.y += 200 * dt;
          }
          if (currentArrow.y < -200 || currentArrow.y > H + 200) {
            currentArrow = null;
            nextSpawn = spawnInterval;
          }
        }
        // Timeout — if not answered in time
        if (!currentArrow.answered) {
          currentArrow.vy += 200 * dt;
          currentArrow.y += currentArrow.vy * dt;
          if (currentArrow.y > H + 100) {
            misses++;
            combo = 0;
            flashCol = C.wrong;
            flashAnim = 0.4;
            game.audio.play('se_failure', 0.3);
            currentArrow = null;
            nextSpawn = spawnInterval;
            if (misses >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 400);
            }
          }
        }
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.5);

    // Draw swipe direction hint icons at edges
    var hintAlpha = currentArrow && currentArrow.arrived && !currentArrow.answered ? 0.3 : 0.1;
    game.draw.circle(W/2, 80, 35, C.ui, hintAlpha);   // up
    game.draw.circle(W/2, H-80, 35, C.ui, hintAlpha); // down
    game.draw.circle(80, H/2, 35, C.ui, hintAlpha);   // left
    game.draw.circle(W-80, H/2, 35, C.ui, hintAlpha); // right

    // Arrow
    if (currentArrow) {
      var ar = currentArrow;
      var arCol = ar.result === 'correct' ? C.flash0 : ar.result === 'wrong' ? C.flash1 : C.arrow;
      var arAlpha = ar.flashTimer > 0 ? 0.7 + Math.sin(elapsed*20)*0.3 : 0.9;

      // Shaft
      var shaftLen = 160;
      var sx = ar.x - Math.cos(ar.angle) * shaftLen;
      var sy = ar.y - Math.sin(ar.angle) * shaftLen;
      game.draw.line(ar.x, ar.y, sx, sy, C.shaft, 12);
      game.draw.line(ar.x, ar.y, sx, sy, C.arrow, 5);

      // Arrowhead
      game.draw.circle(ar.x, ar.y, 24, arCol, arAlpha);
      // Two wings of arrowhead
      var perpA = ar.angle + Math.PI/2;
      var tipX = ar.x + Math.cos(ar.angle) * 40;
      var tipY = ar.y + Math.sin(ar.angle) * 40;
      game.draw.line(tipX, tipY, ar.x + Math.cos(perpA)*20, ar.y + Math.sin(perpA)*20, arCol, 10);
      game.draw.line(tipX, tipY, ar.x - Math.cos(perpA)*20, ar.y - Math.sin(perpA)*20, arCol, 10);

      // Feathers
      var feaX = sx;
      var feaY = sy;
      game.draw.circle(feaX + Math.cos(perpA)*14, feaY + Math.sin(perpA)*14, 12, C.feather, 0.7);
      game.draw.circle(feaX - Math.cos(perpA)*14, feaY - Math.sin(perpA)*14, 12, C.feather, 0.7);

      // Direction label
      if (ar.arrived && !ar.answered) {
        var dirLabel = { up:'↑', down:'↓', left:'←', right:'→' };
        game.draw.circle(ar.x, ar.y, 80, arCol, 0.12 + Math.sin(elapsed*6)*0.06);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Combo
    if (combo >= 3) {
      game.draw.text(combo + 'コンボ！', W/2, H*0.72, { size: 48, color: C.arrowHi, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.arrow : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    nextSpawn = 0.3;
  });
})(game);
