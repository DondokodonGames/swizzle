// 668-boomerang.js
// ブーメラン — 投げたブーメランが戻ってきたらキャッチせよ
// 操作: タップで投げる／戻ってきたらタップでキャッチ
// 成功: 15回キャッチ  失敗: 8回取り逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a02',
    sky:     '#081006',
    ground:  '#1a2e0a',
    groundHi:'#2d4a12',
    boom:    '#f59e0b',
    boomHi:  '#fde68a',
    player:  '#22c55e',
    playerHi:'#86efac',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040802'
  };

  var PLAYER_X = W * 0.2;
  var PLAYER_Y = H * 0.72;
  var PLAYER_R = 56;
  var CATCH_R = 120;

  var boomState = 'ready'; // ready | flying | returning | caught
  var boomX = PLAYER_X;
  var boomY = PLAYER_Y - PLAYER_R;
  var boomAngle = 0;
  var boomT = 0;
  var FLIGHT_DURATION = 1.8;
  var boomPeakX = 0;
  var boomStartX = 0;
  var boomStartY = 0;

  var caught = 0;
  var NEEDED = 15;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var catchWindow = false;
  var catchWindowTimer = 0;
  var CATCH_WINDOW = 0.45;

  function throwBoomerang() {
    boomState = 'flying';
    boomT = 0;
    boomX = PLAYER_X;
    boomY = PLAYER_Y - PLAYER_R;
    boomStartX = PLAYER_X;
    boomStartY = PLAYER_Y - PLAYER_R;
    boomPeakX = W * 0.78 + Math.random() * W * 0.1;
    catchWindow = false;
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (boomState === 'ready') {
      throwBoomerang();
    } else if (boomState === 'returning' && catchWindow) {
      var dx = tx - PLAYER_X, dy = ty - PLAYER_Y;
      if (dx * dx + dy * dy < CATCH_R * CATCH_R) {
        caught++;
        boomState = 'caught';
        catchWindow = false;
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = 'キャッチ！';
        resultTimer = 0.55;
        game.audio.play('se_success', 0.7);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: PLAYER_X, y: PLAYER_Y - PLAYER_R, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: C.boomHi });
        }
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 400 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { boomState = 'ready'; }, 600);
        }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (boomState === 'flying') {
      boomT += dt;
      var t = boomT / (FLIGHT_DURATION * 0.5);
      if (t >= 1) {
        boomState = 'returning';
        boomT = 0;
      } else {
        // Parabolic arc outward
        boomX = boomStartX + (boomPeakX - boomStartX) * t;
        boomY = boomStartY - Math.sin(t * Math.PI) * (H * 0.35);
      }
    } else if (boomState === 'returning') {
      boomT += dt;
      var t2 = boomT / (FLIGHT_DURATION * 0.5);

      if (t2 >= 1) {
        // Missed!
        boomState = 'ready';
        catchWindow = false;
        missed++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = '取り逃した！';
        resultTimer = 0.55;
        game.audio.play('se_failure', 0.35);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      } else {
        boomX = boomPeakX + (PLAYER_X - boomPeakX) * t2;
        boomY = boomStartY - Math.sin((1 - t2) * Math.PI) * (H * 0.28);

        // Catch window opens when boomerang is close to player
        var dist = Math.sqrt((boomX - PLAYER_X) * (boomX - PLAYER_X) + (boomY - (PLAYER_Y - PLAYER_R)) * (boomY - (PLAYER_Y - PLAYER_R)));
        if (dist < CATCH_R && !catchWindow) {
          catchWindow = true;
          catchWindowTimer = CATCH_WINDOW;
        }
      }
      if (catchWindow) {
        catchWindowTimer -= dt;
        if (catchWindowTimer <= 0) catchWindow = false;
      }
    }

    boomAngle += dt * 12;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.74, C.sky, 0.8);
    game.draw.rect(0, H * 0.74, W, H * 0.26, C.ground, 0.9);
    game.draw.rect(0, H * 0.74, W, 10, C.groundHi, 0.7);

    // Player
    game.draw.circle(PLAYER_X + 5, PLAYER_Y + 5, PLAYER_R, '#000', 0.3);
    game.draw.circle(PLAYER_X, PLAYER_Y, PLAYER_R, C.player, 0.9);
    game.draw.circle(PLAYER_X - PLAYER_R * 0.3, PLAYER_Y - PLAYER_R * 0.3, PLAYER_R * 0.25, C.playerHi, 0.5);

    // Catch ring (when boomerang returning)
    if (boomState === 'returning' && catchWindow) {
      var pulse = (Math.sin(elapsed * 10) + 1) * 0.5;
      game.draw.circle(PLAYER_X, PLAYER_Y - PLAYER_R, CATCH_R, C.correct, 0.15 + pulse * 0.1);
      game.draw.text('NOW!', PLAYER_X, PLAYER_Y - PLAYER_R - CATCH_R - 20, { size: 48, color: C.correct, bold: true });
    }

    // Boomerang
    if (boomState !== 'ready' && boomState !== 'caught') {
      var bLen = 60;
      var bx1 = boomX + Math.cos(boomAngle) * bLen;
      var by1 = boomY + Math.sin(boomAngle) * bLen;
      var bx2 = boomX - Math.cos(boomAngle) * bLen;
      var by2 = boomY - Math.sin(boomAngle) * bLen;
      game.draw.line(boomX + Math.cos(boomAngle + Math.PI / 2) * bLen * 0.6, boomY + Math.sin(boomAngle + Math.PI / 2) * bLen * 0.6, bx1, by1, C.boom, 14);
      game.draw.line(boomX + Math.cos(boomAngle + Math.PI / 2) * bLen * 0.6, boomY + Math.sin(boomAngle + Math.PI / 2) * bLen * 0.6, bx2, by2, C.boom, 14);
      game.draw.circle(boomX, boomY, 16, C.boomHi, 0.9);
    }

    // TAP hint
    if (boomState === 'ready') {
      game.draw.text('TAP TO THROW', W / 2, H * 0.86, { size: 42, color: '#ffffff44' });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.8, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
