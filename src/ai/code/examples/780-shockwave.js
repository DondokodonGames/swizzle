// 780-shockwave.js
// ショックウェーブ — タップで衝撃波を発生させて敵をなぎ倒せ
// 操作: タップで衝撃波（拡大する輪）を発生させる（敵に当てろ）
// 成功: 60体撃破  失敗: 10体逃がす or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03050a',
    wave:    '#38bdf8',
    waveGlow:'#0369a1',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    hit:     '#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060810'
  };

  var waves = []; // { x, y, r, maxR, life }
  var enemies = []; // { x, y, r, vx, vy, hp }
  var spawnTimer = 0;
  var spawnRate = 0.8;

  var score = 0;
  var NEEDED = 60;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var multiKill = 0;

  function spawnEnemy() {
    // Enemies come from edges
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    var spd = 120 + Math.random() * 100 + score * 1.5;
    if (side === 0) { x = Math.random() * W; y = -40; vx = (Math.random() - 0.5) * 80; vy = spd; }
    else if (side === 1) { x = W + 40; y = Math.random() * H; vx = -spd; vy = (Math.random() - 0.5) * 80; }
    else if (side === 2) { x = Math.random() * W; y = H + 40; vx = (Math.random() - 0.5) * 80; vy = -spd; }
    else { x = -40; y = Math.random() * H; vx = spd; vy = (Math.random() - 0.5) * 80; }
    enemies.push({ x: x, y: y, r: 30 + Math.random() * 20, vx: vx, vy: vy, hp: 1, flash: 0 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    waves.push({ x: tx, y: ty, r: 0, maxR: 280, life: 1.0 });
    game.audio.play('se_tap', 0.1);
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

    // Spawn enemies
    spawnTimer -= dt;
    spawnRate = Math.max(0.35, 0.8 - score * 0.007);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = spawnRate;
      spawnEnemy();
      if (score > 30 && Math.random() < 0.4) spawnEnemy();
    }

    // Update waves
    var WAVE_SPEED = 480;
    for (var wi = waves.length - 1; wi >= 0; wi--) {
      var w = waves[wi];
      w.r += WAVE_SPEED * dt;
      w.life = 1 - w.r / w.maxR;
      if (w.life <= 0 || w.r >= w.maxR) {
        waves.splice(wi, 1);
        continue;
      }
      // Check collision with enemies
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e = enemies[ei];
        if (e.hp <= 0) continue;
        var dx = e.x - w.x;
        var dy = e.y - w.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        // Wave ring hits enemy if distance matches ring radius (±tolerance)
        if (Math.abs(dist - w.r) < e.r + 12) {
          e.hp--;
          e.flash = 0.3;
          if (e.hp <= 0) {
            // Killed!
            score++;
            for (var p = 0; p < 5; p++) {
              var pa = Math.random() * Math.PI * 2;
              particles.push({ x: e.x, y: e.y, vx: Math.cos(pa) * (100 + Math.random() * 160), vy: Math.sin(pa) * (100 + Math.random() * 160), life: 0.38, col: C.hit });
            }
            enemies.splice(ei, 1);
            if (score >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 120); }, 700);
            }
          }
        }
      }
    }

    // Update enemies
    for (var ei2 = enemies.length - 1; ei2 >= 0; ei2--) {
      var e2 = enemies[ei2];
      e2.x += e2.vx * dt;
      e2.y += e2.vy * dt;
      if (e2.flash > 0) e2.flash -= dt * 4;

      // Check if enemy escaped (reached center area too close or crossed screen)
      var distToCenter = Math.sqrt((e2.x - W / 2) * (e2.x - W / 2) + (e2.y - H / 2) * (e2.y - H / 2));
      if (distToCenter < 60 || e2.x < -60 || e2.x > W + 60 || e2.y < -60 || e2.y > H + 60) {
        if (distToCenter < 60) {
          escaped++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          resultText = '侵入！！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.35);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
        enemies.splice(ei2, 1);
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.6;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid (radar aesthetic)
    var gridSteps = 6;
    for (var gi = 1; gi <= gridSteps; gi++) {
      var gr = gi * W / 2 / gridSteps;
      for (var gj = 0; gj < 24; gj++) {
        if (gj % 3 === 2) continue;
        var ga = gj * Math.PI * 2 / 24;
        game.draw.circle(W / 2 + Math.cos(ga) * gr, H / 2 + Math.sin(ga) * gr, 2, '#0e3d5f', 0.4);
      }
    }
    // Cross lines
    game.draw.line(W / 2, H * 0.05, W / 2, H * 0.95, '#0e3d5f', 2);
    game.draw.line(W * 0.05, H / 2, W * 0.95, H / 2, '#0e3d5f', 2);

    // Center target
    game.draw.circle(W / 2, H / 2, 60, C.wave, 0.08);
    for (var ci = 0; ci < 12; ci++) {
      var ca = ci * Math.PI * 2 / 12;
      game.draw.circle(W / 2 + Math.cos(ca) * 60, H / 2 + Math.sin(ca) * 60, 4, C.wave, 0.3);
    }
    game.draw.circle(W / 2, H / 2, 12, C.wave, 0.5);

    // Shockwaves
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var w2 = waves[wi2];
      var alpha = w2.life * 0.7;
      for (var wj = 0; wj < 32; wj++) {
        if (wj % 4 === 3) continue;
        var wa = wj * Math.PI * 2 / 32;
        game.draw.circle(w2.x + Math.cos(wa) * w2.r, w2.y + Math.sin(wa) * w2.r, 7 * w2.life, C.wave, alpha);
      }
      // Inner glow ring
      if (w2.r > 10) {
        for (var wj2 = 0; wj2 < 20; wj2++) {
          if (wj2 % 3 === 2) continue;
          var wa2 = wj2 * Math.PI * 2 / 20;
          game.draw.circle(w2.x + Math.cos(wa2) * (w2.r - 20), w2.y + Math.sin(wa2) * (w2.r - 20), 4 * w2.life, C.waveGlow, alpha * 0.5);
        }
      }
    }

    // Enemies
    for (var ei3 = 0; ei3 < enemies.length; ei3++) {
      var e3 = enemies[ei3];
      var col = e3.flash > 0 ? C.enemyHi : C.enemy;
      game.draw.circle(e3.x + 3, e3.y + 3, e3.r, '#000', 0.25);
      game.draw.circle(e3.x, e3.y, e3.r, col, 0.9);
      game.draw.circle(e3.x - e3.r * 0.3, e3.y - e3.r * 0.3, e3.r * 0.2, '#fff', 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('タップで衝撃波！', W / 2, H * 0.88, { size: 36, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var ei4 = 0; ei4 < MAX_ESCAPE; ei4++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 44 + ei4 * 88, H * 0.955, 18, ei4 < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnEnemy();
    spawnEnemy();
  });
})(game);
