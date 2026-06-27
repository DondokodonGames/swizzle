// 799-avalanche.js
// アバランシュ — 雪崩を引き起こす岩を最後の瞬間にタップで爆破せよ
// 操作: タップ — 落下する岩が爆破ゾーン（画面下部）に入った瞬間
// 成功: 35個爆破  失敗: 10個着地 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#060404',
    mountain: '#1c1410',
    snow:     '#c8d8e0',
    rock:     '#6b5c4a',
    rockHi:   '#9c8c7a',
    zone:     '#fbbf24',
    zoneFade: '#7c5c00',
    explode:  '#f97316',
    explodeHi:'#fef3c7',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#060404'
  };

  var BLAST_ZONE_Y = H * 0.76; // rocks in this zone can be tapped
  var BLAST_ZONE_H = H * 0.12;
  var GROUND_Y = H * 0.9;

  var rocks = []; // { x, y, vy, r, tapped, landed }
  var spawnTimer = 0;
  var SPAWN_RATE = 0.9;

  var score = 0;
  var NEEDED = 35;
  var landed = 0;
  var MAX_LAND = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var explosions = [];
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnRock() {
    var x = W * 0.08 + Math.random() * W * 0.84;
    var r = 28 + Math.random() * 22;
    var vy = 200 + Math.random() * 180 + score * 4;
    rocks.push({ x: x, y: -r, vy: vy, r: r, tapped: false, landed: false, rotAngle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 3 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check for rock in blast zone
    var hit = false;
    for (var i = rocks.length - 1; i >= 0; i--) {
      var rock = rocks[i];
      if (rock.tapped || rock.landed) continue;
      var inZone = rock.y >= BLAST_ZONE_Y && rock.y <= BLAST_ZONE_Y + BLAST_ZONE_H;
      if (!inZone) continue;
      var dx = tx - rock.x;
      var dy = ty - rock.y;
      if (Math.sqrt(dx * dx + dy * dy) < rock.r + 40) {
        // Explode!
        rock.tapped = true;
        score++;
        flashCol = C.correct;
        flashAnim = 0.18;
        resultText = '爆破！';
        resultTimer = 0.32;
        game.audio.play('se_success', 0.6);
        explosions.push({ x: rock.x, y: rock.y, r: 0, maxR: rock.r * 4, life: 1.0 });
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: rock.x, y: rock.y, vx: Math.cos(pa) * (160 + Math.random() * 120), vy: Math.sin(pa) * (160 + Math.random() * 120) - 40, life: 0.5, col: C.explode });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 320 + Math.ceil(timeLeft) * 130); }, 700);
          return;
        }
        hit = true;
        break;
      }
    }
    // Missed tap (not on a rock in zone)
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

    // Spawn
    spawnTimer -= dt;
    SPAWN_RATE = Math.max(0.4, 0.9 - score * 0.01);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = SPAWN_RATE;
      spawnRock();
      if (score > 15 && Math.random() < 0.35) spawnRock();
    }

    // Update rocks
    for (var ri = rocks.length - 1; ri >= 0; ri--) {
      var rock = rocks[ri];
      if (!rock.tapped) {
        rock.y += rock.vy * dt;
        rock.rotAngle += rock.rotSpeed * dt;
        rock.vy += 180 * dt; // gravity

        if (rock.y >= GROUND_Y && !rock.landed) {
          rock.landed = true;
          landed++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          resultText = '着地！！';
          resultTimer = 0.42;
          game.audio.play('se_failure', 0.35);
          // Ground impact particles
          for (var b = 0; b < 5; b++) {
            var ba = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            particles.push({ x: rock.x, y: GROUND_Y, vx: Math.cos(ba) * 120, vy: Math.sin(ba) * 120 - 80, life: 0.4, col: C.snow });
          }
          if (landed >= MAX_LAND && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
      // Remove if off screen or landed+settled
      if (rock.y > H + 100 || (rock.landed && rock.y > GROUND_Y + 50)) {
        rocks.splice(ri, 1);
      }
    }

    // Explosions
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var ex = explosions[ei];
      ex.r += 600 * dt;
      ex.life = 1 - ex.r / ex.maxR;
      if (ex.life <= 0) explosions.splice(ei, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 350 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Mountain silhouette (simple triangles)
    game.draw.circle(W * 0.25, H * 0.68, W * 0.32, C.mountain, 0.95);
    game.draw.circle(W * 0.75, H * 0.65, W * 0.35, C.mountain, 0.95);
    game.draw.circle(W * 0.5, H * 0.6, W * 0.28, C.mountain, 0.95);
    // Snow caps
    game.draw.circle(W * 0.25, H * 0.5, W * 0.1, C.snow, 0.5);
    game.draw.circle(W * 0.75, H * 0.47, W * 0.11, C.snow, 0.5);
    game.draw.circle(W * 0.5, H * 0.44, W * 0.09, C.snow, 0.55);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#2a1c0e', 0.95);
    game.draw.rect(0, GROUND_Y, W, 8, C.snow, 0.4);

    // Blast zone indicator
    game.draw.rect(0, BLAST_ZONE_Y, W, BLAST_ZONE_H, C.zone, 0.06 + 0.04 * Math.sin(elapsed * 4));
    game.draw.line(0, BLAST_ZONE_Y, W, BLAST_ZONE_Y, C.zone, 3);
    game.draw.line(0, BLAST_ZONE_Y + BLAST_ZONE_H, W, BLAST_ZONE_Y + BLAST_ZONE_H, C.zoneFade, 2);
    game.draw.text('爆破ゾーン', W / 2, BLAST_ZONE_Y + BLAST_ZONE_H / 2 + 8, { size: 32, color: C.zone + 'aa' });

    // Rocks
    for (var ri2 = 0; ri2 < rocks.length; ri2++) {
      var rock2 = rocks[ri2];
      if (rock2.tapped) continue;
      var inBlastZone = rock2.y >= BLAST_ZONE_Y && rock2.y <= BLAST_ZONE_Y + BLAST_ZONE_H;
      var rCol = inBlastZone ? C.zone : C.rock;

      // Rock shape (irregular polygon via circles)
      var ra = rock2.rotAngle;
      game.draw.circle(rock2.x + 4, rock2.y + 4, rock2.r, '#000', 0.3);
      game.draw.circle(rock2.x, rock2.y, rock2.r, rCol, 0.9);
      game.draw.circle(rock2.x + Math.cos(ra) * rock2.r * 0.5, rock2.y + Math.sin(ra) * rock2.r * 0.5, rock2.r * 0.45, inBlastZone ? C.explodeHi : C.rockHi, 0.4);

      if (inBlastZone) {
        game.draw.circle(rock2.x, rock2.y, rock2.r + 20 + 6 * Math.sin(elapsed * 10), C.zone, 0.2);
      }
    }

    // Explosions
    for (var ex2 = 0; ex2 < explosions.length; ex2++) {
      var exp = explosions[ex2];
      game.draw.circle(exp.x, exp.y, exp.r, C.explode, exp.life * 0.5);
      game.draw.circle(exp.x, exp.y, exp.r * 0.5, C.explodeHi, exp.life * 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('ゾーンでタップ！', W / 2, H * 0.13, { size: 40, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var li = 0; li < MAX_LAND; li++) {
      game.draw.circle(W / 2 - (MAX_LAND - 1) * 44 + li * 88, H * 0.955, 18, li < landed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnRock();
  });
})(game);
