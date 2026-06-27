// 666-magnet-fish.js
// 磁石釣り — 磁石で水底の金属を引き上げろ
// 操作: タップで磁石を左右に移動
// 成功: 25個回収  失敗: 10個逃す or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#01080f',
    water:   '#0c2a40',
    waterHi: '#164e63',
    surface: '#0e7490',
    magnet:  '#ef4444',
    magnetHi:'#fca5a5',
    metal:   '#94a3b8',
    metalHi: '#cbd5e1',
    gold:    '#f59e0b',
    goldHi:  '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#01050b'
  };

  var SURFACE_Y = H * 0.32;
  var MAGNET_Y = H * 0.22;
  var magnetX = W / 2;
  var targetMagnetX = W / 2;
  var MAGNET_R = 60;
  var ATTRACT_R = 200;

  var items = [];
  var nextId = 0;
  var spawnTimer = 0;
  var SPAWN_RATE = 1.0;

  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  var ropeLen = 0;

  function spawnItem() {
    var isGold = Math.random() < 0.25;
    items.push({
      id: nextId++,
      x: 60 + Math.random() * (W - 120),
      y: SURFACE_Y + 120 + Math.random() * (H * 0.4),
      vy: -(60 + Math.random() * 60),
      r: isGold ? 36 : 28,
      isGold: isGold,
      attached: false,
      attachDx: 0,
      scored: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetMagnetX = Math.max(MAGNET_R + 20, Math.min(W - MAGNET_R - 20, tx));
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
    if (resultTimer > 0) resultTimer -= dt;

    magnetX += (targetMagnetX - magnetX) * Math.min(1, dt * 10);
    ropeLen = MAGNET_Y - 60;

    // Spawn items
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_RATE && items.length < 8) {
      spawnTimer = 0;
      spawnItem();
    }

    // Update items
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.attached) {
        item.x = magnetX + item.attachDx;
        item.y += (MAGNET_Y + MAGNET_R + item.r - item.y) * Math.min(1, dt * 8);
        // Check if reached magnet
        if (item.y < MAGNET_Y + MAGNET_R + item.r + 10 && !item.scored) {
          item.scored = true;
        }
        // Item rises above surface = collected!
        if (item.y < SURFACE_Y - 40 && item.scored) {
          caught++;
          var pts = item.isGold ? 2 : 1;
          flashCol = C.correct;
          flashAnim = 0.3;
          resultText = item.isGold ? 'ゴールド！ +2' : 'キャッチ！';
          resultTimer = 0.5;
          game.audio.play('se_success', item.isGold ? 0.7 : 0.5);
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: item.x, y: item.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: item.isGold ? C.goldHi : C.metalHi });
          }
          items.splice(i, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 350 + Math.ceil(timeLeft) * 80); }, 700);
          }
          continue;
        }
      } else {
        // Rise slowly (buoyant)
        item.y += item.vy * dt;
        item.vy *= (1 - dt * 0.5);
        if (item.vy > -10) item.vy = -10;

        // Check magnet attraction
        var dx = magnetX - item.x, dy = MAGNET_Y - item.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ATTRACT_R) {
          item.attached = true;
          item.attachDx = item.x - magnetX;
          game.audio.play('se_tap', 0.1);
        }

        // Reached surface without being caught
        if (item.y < SURFACE_Y && !item.attached) {
          missed++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          resultText = '逃がした！';
          resultTimer = 0.5;
          game.audio.play('se_failure', 0.3);
          items.splice(i, 1);
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky
    game.draw.rect(0, 0, W, SURFACE_Y, '#010609', 0.8);

    // Water body
    game.draw.rect(0, SURFACE_Y, W, H - SURFACE_Y, C.water, 0.85);

    // Water shimmer
    for (var wi = 0; wi < 6; wi++) {
      var wy = SURFACE_Y + 40 + wi * 80;
      var wx = (elapsed * 80 + wi * 200) % (W + 200) - 100;
      game.draw.line(wx, wy, wx + 120, wy, C.waterHi, 2);
    }

    // Water surface
    game.draw.rect(0, SURFACE_Y - 8, W, 16, C.surface, 0.8);

    // Items
    for (var ii = 0; ii < items.length; ii++) {
      var it = items[ii];
      var col = it.isGold ? C.gold : C.metal;
      var colHi = it.isGold ? C.goldHi : C.metalHi;
      if (it.attached) {
        game.draw.line(magnetX, MAGNET_Y, it.x, it.y - it.r, '#94a3b8', 2);
      }
      game.draw.circle(it.x + 3, it.y + 3, it.r, '#000', 0.4);
      game.draw.circle(it.x, it.y, it.r, col, 0.9);
      game.draw.circle(it.x - it.r * 0.3, it.y - it.r * 0.3, it.r * 0.22, colHi, 0.5);
      if (it.isGold) {
        game.draw.text('★', it.x, it.y + 10, { size: 24, color: '#fff' });
      }
    }

    // Attraction field
    game.draw.circle(magnetX, MAGNET_Y, ATTRACT_R, C.magnet, 0.05);
    game.draw.circle(magnetX, MAGNET_Y, ATTRACT_R * 0.6, C.magnet, 0.04);

    // Rope from top to magnet
    game.draw.line(magnetX, 0, magnetX, MAGNET_Y - MAGNET_R, '#94a3b8', 4);

    // Magnet
    game.draw.circle(magnetX + 5, MAGNET_Y + 5, MAGNET_R, '#000', 0.35);
    game.draw.circle(magnetX, MAGNET_Y, MAGNET_R, C.magnet, 0.9);
    game.draw.circle(magnetX - MAGNET_R * 0.3, MAGNET_Y - MAGNET_R * 0.3, MAGNET_R * 0.22, C.magnetHi, 0.5);
    game.draw.text('N', magnetX, MAGNET_Y + 10, { size: 36, color: '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.76, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnItem();
    spawnItem();
  });
})(game);
