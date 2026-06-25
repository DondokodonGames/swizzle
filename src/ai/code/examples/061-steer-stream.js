// 061-steer-stream.js
// ストリームステアー — 激流を下る丸太に乗って岩を避けながら川を下る
// 操作: 左右スワイプで丸太の位置を移動
// 成功: 30秒生き残る  失敗: 岩に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04100c',
    water:  '#0c4a6e',
    waterHi:'#0ea5e9',
    log:    '#92400e',
    logHi:  '#d97706',
    rock:   '#374151',
    rockHi: '#6b7280',
    foam:   '#bfdbfe',
    ui:     '#475569'
  };

  var LOG_W = 240;
  var LOG_H = 60;
  var LOG_Y = H * 0.78;
  var logX = W / 2;
  var LOG_LANES = 5;
  var LANE_W = W / LOG_LANES;

  var rocks = [];
  var foamParticles = [];
  var scrollSpeed = 420;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.9;

  var timeLeft = 30;
  var done = false;
  var deathFlash = 0;
  var waterPhase = 0;

  function spawnRock() {
    var lane = Math.floor(Math.random() * LOG_LANES);
    var x = LANE_W * lane + LANE_W / 2;
    var w = 80 + Math.random() * 80;
    var h = 60 + Math.random() * 60;
    rocks.push({ x: x, y: -120, w: w, h: h });
    // Avoid spawning directly above player
    if (Math.abs(x - logX) < LOG_W / 2 + w / 2) {
      // Shift slightly
      rocks[rocks.length - 1].x += (x < W / 2 ? 1 : -1) * LANE_W;
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') {
      logX = Math.max(LOG_W / 2, logX - LANE_W);
      game.audio.play('se_tap', 0.4);
    } else if (dir === 'right') {
      logX = Math.min(W - LOG_W / 2, logX + LANE_W);
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + 100); }, 300);
        return;
      }
    }

    waterPhase += dt * 2;
    scrollSpeed = 420 + (30 - timeLeft) * 10;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnRock();
      spawnTimer = Math.max(0.5, SPAWN_INTERVAL - (30 - timeLeft) * 0.01);
    }

    // Move rocks
    for (var i = rocks.length - 1; i >= 0; i--) {
      rocks[i].y += scrollSpeed * dt;

      // Collision with log
      if (!done) {
        var rx = rocks[i].x, ry = rocks[i].y;
        var rw = rocks[i].w, rh = rocks[i].h;
        if (ry + rh / 2 > LOG_Y - LOG_H / 2 && ry - rh / 2 < LOG_Y + LOG_H / 2) {
          if (rx + rw / 2 > logX - LOG_W / 2 && rx - rw / 2 < logX + LOG_W / 2) {
            done = true;
            deathFlash = 0.5;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }

      if (rocks[i].y > H + 200) rocks.splice(i, 1);
    }

    // Foam particles
    if (Math.random() < 0.15) {
      foamParticles.push({
        x: Math.random() * W,
        y: -20,
        vx: (Math.random() - 0.5) * 60,
        life: 1.5 + Math.random()
      });
    }
    for (var f = foamParticles.length - 1; f >= 0; f--) {
      foamParticles[f].y += scrollSpeed * 0.8 * dt;
      foamParticles[f].x += foamParticles[f].vx * dt;
      foamParticles[f].life -= dt;
      if (foamParticles[f].life <= 0 || foamParticles[f].y > H) foamParticles.splice(f, 1);
    }

    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.water);

    // Water ripple lines
    for (var wl = 0; wl < 8; wl++) {
      var wy = ((wl / 8 * H) + waterPhase * 80) % H;
      game.draw.rect(0, wy, W, 12, C.waterHi, 0.08);
    }

    // Lane guides (subtle)
    for (var l = 0; l < LOG_LANES - 1; l++) {
      var lx = LANE_W * (l + 1);
      game.draw.line(lx, 0, lx, H, C.waterHi, 2);
    }

    // Foam
    for (var fp = 0; fp < foamParticles.length; fp++) {
      var fo = foamParticles[fp];
      game.draw.circle(fo.x, fo.y, 8, C.foam, fo.life / 2 * 0.3);
    }

    // Rocks
    for (var r = 0; r < rocks.length; r++) {
      var rock = rocks[r];
      game.draw.circle(rock.x, rock.y, rock.w / 2, C.rock);
      game.draw.circle(rock.x - rock.w * 0.2, rock.y - rock.h * 0.2, rock.w * 0.2, C.rockHi, 0.4);
      // Foam spray around rock
      game.draw.circle(rock.x, rock.y + rock.h * 0.4, rock.w * 0.5, C.foam, 0.15);
    }

    // Log
    // Shadow
    game.draw.rect(logX - LOG_W / 2 + 8, LOG_Y - LOG_H / 2 + 8, LOG_W, LOG_H, '#000', 0.3);
    // Log body
    game.draw.rect(logX - LOG_W / 2, LOG_Y - LOG_H / 2, LOG_W, LOG_H, C.log);
    // Wood grain
    for (var g = 0; g < 3; g++) {
      var gy = LOG_Y - LOG_H / 2 + 16 + g * 16;
      game.draw.rect(logX - LOG_W / 2 + 16, gy, LOG_W - 32, 4, C.logHi, 0.3);
    }
    // Log ends
    game.draw.circle(logX - LOG_W / 2, LOG_Y, LOG_H / 2, C.logHi, 0.5);
    game.draw.circle(logX + LOG_W / 2, LOG_Y, LOG_H / 2, C.logHi, 0.5);

    // Player indicator
    game.draw.circle(logX, LOG_Y - LOG_H / 2 - 20, 24, '#fff', 0.8);

    // Death flash
    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, '#ef4444', deathFlash * 0.4);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.waterHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Speed indicator
    game.draw.text('流速: ' + Math.floor(scrollSpeed), W / 2, 140, { size: 44, color: C.foam, bold: true });

    // Guide
    game.draw.text('スワイプで丸太を操れ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnTimer = 0.5;
  });
})(game);
