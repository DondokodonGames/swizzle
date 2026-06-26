// 511-arrow-dodge.js
// アロードッジ — 四方から飛んでくる矢を素早くスワイプで回避
// 操作: 矢の来る方向と逆にスワイプして回避
// 成功: 20秒生き延びる  失敗: 5回被弾 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0300',
    arrow:    '#ef4444',
    arrowHi:  '#fca5a5',
    arrowFast:'#fbbf24',
    player:   '#22d3ee',
    playerHi: '#a5f3fc',
    shield:   '#a855f7',
    hit:      '#ef4444',
    safe:     '#22c55e',
    text:     '#f1f5f9',
    ui:       '#374151'
  };

  var player = { x: W / 2, y: H / 2, r: 48 };
  var arrows = [];
  var particles = [];
  var survived = 0;
  var GOAL = 20;
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var nextArrow = 1.0;
  var arrowInterval = 1.0;
  var invincible = 0;
  var flashAnim = 0;

  function spawnArrow() {
    // Pick a direction: N, E, S, W
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy, ARROW_SPEED = 600 + survived * 20;
    if (side === 0) { x = Math.random() * W; y = -50; vx = (player.x - x) * 0.3; vy = ARROW_SPEED; }
    else if (side === 1) { x = W + 50; y = Math.random() * H; vx = -ARROW_SPEED; vy = (player.y - y) * 0.3; }
    else if (side === 2) { x = Math.random() * W; y = H + 50; vx = (player.x - x) * 0.3; vy = -ARROW_SPEED; }
    else { x = -50; y = Math.random() * H; vx = ARROW_SPEED; vy = (player.y - y) * 0.3; }
    var spd = Math.sqrt(vx * vx + vy * vy);
    if (spd > 1) { vx = vx / spd * ARROW_SPEED; vy = vy / spd * ARROW_SPEED; }
    arrows.push({ x: x, y: y, vx: vx, vy: vy, len: 60, r: 18 });
  }

  function dirOfArrow(a) {
    var angle = Math.atan2(a.vy, a.vx);
    var deg = angle * 180 / Math.PI;
    if (deg > -45 && deg <= 45) return 'right';
    if (deg > 45 && deg <= 135) return 'down';
    if (deg > -135 && deg <= -45) return 'up';
    return 'left';
  }

  game.onSwipe(function(dir) {
    if (done) return;
    // Move player in swipe direction
    var STEP = W * 0.2;
    if (dir === 'left')  player.x = Math.max(player.r + 40, player.x - STEP);
    if (dir === 'right') player.x = Math.min(W - player.r - 40, player.x + STEP);
    if (dir === 'up')    player.y = Math.max(player.r + 40, player.y - STEP);
    if (dir === 'down')  player.y = Math.min(H - player.r - 40, player.y + STEP);
    game.audio.play('se_tap', 0.25);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    player.x = Math.max(player.r + 40, Math.min(W - player.r - 40, tx));
    player.y = Math.max(player.r + 40, Math.min(H - player.r - 40, ty));
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived += dt;
      if (survived >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(survived) * 300 + (MAX_HITS - hits) * 500); }, 700);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Spawn arrows
    nextArrow -= dt;
    if (nextArrow <= 0 && !done) {
      spawnArrow();
      if (survived > 8 && Math.random() < 0.4) spawnArrow();
      arrowInterval = Math.max(0.4, 1.0 - survived * 0.025);
      nextArrow = arrowInterval;
    }

    // Update arrows
    for (var ai = arrows.length - 1; ai >= 0; ai--) {
      var a = arrows[ai];
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // Check hit
      if (invincible <= 0) {
        var dx = a.x - player.x, dy = a.y - player.y;
        if (Math.sqrt(dx * dx + dy * dy) < player.r + a.r) {
          hits++;
          flashAnim = 0.7;
          invincible = 1.5;
          game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.hit });
          }
          arrows.splice(ai, 1);
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
          continue;
        }
      }

      // Remove if off screen
      if (a.x < -100 || a.x > W + 100 || a.y < -100 || a.y > H + 100) {
        arrows.splice(ai, 1);
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

    // Arrows
    for (var ai2 = 0; ai2 < arrows.length; ai2++) {
      var ar = arrows[ai2];
      var len = ar.len;
      var spd2 = Math.sqrt(ar.vx * ar.vx + ar.vy * ar.vy);
      var nx = ar.vx / spd2, ny = ar.vy / spd2;
      var tailX = ar.x - nx * len;
      var tailY = ar.y - ny * len;
      var arCol = spd2 > 800 ? C.arrowFast : C.arrow;
      // Shaft
      game.draw.line(tailX, tailY, ar.x, ar.y, arCol, 8);
      // Head
      game.draw.circle(ar.x, ar.y, 16, arCol, 0.9);
      // Feather at tail
      var perpX = -ny * 18, perpY = nx * 18;
      game.draw.line(tailX, tailY, tailX + perpX, tailY + perpY, C.arrowHi, 4);
      game.draw.line(tailX, tailY, tailX - perpX, tailY - perpY, C.arrowHi, 4);
    }

    // Player
    var invBlink = invincible > 0 ? (Math.sin(elapsed * 20) > 0 ? 1 : 0) : 1;
    if (invBlink) {
      game.draw.circle(player.x, player.y, player.r + 12, C.playerHi, 0.2);
      game.draw.circle(player.x, player.y, player.r, C.player, 0.9);
      game.draw.circle(player.x - 14, player.y - 14, 12, '#fff', 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.15);

    // Survival bar
    var survRatio = Math.min(1, survived / GOAL);
    game.draw.rect(0, H * 0.9, W * survRatio, 14, C.safe, 0.8);
    game.draw.text(Math.floor(survived) + 's / ' + GOAL + 's', W / 2, H * 0.88, { size: 44, color: C.text, bold: true });

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 56 + hi * 112, H * 0.955, 20, hi < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.arrow : C.arrowFast);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
