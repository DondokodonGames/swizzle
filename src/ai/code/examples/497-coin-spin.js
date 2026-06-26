// 497-coin-spin.js
// コインスピン — 回転するコインが表になった瞬間をタップせよ
// 操作: コインが「表」を向いた瞬間をタップ（回転速度が変化する）
// 成功: 15回表キャッチ  失敗: 10回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0700',
    coin:   '#f59e0b',
    coinHi: '#fef08a',
    coinSide:'#b45309',
    coinBack:'#78350f',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    glow:   '#fbbf24'
  };

  var coins = [];
  var hits = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.correct;
  var resultLife = 0;
  var nextSpawn = 0.8;

  function spawnCoin() {
    var lane = Math.floor(Math.random() * 3);
    var cx = W * 0.2 + lane * W * 0.3;
    var cy = H * 0.38 + (Math.random() - 0.5) * H * 0.25;
    var speed = 1.5 + Math.random() * 3.5;
    var phase = Math.random() * Math.PI * 2;
    coins.push({
      x: cx,
      y: cy,
      angle: phase,
      speed: speed,
      r: 90,
      tapWindow: false,
      tapped: false,
      missTimer: 0,
      lifetime: 3.5 + Math.random() * 2.0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = coins.length - 1; i >= 0; i--) {
      var coin = coins[i];
      if (coin.tapped) continue;
      var dx = tx - coin.x, dy = ty - coin.y;
      if (dx * dx + dy * dy <= (coin.r + 30) * (coin.r + 30)) {
        coin.tapped = true;
        if (coin.tapWindow) {
          // Good hit - coin is showing heads
          hits++;
          resultText = '表！';
          resultCol = C.correct;
          resultLife = 0.7;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: coin.x, y: coin.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.coinHi });
          }
          if (hits >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(hits * 300 + Math.ceil(timeLeft) * 100); }, 700);
          }
        } else {
          misses++;
          resultText = '裏！';
          resultCol = C.wrong;
          resultLife = 0.7;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        hit = true;
        break;
      }
    }
    if (!hit) {
      misses++;
      resultText = 'はずれ';
      resultCol = C.wrong;
      resultLife = 0.5;
      game.audio.play('se_failure', 0.2);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
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

    if (resultLife > 0) resultLife -= dt * 2;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      if (coins.length < 3) spawnCoin();
      nextSpawn = 0.8 + Math.random() * 1.0;
    }

    // Update coins
    for (var i = coins.length - 1; i >= 0; i--) {
      var c = coins[i];
      if (!c.tapped) {
        c.angle += c.speed * dt * Math.PI * 2;
        c.lifetime -= dt;

        // tapWindow = showing heads (cos > threshold)
        var cosA = Math.cos(c.angle);
        c.tapWindow = (cosA > 0.5);

        // Expire
        if (c.lifetime <= 0) {
          if (c.tapWindow) {
            // Missed a heads - count as miss
            misses++;
            resultText = '逃した';
            resultCol = C.wrong;
            resultLife = 0.5;
            game.audio.play('se_failure', 0.3);
            if (misses >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 500);
            }
          }
          coins.splice(i, 1);
        }
      } else {
        c.missTimer += dt;
        if (c.missTimer > 0.5) coins.splice(i, 1);
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

    // Coins
    for (var ci = 0; ci < coins.length; ci++) {
      var coin2 = coins[ci];
      var cosA2 = Math.cos(coin2.angle);
      var absScale = Math.abs(cosA2);
      var coinW = coin2.r * absScale;
      var isHeads = cosA2 > 0;

      if (coin2.tapped) continue;

      // Shadow
      game.draw.circle(coin2.x + 10, coin2.y + 10, coin2.r * absScale + 8, '#000', 0.3);

      // Coin body
      var faceCol = isHeads ? C.coin : C.coinBack;
      var highlightCol = isHeads ? C.coinHi : C.coinSide;

      // Draw ellipse approximation with rect + circles
      if (absScale > 0.05) {
        game.draw.circle(coin2.x, coin2.y, coinW, faceCol, 0.9);
        game.draw.circle(coin2.x, coin2.y, coinW * 0.75, highlightCol, 0.2);
        if (isHeads) {
          game.draw.circle(coin2.x - coinW * 0.2, coin2.y - coinW * 0.2, coinW * 0.15, '#fff', 0.4);
          if (coin2.tapWindow) {
            game.draw.circle(coin2.x, coin2.y, coinW + 18, C.glow, 0.2 + Math.sin(elapsed * 8) * 0.1);
          }
        }
      }

      // Side stripe at edge
      game.draw.rect(coin2.x - 4, coin2.y - coin2.r, 8, coin2.r * 2, C.coinSide, 0.4);

      // Label
      if (isHeads && absScale > 0.4) {
        game.draw.text('表', coin2.x, coin2.y + 18, { size: Math.floor(48 * absScale), color: C.coinSide, bold: true });
      } else if (!isHeads && absScale > 0.4) {
        game.draw.text('裏', coin2.x, coin2.y + 18, { size: Math.floor(48 * absScale), color: C.coinHi, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result text
    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 72, color: resultCol, bold: true });
    }

    // Miss dots
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx2 = W * 0.1 + (mi % missPerRow) * (W * 0.8 / (missPerRow - 1));
      var my2 = mi < missPerRow ? H * 0.948 : H * 0.963;
      game.draw.circle(mx2, my2, 14, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.glow : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnCoin();
  });
})(game);
