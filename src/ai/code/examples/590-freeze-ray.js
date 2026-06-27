// 590-freeze-ray.js
// フリーズレイ — 暴走する敵を凍らせて安全に処理する時間管理ゲーム
// 操作: タップで凍結ビーム発射、スワイプで照準移動
// 成功: 20体凍結処理  失敗: 5体逃走 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    ice:     '#88ccff',
    iceHi:   '#ddeeff',
    frozen:  '#44aaff',
    frozenHi:'#aaddff',
    enemy:   '#ff4422',
    enemyHi: '#ff8866',
    beam:    '#00ffff',
    beamHi:  '#ffffff',
    escape:  '#ef4444',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#0a1a2a'
  };

  var enemies = [];
  var beamX = W / 2, beamY = H / 2;
  var beamActive = false;
  var beamTimer = 0;
  var handled = 0;
  var NEEDED = 20;
  var escaped = 0;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.safe;
  var nextEnemy = 1.5;
  var difficulty = 1;

  function spawnEnemy() {
    var edge = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    var speed = 120 + difficulty * 30;
    if (edge === 0) { x = Math.random() * W; y = -60; vx = (Math.random() - 0.5) * speed; vy = speed * 0.6; }
    else if (edge === 1) { x = W + 60; y = Math.random() * H; vx = -speed * 0.6; vy = (Math.random() - 0.5) * speed; }
    else if (edge === 2) { x = Math.random() * W; y = H + 60; vx = (Math.random() - 0.5) * speed; vy = -speed * 0.6; }
    else { x = -60; y = Math.random() * H; vx = speed * 0.6; vy = (Math.random() - 0.5) * speed; }

    enemies.push({
      x: x, y: y, vx: vx, vy: vy,
      r: 32, state: 'moving',
      frozenTimer: 0, frozenMax: 0,
      wobble: Math.random() * Math.PI * 2,
      col: C.enemy
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    beamX = tx;
    beamY = ty;
    beamActive = true;
    beamTimer = 0.4;
    game.audio.play('se_tap', 0.3);

    // Freeze nearby enemies
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei];
      if (e.state !== 'moving') continue;
      var dx = tx - e.x, dy = ty - e.y;
      if (dx * dx + dy * dy < (80 + e.r) * (80 + e.r)) {
        e.state = 'frozen';
        e.frozenMax = 2.5 - difficulty * 0.1;
        e.frozenTimer = e.frozenMax;
        e.vx = 0; e.vy = 0;
        game.audio.play('se_success', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.iceHi });
        }
      }
    }

    // Tap on frozen = handle (remove)
    for (var ei2 = enemies.length - 1; ei2 >= 0; ei2--) {
      var e2 = enemies[ei2];
      if (e2.state !== 'frozen') continue;
      var dx2 = tx - e2.x, dy2 = ty - e2.y;
      if (dx2 * dx2 + dy2 * dy2 < (60 + e2.r) * (60 + e2.r)) {
        enemies.splice(ei2, 1);
        handled++;
        flashCol = C.safe;
        flashAnim = 0.2;
        game.audio.play('se_success', 0.6);
        for (var pi2 = 0; pi2 < 10; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: tx, y: ty, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.frozenHi });
        }
        if (handled >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(handled * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    beamX = x2; beamY = y2;
    beamActive = true;
    beamTimer = 0.3;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      difficulty = 1 + elapsed / 20;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (beamTimer > 0) beamTimer -= dt;
    else beamActive = false;

    // Spawn
    nextEnemy -= dt;
    if (nextEnemy <= 0 && !done) {
      spawnEnemy();
      nextEnemy = Math.max(0.5, 1.8 - difficulty * 0.15);
    }

    // Update enemies
    for (var ei = enemies.length - 1; ei >= 0; ei--) {
      var e = enemies[ei];
      e.wobble += dt * 3;

      if (e.state === 'moving') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        // Bounce off walls
        if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx); }
        if (e.x > W - e.r) { e.x = W - e.r; e.vx = -Math.abs(e.vx); }
        if (e.y < e.r) { e.y = e.r; e.vy = Math.abs(e.vy); }
        if (e.y > H - e.r) { e.y = H - e.r; e.vy = -Math.abs(e.vy); }
      } else if (e.state === 'frozen') {
        e.frozenTimer -= dt;
        if (e.frozenTimer <= 0) {
          // Thaws — becomes moving again faster
          e.state = 'moving';
          var speed = 150 + difficulty * 40;
          var ang = Math.random() * Math.PI * 2;
          e.vx = Math.cos(ang) * speed;
          e.vy = Math.sin(ang) * speed;
        }
      }

      // Escape check (off screen for a while)
      if (e.state === 'moving' && (e.x < -100 || e.x > W + 100 || e.y < -100 || e.y > H + 100)) {
        enemies.splice(ei, 1);
        escaped++;
        flashCol = C.escape;
        flashAnim = 0.35;
        game.audio.play('se_failure', 0.4);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Beam effect
    if (beamActive) {
      game.draw.circle(beamX, beamY, 60, C.beam, 0.15);
      game.draw.circle(beamX, beamY, 30, C.beam, 0.3);
      game.draw.circle(beamX, beamY, 14, C.beamHi, 0.6);
    }

    // Enemies
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var e2 = enemies[ei2];
      var wobble = Math.sin(e2.wobble);
      if (e2.state === 'frozen') {
        var iceAlpha = e2.frozenTimer / e2.frozenMax;
        game.draw.circle(e2.x, e2.y, e2.r + 18, C.ice, iceAlpha * 0.4);
        game.draw.circle(e2.x, e2.y, e2.r + 6, C.frozen, iceAlpha * 0.8);
        game.draw.circle(e2.x, e2.y, e2.r, C.frozenHi, 0.7);
        game.draw.circle(e2.x - 8, e2.y - 8, e2.r * 0.3, C.iceHi, 0.5);
      } else {
        game.draw.circle(e2.x, e2.y, e2.r + 10 + wobble * 6, C.enemy, 0.2);
        game.draw.circle(e2.x, e2.y, e2.r, C.enemy, 0.9);
        game.draw.circle(e2.x - 8, e2.y - 8, e2.r * 0.3, C.enemyHi, 0.5);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Escape dots
    for (var esc = 0; esc < MAX_ESCAPE; esc++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 60 + esc * 120, H * 0.955, 22, esc < escaped ? C.escape : C.ui, 0.9);
    }

    game.draw.text(handled + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.ice : C.escape);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnEnemy();
    spawnEnemy();
  });
})(game);
