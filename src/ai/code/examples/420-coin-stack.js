// 420-coin-stack.js
// 硬貨積み上げ — コインをバランスよく積んでタワーを作る
// 操作: タップで落下位置を決め、コインを積む
// 成功: 20枚積む  失敗: タワーが崩れる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0a04',
    gold:   '#d97706',
    goldHi: '#fbbf24',
    goldLo: '#92400e',
    silver: '#94a3b8',
    silverHi:'#e2e8f0',
    copper: '#b45309',
    copperHi:'#d97706',
    shadow: '#000',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444',
    correct:'#22c55e'
  };

  var COIN_TYPES = [
    { col: C.gold, hi: C.goldHi, lo: C.goldLo, r: 45 },
    { col: C.silver, hi: C.silverHi, lo: C.silver, r: 38 },
    { col: C.copper, hi: C.copperHi, lo: C.copper, r: 50 }
  ];

  var coins = [];
  var dropping = null;
  var dropX = W / 2;
  var dropSpeed = -600;
  var FLOOR_Y = H * 0.85;
  var stacked = 0;
  var NEEDED = 20;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var swayTimer = 0;
  var towerSway = 0;  // accumulated lean angle
  var collapsed = false;
  var collapseAnim = 0;

  function getTopCoin() {
    return coins.length > 0 ? coins[coins.length - 1] : null;
  }

  function getTopY() {
    var top = getTopCoin();
    if (top) return top.y - top.type.r * 2;
    return FLOOR_Y;
  }

  function spawnDrop() {
    var typeIdx = Math.floor(Math.random() * COIN_TYPES.length);
    dropping = {
      x: dropX,
      y: 120,
      type: COIN_TYPES[typeIdx],
      falling: false,
      wobble: 0
    };
  }

  function checkCollapse() {
    if (Math.abs(towerSway) > 0.6) return true;
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done || collapsed) return;
    if (!dropping) return;

    if (!dropping.falling) {
      dropping.x = tx;
      dropX = tx;
      dropping.falling = true;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (!dropping || dropping.falling) return;
    var step = 80;
    if (dir === 'left') dropX = Math.max(60, dropX - step);
    else if (dir === 'right') dropX = Math.min(W - 60, dropX + step);
    dropping.x = dropX;
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    swayTimer += dt;

    // Tower natural sway
    if (coins.length > 5) {
      towerSway += Math.sin(swayTimer * 1.5) * dt * (coins.length - 5) * 0.008;
      towerSway *= (1 - dt * 0.5);
    }

    if (checkCollapse() && !collapsed && !done) {
      collapsed = true;
      collapseAnim = 1.0;
      game.audio.play('se_failure', 0.8);
      for (var pi = 0; pi < 20; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var ci = coins[Math.floor(Math.random() * coins.length)];
        if (ci) particles.push({ x: ci.x, y: ci.y, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300-200, life: 0.8, col: ci.type.col });
      }
      setTimeout(function() {
        if (!done) { done = true; game.end.failure(); }
      }, 700);
    }

    // Falling coin
    if (dropping && dropping.falling) {
      dropping.y += Math.abs(dropSpeed) * dt;
      var landY = getTopY() - 4;
      if (dropping.y >= landY) {
        dropping.y = landY;
        dropping.falling = false;

        // Calculate offset from center of tower
        var top = getTopCoin();
        var topX = top ? top.x : W/2;
        var offset = dropping.x - topX;
        towerSway += offset * 0.004;

        coins.push({ x: dropping.x, y: dropping.y, type: dropping.type, settled: false });
        stacked++;
        dropping = null;
        game.audio.play('se_tap', 0.5);

        if (stacked >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(stacked * 300 + Math.ceil(timeLeft) * 80); }, 600);
          return;
        }

        spawnDrop();
      }
    } else if (!dropping && !collapsed) {
      spawnDrop();
    }

    // Moving preview
    if (dropping && !dropping.falling) {
      dropping.wobble = Math.sin(elapsed * 4) * 10;
      dropping.x = dropX + dropping.wobble;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 500 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#1a1209', 0.9);
    game.draw.line(0, FLOOR_Y, W, FLOOR_Y, C.goldLo, 3);

    // Stacked coins (from bottom to top)
    var sway = towerSway;
    for (var ci2 = 0; ci2 < coins.length; ci2++) {
      var c = coins[ci2];
      var lean = sway * (coins.length - ci2) * 8;
      var cx = c.x + lean;
      var cy = c.y;
      // Shadow
      game.draw.rect(cx - c.type.r + 8, cy + c.type.r - 8, c.type.r * 2, 12, C.shadow, 0.3);
      // Coin body
      game.draw.circle(cx, cy, c.type.r, c.type.col, 0.9);
      game.draw.circle(cx, cy, c.type.r * 0.75, c.type.lo || c.type.col, 0.5);
      game.draw.circle(cx - c.type.r * 0.3, cy - c.type.r * 0.3, c.type.r * 0.25, '#fff', 0.3);
    }

    // Dropping coin preview
    if (dropping) {
      var alpha = dropping.falling ? 0.9 : 0.65;
      game.draw.circle(dropping.x, dropping.y, dropping.type.r, dropping.type.col, alpha);
      game.draw.circle(dropping.x - dropping.type.r*0.3, dropping.y - dropping.type.r*0.3, dropping.type.r*0.25, '#fff', 0.3);
      if (!dropping.falling) {
        // Drop guide line
        game.draw.line(dropping.x, dropping.y + dropping.type.r, dropping.x, getTopY() - 10, C.ui, 2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Sway danger indicator
    var danger = Math.abs(towerSway) / 0.6;
    if (danger > 0.4 && coins.length > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, danger * 0.06);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.08);

    game.draw.text(stacked + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gold : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnDrop();
  });
})(game);
