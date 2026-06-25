// 318-puppet-pull.js
// パペットプル — 糸を引いて木製人形を踊らせながら落下するコインを集める
// 操作: 左右スワイプで人形の腕を動かしてコインをキャッチ
// 成功: 30コイン収集  失敗: 20コイン逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0a00',
    wood:   '#b45309',
    woodHi: '#d97706',
    string: '#fde68a',
    coin:   '#fbbf24',
    coinHi: '#fef3c7',
    miss:   '#ef4444',
    stage:  '#292524',
    stageHi:'#44403c',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  // Puppet
  var puppetX = W / 2;
  var armAngleL = -0.5;
  var armAngleR = 0.5;
  var armTarget = 0; // -1=left, 0=neutral, 1=right
  var bodyBob = 0;

  // Coins
  var coins = [];
  var spawnTimer = 0;
  var collected = 0;
  var NEEDED = 30;
  var missed = 0;
  var MAX_MISS = 20;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var catchAnim = 0;

  function spawnCoin() {
    coins.push({
      x: 80 + Math.random() * (W - 160),
      y: -30,
      vy: 220 + Math.random() * 80,
      r: 28
    });
  }

  function catchRadius(side) {
    // arm tip position
    var angle = side < 0 ? armAngleL : armAngleR;
    var cx = puppetX + side * 120;
    var ay = H * 0.55 + Math.sin(angle) * 10;
    var ax = cx + Math.cos(angle) * 80 * side;
    return { x: ax, y: ay };
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') { armTarget = -1; }
    else if (dir === 'right') { armTarget = 1; }
  });

  game.onTap(function() {
    if (done) return;
    armTarget = 0;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    bodyBob += dt * 3;
    if (catchAnim > 0) catchAnim -= dt * 2;

    // Animate arms toward target
    var targetL = armTarget === -1 ? -1.2 : -0.3;
    var targetR = armTarget === 1 ? 1.2 : 0.3;
    armAngleL += (targetL - armAngleL) * dt * 6;
    armAngleR += (targetR - armAngleR) * dt * 6;

    // Spawn coins
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnCoin();
      spawnTimer = 0.5 + Math.random() * 0.4;
    }

    // Update coins
    var leftTip = catchRadius(-1);
    var rightTip = catchRadius(1);

    for (var ci = coins.length - 1; ci >= 0; ci--) {
      var c = coins[ci];
      c.y += c.vy * dt;

      // Check catch by left or right arm tip
      var dl = Math.hypot(c.x - leftTip.x, c.y - leftTip.y);
      var dr = Math.hypot(c.x - rightTip.x, c.y - rightTip.y);
      if (dl < 60 || dr < 60) {
        collected++;
        catchAnim = 1;
        game.audio.play('se_tap', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: c.x, y: c.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180 - 60, life: 0.5, col: C.coinHi });
        }
        coins.splice(ci, 1);
        if (collected >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(collected * 80 + Math.ceil(timeLeft) * 60); }, 400);
        }
        continue;
      }

      // Miss
      if (c.y > H + 40) {
        missed++;
        game.audio.play('se_failure', 0.2);
        coins.splice(ci, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stage curtains
    game.draw.rect(0, 0, 140, H, C.stage, 0.9);
    game.draw.rect(W - 140, 0, 140, H, C.stage, 0.9);
    game.draw.rect(0, 0, 140, 80, C.stageHi, 0.9);
    game.draw.rect(W - 140, 0, 140, 80, C.stageHi, 0.9);

    // Coins
    for (var ci2 = 0; ci2 < coins.length; ci2++) {
      var co = coins[ci2];
      game.draw.circle(co.x, co.y, co.r + 4, C.coin, 0.3);
      game.draw.circle(co.x, co.y, co.r, C.coin, 0.9);
      game.draw.circle(co.x, co.y, co.r * 0.5, C.coinHi, 0.6);
    }

    // Puppet strings from top
    var bobY = Math.sin(bodyBob) * 8;
    var px = puppetX, py = H * 0.52 + bobY;
    game.draw.line(px, 0, px, py - 120, C.string, 3);
    game.draw.line(px - 120, 0, px - 120 + Math.cos(armAngleL) * 80, py + Math.sin(armAngleL) * 10, C.string, 2);
    game.draw.line(px + 120, 0, px + 120 + Math.cos(armAngleR) * 80, py + Math.sin(armAngleR) * 10, C.string, 2);

    // Body
    game.draw.circle(px, py - 80, 44, C.woodHi, 0.3);
    game.draw.circle(px, py - 80, 40, C.wood, 0.95); // head
    game.draw.circle(px - 10, py - 88, 8, '#fff', 0.9); // eyes
    game.draw.circle(px + 10, py - 88, 8, '#fff', 0.9);
    game.draw.circle(px - 10, py - 88, 4, '#1c1917', 0.9);
    game.draw.circle(px + 10, py - 88, 4, '#1c1917', 0.9);
    game.draw.rect(px - 20, py - 40, 40, 80, C.wood, 0.95); // torso

    // Left arm
    var lx = px - 120, ly = py;
    game.draw.line(lx, ly, lx + Math.cos(armAngleL) * 80, ly + Math.sin(armAngleL) * 30, C.wood, 18);
    game.draw.circle(lx + Math.cos(armAngleL) * 80, ly + Math.sin(armAngleL) * 30, 20, C.woodHi, 0.8);

    // Right arm
    var rx = px + 120, ry = py;
    game.draw.line(rx, ry, rx + Math.cos(armAngleR) * 80, ry + Math.sin(armAngleR) * 30, C.wood, 18);
    game.draw.circle(rx + Math.cos(armAngleR) * 80, ry + Math.sin(armAngleR) * 30, 20, C.woodHi, 0.8);

    // Legs
    game.draw.line(px - 16, py + 40, px - 30, py + 110, C.wood, 18);
    game.draw.line(px + 16, py + 40, px + 30, py + 110, C.wood, 18);

    // Catch flash
    if (catchAnim > 0) {
      game.draw.circle(px, py, 80 * catchAnim, C.coinHi, catchAnim * 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life * 2, p.col, p.life * 0.8);
    }

    // Miss dots
    game.draw.text('MISS', W * 0.5, H * 0.85, { size: 32, color: C.ui });
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var row = Math.floor(mi / 10);
      var col = mi % 10;
      game.draw.circle(W / 2 - 9 * 22 + col * 22, H * 0.88 + row * 30, 8, mi < missed ? C.miss : '#292524');
    }

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coin : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.3;
  });
})(game);
