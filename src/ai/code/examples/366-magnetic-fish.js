// 366-magnetic-fish.js
// マグネットフィッシュ — 磁石のついた釣り竿で深海の金属魚を釣る
// 操作: タップで磁石を降ろす/上げる
// 成功: 15匹釣る  失敗: 赤い危険魚を3回釣る or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000820',
    water:  '#0c1f3d',
    waterHi:'#1e3a6e',
    deep:   '#000412',
    line:   '#94a3b8',
    magnet: '#ef4444',
    magnetHi:'#fca5a5',
    fishG:  '#22c55e',  // good fish
    fishGHi:'#86efac',
    fishB:  '#ef4444',  // bad fish
    fishBHi:'#fca5a5',
    bubbles:'#60a5fa',
    caught: '#fbbf24',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var rodX = W * 0.5;
  var rodY = 200;
  var magnetY = 280;
  var magnetTargetY = 280;
  var MAGNET_SPEED = 700;
  var reeling = false;
  var dropping = false;

  var fish = [];
  var caughtFish = [];
  var caught = 0;
  var NEEDED = 15;
  var badCaught = 0;
  var MAX_BAD = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var bubbles = [];
  var spawnTimer = 0;
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.caught;

  function spawnFish() {
    var isBad = Math.random() < 0.25;
    var side = Math.random() < 0.5 ? 0 : 1;
    var fy = H * 0.45 + Math.random() * H * 0.4;
    fish.push({
      x: side === 0 ? -60 : W + 60,
      y: fy,
      vx: side === 0 ? 60 + Math.random() * 60 : -(60 + Math.random() * 60),
      vy: (Math.random() - 0.5) * 30,
      r: 28,
      isBad: isBad,
      attracted: false,
      attractTimer: 0
    });
  }

  game.onTap(function() {
    if (done) return;
    if (!dropping && !reeling) {
      dropping = true;
      magnetTargetY = H * 0.82;
    } else if (dropping) {
      dropping = false;
      reeling = true;
      magnetTargetY = 280;
    } else if (reeling) {
      // nothing
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    // Move magnet
    var magDiff = magnetTargetY - magnetY;
    var magMove = MAGNET_SPEED * dt;
    if (Math.abs(magDiff) < magMove) {
      magnetY = magnetTargetY;
      if (reeling && magnetY <= 300) {
        reeling = false;
        // Check if any fish attached
        for (var fi = fish.length - 1; fi >= 0; fi--) {
          if (fish[fi].attracted) {
            var f = fish[fi];
            fish.splice(fi, 1);
            if (f.isBad) {
              badCaught++;
              resultText = '危険魚！';
              resultCol = C.fishBHi;
              resultAnim = 0.7;
              game.audio.play('se_failure', 0.5);
              for (var pi2 = 0; pi2 < 8; pi2++) {
                var ang2 = Math.random() * Math.PI * 2;
                particles.push({ x: rodX, y: 280, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.5, col: C.fishBHi });
              }
              if (badCaught >= MAX_BAD && !done) {
                done = true;
                setTimeout(function() { game.end.failure(); }, 400);
                return;
              }
            } else {
              caught++;
              resultText = '釣れた！';
              resultCol = C.caught;
              resultAnim = 0.6;
              game.audio.play('se_success', 0.5);
              for (var pi3 = 0; pi3 < 8; pi3++) {
                var ang3 = Math.random() * Math.PI * 2;
                particles.push({ x: rodX, y: 280, vx: Math.cos(ang3)*180, vy: Math.sin(ang3)*180, life:0.5, col: C.caught });
              }
              if (caught >= NEEDED && !done) {
                done = true;
                setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 80); }, 500);
                return;
              }
            }
          }
        }
      }
    } else {
      magnetY += Math.sign(magDiff) * magMove;
    }

    // Spawn fish
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnFish();
      spawnTimer = 0.8 + Math.random() * 0.5;
    }

    // Update fish
    for (var fi2 = fish.length - 1; fi2 >= 0; fi2--) {
      var f2 = fish[fi2];

      // Fish attracted to magnet
      var distToMagnet = Math.hypot(f2.x - rodX, f2.y - magnetY);
      if (!f2.isBad && distToMagnet < 100) {
        f2.attracted = true;
        f2.attractTimer += dt;
      }

      if (f2.attracted) {
        // Move toward magnet
        var dx = rodX - f2.x, dy = magnetY - f2.y;
        var len = Math.sqrt(dx*dx+dy*dy);
        f2.x += (dx/len) * 200 * dt;
        f2.y += (dy/len) * 200 * dt;
        if (len < 20) {
          // Snap to magnet
          f2.x = rodX;
          f2.y = magnetY;
        }
      } else {
        f2.x += f2.vx * dt;
        f2.y += f2.vy * dt + Math.sin(elapsed * 2 + fi2) * 10 * dt;
      }

      // Off screen
      if ((f2.x < -200 || f2.x > W + 200) && !f2.attracted) {
        fish.splice(fi2, 1);
      }
    }

    // Bubbles
    if (Math.random() < dt * 6) {
      bubbles.push({ x: W * 0.1 + Math.random() * W * 0.8, y: H, vy: -40 - Math.random() * 30, r: 4 + Math.random() * 8, life: 3 });
    }
    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      bubbles[bi].y += bubbles[bi].vy * dt;
      bubbles[bi].x += Math.sin(elapsed + bi) * 20 * dt;
      bubbles[bi].life -= dt;
      if (bubbles[bi].life <= 0 || bubbles[bi].y < H * 0.4) bubbles.splice(bi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Water
    game.draw.rect(0, H * 0.38, W, H * 0.62, C.water, 0.8);
    game.draw.rect(0, H * 0.38, W, H * 0.62, C.deep, 0.4);
    // Surface
    for (var sx = 0; sx < W; sx += 80) {
      var sw = Math.sin(elapsed * 2 + sx * 0.02) * 12;
      game.draw.circle(sx + 40, H * 0.38 + sw, 40, C.waterHi, 0.3);
    }

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b = bubbles[bi2];
      game.draw.circle(b.x, b.y, b.r, C.bubbles, 0.3);
    }

    // Fish
    for (var fi3 = 0; fi3 < fish.length; fi3++) {
      var f3 = fish[fi3];
      var fCol = f3.isBad ? C.fishB : C.fishG;
      var fColHi = f3.isBad ? C.fishBHi : C.fishGHi;
      game.draw.circle(f3.x, f3.y, f3.r, fCol, 0.85);
      // Tail
      game.draw.circle(f3.x - Math.sign(f3.vx) * f3.r, f3.y, f3.r * 0.6, fCol, 0.7);
      // Eye
      game.draw.circle(f3.x + Math.sign(f3.vx) * f3.r * 0.4, f3.y - 6, 8, fColHi, 0.9);
      game.draw.circle(f3.x + Math.sign(f3.vx) * f3.r * 0.4, f3.y - 6, 4, '#000', 0.9);
      if (f3.attracted) {
        game.draw.circle(f3.x, f3.y, f3.r + 10, C.magnet, 0.2 + Math.sin(elapsed * 10) * 0.1);
      }
    }

    // Fishing line
    game.draw.line(rodX, rodY, rodX, magnetY, C.line, 3);

    // Magnet
    game.draw.circle(rodX, magnetY, 24, C.magnet, 0.9);
    game.draw.circle(rodX - 10, magnetY - 8, 8, C.magnetHi, 0.8);
    game.draw.text('U', rodX, magnetY + 10, { size: 24, color: C.magnetHi, bold: true });

    // Rod
    game.draw.rect(rodX - 10, rodY - 40, 20, 60, '#78716c', 0.9);
    game.draw.rect(rodX - 60, rodY - 50, 120, 14, '#92400e', 0.9);

    // Instructions
    if (!dropping && !reeling) {
      game.draw.text('タップで降ろす', W / 2, H * 0.87, { size: 40, color: C.ui });
    } else if (dropping) {
      game.draw.text('タップで巻き上げ！', W / 2, H * 0.87, { size: 40, color: C.fishGHi });
    } else {
      game.draw.text('巻き上げ中...', W / 2, H * 0.87, { size: 40, color: C.line });
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 60, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Bad dots
    for (var bdi = 0; bdi < MAX_BAD; bdi++) {
      game.draw.circle(W / 2 - (MAX_BAD - 1) * 28 + bdi * 56, H * 0.92, 16, bdi < badCaught ? C.fishB : '#0a0820');
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.waterHi : C.fishB);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.5;
  });
})(game);
