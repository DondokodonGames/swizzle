// 627-acid-rain.js
// アシッドレイン — 傘を素早く動かして酸性雨から守れ
// 操作: 左右スワイプで傘を移動
// 成功: 30秒間守る  失敗: 体力0 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080a',
    drop:    '#66ff44',
    dropHi:  '#bbffaa',
    umbrella:'#f59e0b',
    umbHi:   '#fde68a',
    player:  '#60a5fa',
    playerHi:'#bfdbfe',
    hit:     '#22c55e',
    miss:    '#ef4444',
    hp:      '#22c55e',
    hpLow:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a1008',
    splash:  '#66ff4444'
  };

  var umbX = W / 2;
  var targetX = W / 2;
  var UMB_W = 260;
  var UMB_H = 30;
  var UMB_Y = H * 0.75;
  var PLAYER_Y = UMB_Y + 80;

  var drops = [];
  var hp = 100;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var spawnTimer = 0;

  function spawnDrop() {
    drops.push({
      x: 20 + Math.random() * (W - 40),
      y: -20,
      vy: 350 + Math.random() * 200 + elapsed * 5,
      r: 8 + Math.random() * 8
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var step = 200;
    if (dir === 'left') targetX = Math.max(UMB_W / 2 + 20, targetX - step);
    else if (dir === 'right') targetX = Math.min(W - UMB_W / 2 - 20, targetX + step);
    game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    targetX = Math.max(UMB_W / 2 + 20, Math.min(W - UMB_W / 2 - 20, tx));
    game.audio.play('se_tap', 0.08);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(hp) * 100 + 30 * 100); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;

    umbX += (targetX - umbX) * Math.min(1, dt * 10);

    // Spawn drops
    spawnTimer += dt;
    var rate = Math.max(0.03, 0.15 - elapsed * 0.003);
    if (spawnTimer > rate) {
      spawnTimer = 0;
      spawnDrop();
    }

    // Update drops
    for (var di = drops.length - 1; di >= 0; di--) {
      var d = drops[di];
      d.y += d.vy * dt;

      // Check umbrella
      if (d.y + d.r >= UMB_Y && d.y - d.r <= UMB_Y + UMB_H) {
        if (d.x >= umbX - UMB_W / 2 && d.x <= umbX + UMB_W / 2) {
          // Blocked by umbrella
          for (var p = 0; p < 3; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: d.x, y: UMB_Y, vx: Math.cos(ang) * 80, vy: -Math.abs(Math.sin(ang)) * 120, life: 0.3, col: C.dropHi });
          }
          drops.splice(di, 1);
          continue;
        }
      }

      // Check player hit
      if (d.y >= PLAYER_Y - 50 && d.y <= PLAYER_Y + 50) {
        var pdx = d.x - W / 2;
        if (Math.abs(pdx) < 60) {
          hp -= 8 + Math.random() * 5;
          hp = Math.max(0, hp);
          drops.splice(di, 1);
          flashAnim = 0.3;
          game.audio.play('se_failure', 0.2);
          for (var p2 = 0; p2 < 4; p2++) {
            var a2 = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: PLAYER_Y, vx: Math.cos(a2) * 100, vy: Math.sin(a2) * 100, life: 0.3, col: C.miss });
          }
          if (hp <= 0 && !done) {
            done = true;
            game.audio.play('se_failure', 0.7);
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
      }

      if (d.y > H + 20) drops.splice(di, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Rain drops
    for (var di2 = 0; di2 < drops.length; di2++) {
      var d2 = drops[di2];
      game.draw.circle(d2.x, d2.y, d2.r, C.drop, 0.85);
      game.draw.circle(d2.x, d2.y - d2.r * 0.4, d2.r * 0.4, C.dropHi, 0.6);
    }

    // Umbrella
    var ux = umbX - UMB_W / 2;
    // Dome
    game.draw.circle(umbX, UMB_Y - 8, UMB_W / 2 + 8, C.umbHi, 0.15);
    game.draw.circle(umbX, UMB_Y, UMB_W / 2, C.umbrella, 0.9);
    game.draw.rect(ux, UMB_Y, UMB_W, UMB_H / 2, C.umbrella, 0.7);
    // Handle
    game.draw.line(umbX, UMB_Y + UMB_H / 2, umbX, UMB_Y + UMB_H + 60, C.umbHi, 8);
    // Rim
    game.draw.line(ux - 10, UMB_Y + 4, ux + UMB_W + 10, UMB_Y + 4, C.umbHi, 5);

    // Player
    game.draw.circle(W / 2, PLAYER_Y, 40, C.player, 0.9);
    game.draw.circle(W / 2 - 12, PLAYER_Y - 12, 14, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 6 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.miss, flashAnim * 0.1);

    // HP bar
    var hpRatio = Math.max(0, hp / 100);
    game.draw.rect(W / 2 - 200, H * 0.93, 400, 20, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.93, 400 * hpRatio, 20, hpRatio > 0.4 ? C.hp : C.hpLow, 0.9);
    game.draw.text('HP ' + Math.ceil(hp), W / 2, H * 0.93 + 36, { size: 32, color: hpRatio > 0.4 ? C.hp : C.hpLow });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.hit : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('傘で守れ!', W / 2, 80, { size: 36, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    for (var i = 0; i < 5; i++) spawnDrop();
  });
})(game);
