// 085-bridge-builder.js
// 橋渡し — タップを止めた瞬間に棒の長さが決まる、ちょうどよい長さで橋を架ける
// 操作: タップ長押しで棒を伸ばし、離すと棒が倒れる
// 成功: 5つの崖を渡る  失敗: 棒が短か/長すぎて落ちる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1a0f',
    platform:'#15803d',
    platformHi:'#22c55e',
    stick:   '#d97706',
    stickHi: '#fbbf24',
    player:  '#3b82f6',
    playerHi:'#93c3fd',
    gap:     '#020a05',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var FLOOR_Y = H * 0.62;
  var PLATFORM_H = 60;
  var PLAYER_SIZE = 52;
  var GROW_SPEED = 320; // px/sec for stick growth

  var platforms = [];
  var stickAngle = 0; // 0 = growing up (negative y), PI/2 = horizontal (lying down)
  var stickLen = 0;
  var growing = false;
  var falling = false;
  var walking = false;
  var playerX = 0;
  var cameraX = 0; // world scroll
  var phase = 'idle'; // 'idle' | 'growing' | 'falling' | 'walking' | 'fail' | 'dead'
  var fallAngle = 0;
  var score = 0;
  var needed = 5;
  var timeLeft = 40;
  var done = false;
  var walkSpeed = 340;
  var deathFlash = 0;

  function genPlatforms() {
    // World x positions
    platforms = [];
    var x = 0;
    var pw = 160 + Math.random() * 80;
    platforms.push({ x: x, w: pw });
    for (var i = 0; i < needed; i++) {
      var gap = 160 + Math.random() * 200 + i * 20;
      x += pw + gap;
      pw = 120 + Math.random() * 120;
      platforms.push({ x: x, w: pw });
    }
    playerX = platforms[0].x + platforms[0].w - PLAYER_SIZE / 2;
    cameraX = 0;
  }

  function currentPlatform() {
    // The platform the player is currently on
    for (var i = 0; i < platforms.length - 1; i++) {
      var p = platforms[i];
      if (playerX >= p.x && playerX <= p.x + p.w) return i;
    }
    return -1;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'idle') {
      phase = 'growing';
      stickLen = 0;
      stickAngle = 0;
    } else if (phase === 'growing') {
      // Release — start falling
      phase = 'falling';
    }
  });

  // Also: hold = growing, release tap = stop
  game.onHold = null; // not using hold; tap-to-start, tap-to-stop

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

    if (phase === 'growing') {
      stickLen += GROW_SPEED * dt;
      if (stickLen > 700) stickLen = 700; // max
    }

    if (phase === 'falling') {
      stickAngle += dt * 3.5; // radians/s
      if (stickAngle >= Math.PI / 2) {
        stickAngle = Math.PI / 2;
        phase = 'walking';
        // Check if stick reaches next platform
        var ci = currentPlatform();
        if (ci < 0) { phase = 'dead'; deathFlash = 0.5; return; }
        var curP = platforms[ci];
        var nextP = platforms[ci + 1];
        var stickTip = curP.x + curP.w + stickLen;
        if (stickTip >= nextP.x && stickTip <= nextP.x + nextP.w) {
          // Reaches!
          game.audio.play('se_tap', 0.8);
        } else {
          // Doesn't reach — player will fall
        }
      }
    }

    if (phase === 'walking') {
      playerX += walkSpeed * dt;
      var ci2 = currentPlatform();
      // Check if we're past current platform without next platform support
      if (ci2 >= 0) {
        var cp = platforms[ci2];
        var np = platforms[ci2 + 1];
        var stickTip2 = cp.x + cp.w + stickLen;
        // Fallen off?
        if (playerX > cp.x + cp.w && (stickTip2 < np.x || stickTip2 > np.x + np.w)) {
          phase = 'dead';
          deathFlash = 0.5;
          game.audio.play('se_failure');
          return;
        }
        // Reached next platform?
        if (playerX > np.x + 20) {
          score++;
          stickLen = 0;
          stickAngle = 0;
          phase = 'idle';
          game.audio.play('se_tap', 0.9);
          // Update camera
          cameraX = np.x - W * 0.25;
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 50 + Math.ceil(timeLeft) * 12); }, 400);
          }
        }
      }
    }

    if (phase === 'dead') {
      deathFlash -= dt;
      if (deathFlash <= 0 && !done) {
        done = true;
        game.end.failure();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient suggestion
    game.draw.rect(0, 0, W, FLOOR_Y, '#040e06', 0.5);

    // Platforms
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      var px = p.x - cameraX;
      if (px + p.w < -100 || px > W + 100) continue;
      game.draw.rect(px, FLOOR_Y, p.w, PLATFORM_H, C.platform);
      game.draw.rect(px, FLOOR_Y, p.w, 8, C.platformHi);
    }

    // Abyss
    game.draw.rect(0, FLOOR_Y + PLATFORM_H, W, H - FLOOR_Y - PLATFORM_H, C.gap);

    // Stick
    var ci3 = currentPlatform();
    if (ci3 >= 0 && (phase === 'growing' || phase === 'falling' || phase === 'walking')) {
      var cp3 = platforms[ci3];
      var stickBaseX = cp3.x + cp3.w - cameraX;
      var stickBaseY = FLOOR_Y;
      var stickTipX = stickBaseX + Math.sin(stickAngle) * stickLen;
      var stickTipY = stickBaseY - Math.cos(stickAngle) * stickLen;
      game.draw.line(stickBaseX, stickBaseY, stickTipX, stickTipY, C.stick, 10);
      game.draw.circle(stickBaseX, stickBaseY, 10, C.stickHi);
      // Length indicator
      if (phase === 'growing') {
        game.draw.text(Math.round(stickLen) + '', stickBaseX + 20, stickBaseY - stickLen / 2, {
          size: 36, color: C.stickHi
        });
      }
    }

    // Player
    var drawPlayerX = playerX - cameraX;
    game.draw.rect(drawPlayerX - PLAYER_SIZE / 2, FLOOR_Y - PLAYER_SIZE - 4, PLAYER_SIZE, PLAYER_SIZE, C.player);
    game.draw.rect(drawPlayerX - 20, FLOOR_Y - PLAYER_SIZE, 18, 18, C.playerHi, 0.5);
    // Face
    game.draw.circle(drawPlayerX, FLOOR_Y - PLAYER_SIZE / 2 - 4, PLAYER_SIZE * 0.3, C.playerHi, 0.2);

    // Death flash
    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, deathFlash * 0.4);
    }

    // Score (platform markers at top)
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 72;
      game.draw.circle(sx, 128, 24, s < score ? C.correct : '#0f2d18');
    }

    // Guide
    if (phase === 'idle' && score === 0) {
      game.draw.text('タップ長押しで伸ばす', W / 2, H * 0.78, { size: 48, color: C.ui });
    } else if (phase === 'growing') {
      game.draw.text('離す！', W / 2, H * 0.78, { size: 56, color: C.stickHi, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, '#0a1a0f');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.platformHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    genPlatforms();
  });
})(game);
