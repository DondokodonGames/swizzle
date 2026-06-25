// 112-coin-pusher.js
// コインプッシャー — コインが端からこぼれ落ちる瞬間の快感を指先で演出する
// 操作: タップでコインを投下
// 成功: 30枚を落とす  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0804',
    shelf:   '#2d1f0a',
    shelfHi: '#4a3010',
    coin:    '#f59e0b',
    coinHi:  '#fcd34d',
    coinShadow:'#92400e',
    correct: '#22c55e',
    ui:      '#78716c'
  };

  var SHELF_Y = H * 0.55;
  var SHELF_H = 40;
  var SHELF_X = 80;
  var SHELF_W = W - 160;
  var PUSHER_H = 60;
  var pusherX = SHELF_X; // left edge of pusher block
  var pusherDir = 1;
  var PUSHER_SPEED = 260;
  var PUSHER_W = 200;

  var coins = []; // { x, y, vx, vy, r, fallen }
  var COIN_R = 32;
  var dropped = 0;
  var fallen = 0;
  var needed = 30;
  var timeLeft = 60;
  var done = false;
  var scoreFlash = 0;

  // Pre-populate shelf with some coins
  function initCoins() {
    for (var i = 0; i < 14; i++) {
      var x = SHELF_X + 40 + Math.random() * (SHELF_W - 80);
      var y = SHELF_Y - COIN_R - Math.floor(Math.random() * 2) * (COIN_R * 2 + 4);
      coins.push({ x: x, y: y, vx: 0, vy: 0, r: COIN_R, fallen: false, settling: false });
    }
  }

  game.onTap(function(tx) {
    if (done) return;
    // Drop coin at tapped x position
    var x = Math.max(SHELF_X + COIN_R, Math.min(SHELF_X + SHELF_W - COIN_R, tx));
    coins.push({ x: x, y: SHELF_Y - 260, vx: 0, vy: 0, r: COIN_R, fallen: false, settling: false });
    dropped++;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Move pusher
    pusherX += pusherDir * PUSHER_SPEED * dt;
    if (pusherX + PUSHER_W > SHELF_X + SHELF_W - 8) { pusherX = SHELF_X + SHELF_W - PUSHER_W - 8; pusherDir = -1; }
    if (pusherX < SHELF_X + 8) { pusherX = SHELF_X + 8; pusherDir = 1; }

    var PUSHER_Y = SHELF_Y - PUSHER_H;

    // Update coins
    for (var i = 0; i < coins.length; i++) {
      var c = coins[i];
      if (c.fallen) continue;

      // Gravity
      c.vy += 1200 * dt;
      c.y += c.vy * dt;
      c.x += c.vx * dt;
      c.vx *= Math.pow(0.85, dt * 60);

      // Land on shelf
      if (c.y + c.r > SHELF_Y && c.vy > 0) {
        c.y = SHELF_Y - c.r;
        c.vy *= -0.2;
        if (Math.abs(c.vy) < 30) c.vy = 0;
      }

      // Pusher collision (coins on shelf get pushed)
      if (c.y + c.r >= SHELF_Y - 4) {
        // Check if coin is in pusher zone
        if (c.x + c.r > pusherX && c.x - c.r < pusherX + PUSHER_W) {
          if (c.y + c.r > PUSHER_Y) {
            c.vx += pusherDir * PUSHER_SPEED * 0.8;
          }
        }
      }

      // Coin-coin collision (simplified)
      for (var j = i + 1; j < coins.length; j++) {
        var c2 = coins[j];
        if (c2.fallen) continue;
        var dx = c2.x - c.x, dy = c2.y - c.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < c.r + c2.r && dist > 0) {
          var overlap = (c.r + c2.r - dist) / 2;
          var nx = dx / dist, ny = dy / dist;
          c.x -= nx * overlap; c.y -= ny * overlap;
          c2.x += nx * overlap; c2.y += ny * overlap;
          var relV = (c2.vx - c.vx) * nx + (c2.vy - c.vy) * ny;
          if (relV < 0) {
            c.vx -= relV * nx * 0.5;
            c.vy -= relV * ny * 0.5;
            c2.vx += relV * nx * 0.5;
            c2.vy += relV * ny * 0.5;
          }
        }
      }

      // Fall off edge
      if (c.x - c.r < SHELF_X || c.x + c.r > SHELF_X + SHELF_W) {
        c.fallen = true;
        fallen++;
        scoreFlash = 0.4;
        game.audio.play('se_tap', 0.8);
        if (fallen >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(fallen * 20 + Math.ceil(timeLeft) * 8); }, 400);
        }
      }
    }
    coins = coins.filter(function(c) { return !c.fallen || scoreFlash > 0; });

    if (scoreFlash > 0) scoreFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Shelf background
    game.draw.rect(SHELF_X, SHELF_Y, SHELF_W, SHELF_H, C.shelf);
    game.draw.rect(SHELF_X, SHELF_Y, SHELF_W, 8, C.shelfHi);

    // Pusher
    game.draw.rect(pusherX, SHELF_Y - PUSHER_H, PUSHER_W, PUSHER_H, C.shelfHi);
    game.draw.rect(pusherX, SHELF_Y - PUSHER_H, PUSHER_W, 6, '#6b4c1a');

    // Coins
    for (var ci = 0; ci < coins.length; ci++) {
      var coin = coins[ci];
      if (coin.fallen) continue;
      game.draw.circle(coin.x, coin.y, coin.r + 4, C.coinShadow, 0.4);
      game.draw.circle(coin.x, coin.y, coin.r, C.coin);
      game.draw.circle(coin.x - coin.r * 0.25, coin.y - coin.r * 0.25, coin.r * 0.3, C.coinHi, 0.6);
      game.draw.text('¥', coin.x, coin.y, { size: 28, color: C.coinShadow, bold: true });
    }

    // Score flash
    if (scoreFlash > 0) {
      game.draw.text('+1', W / 2, H * 0.72, { size: 72, color: C.correct, bold: true });
    }

    // Score display
    game.draw.text(fallen + ' / ' + needed, W / 2, 152, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.text('タップでコイン投下！', W / 2, H * 0.88, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coin : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initCoins();
  });
})(game);
