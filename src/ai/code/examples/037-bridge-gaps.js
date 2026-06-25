// 037-bridge-gaps.js
// ブリッジギャップ — 橋を伸ばして渡る、長さの感覚を磨く一発勝負
// 操作: 長押しで橋を伸ばし、離すと渡り始める（長すぎると落ちる）
// 成功: 5つの台に全て着地  失敗: 橋が短すぎor長すぎ or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050a14',
    sky:     '#070e20',
    platform:'#1e3a5f',
    platformHi:'#2563eb',
    bridge:  '#92400e',
    bridgeHi:'#b45309',
    player:  '#fbbf24',
    playerHi:'#fef3c7',
    gap:     '#020810',
    good:    '#22c55e',
    danger:  '#ef4444',
    ui:      '#475569'
  };

  var FLOOR_Y = H * 0.68;
  var PLAT_H = 48;
  var PLAYER_W = 64;
  var PLAYER_H = 80;

  // Generate platforms
  function generatePlatforms(count) {
    var plats = [];
    var x = 80;
    var pw = 160 + Math.random() * 80;
    plats.push({ x: x, w: pw });
    for (var i = 0; i < count; i++) {
      var gap = 160 + Math.random() * 200;
      x = plats[plats.length - 1].x + plats[plats.length - 1].w + gap;
      pw = 100 + Math.random() * 120;
      plats.push({ x: x, w: pw });
    }
    return plats;
  }

  var platforms = generatePlatforms(5);
  var currentPlat = 0; // player is on this platform
  var scrollX = 0;     // camera scroll

  var bridgeLen = 0;
  var maxBridgeLen = 600;
  var bridgeGrowing = false;
  var BRIDGE_GROW_RATE = 320; // px/sec

  var phase = 'idle'; // 'idle' | 'growing' | 'falling' | 'walking' | 'done'
  var bridgeFallAngle = 0; // for bridge fall animation
  var playerWalkX = 0;     // player walk progress (0 = left edge of bridge)
  var WALK_SPEED = 300;     // px/sec

  var score = 0;
  var timeLeft = 30;
  var done = false;

  function currentPlatLeft() { return platforms[currentPlat].x - scrollX; }
  function currentPlatRight() { return platforms[currentPlat].x + platforms[currentPlat].w - scrollX; }

  game.onHold(function(x, y, duration) {
    if (done || phase !== 'idle') return;
    bridgeGrowing = true;
    phase = 'growing';
  });

  game.onTap(function(x, y) {
    if (done) return;
    if (phase === 'growing' || bridgeGrowing) {
      // Release: stop growing, bridge falls
      bridgeGrowing = false;
      phase = 'falling';
      game.audio.play('se_tap', 0.6);
    }
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

    var platRight = currentPlatRight();

    if (phase === 'growing') {
      bridgeLen += BRIDGE_GROW_RATE * dt;
      if (bridgeLen >= maxBridgeLen) {
        bridgeLen = maxBridgeLen;
        bridgeGrowing = false;
        phase = 'falling';
        game.audio.play('se_tap', 0.6);
      }
    } else if (phase === 'falling') {
      bridgeFallAngle += 180 * dt; // degrees per second
      if (bridgeFallAngle >= 90) {
        bridgeFallAngle = 90;
        // Check if bridge reaches next platform
        var bridgeEnd = platRight + bridgeLen;
        var nextPlat = platforms[currentPlat + 1];
        if (nextPlat && bridgeEnd >= nextPlat.x - scrollX &&
            bridgeEnd <= nextPlat.x + nextPlat.w - scrollX) {
          phase = 'walking';
          playerWalkX = 0;
          game.audio.play('se_tap', 0.4);
        } else {
          // Bridge too short or too long
          phase = 'done';
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    } else if (phase === 'walking') {
      playerWalkX += WALK_SPEED * dt;
      if (playerWalkX >= bridgeLen) {
        // Reached next platform!
        currentPlat++;
        score++;
        bridgeLen = 0;
        bridgeFallAngle = 0;
        playerWalkX = 0;
        phase = 'idle';
        game.audio.play('se_tap', 0.8);

        // Scroll camera to keep player centered
        var targetScroll = platforms[currentPlat].x - W * 0.2;
        scrollX = targetScroll;

        if (currentPlat >= platforms.length - 1) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(score * 30 + Math.ceil(timeLeft) * 5);
          }, 400);
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background depth lines
    for (var d = 0; d < 5; d++) {
      game.draw.rect(0, FLOOR_Y - 80 - d * 60, W, 2, '#0a1428', 0.4);
    }

    // Platforms
    for (var p = 0; p < platforms.length; p++) {
      var plat = platforms[p];
      var px2 = plat.x - scrollX;
      var py2 = FLOOR_Y;
      // Shadow
      game.draw.rect(px2 + 8, py2 + PLAT_H + 8, plat.w, 24, '#000', 0.4);
      // Body
      game.draw.rect(px2, py2, plat.w, H, C.platform);
      // Highlight
      game.draw.rect(px2 + 8, py2 + 8, plat.w - 16, PLAT_H * 0.4, C.platformHi, 0.4);
      // Edge
      game.draw.rect(px2, py2, plat.w, 6, C.platformHi, 0.6);

      // Visited marker
      if (p < currentPlat) {
        game.draw.circle(px2 + plat.w / 2, py2 - 30, 20, C.good);
      }
    }

    // Bridge
    if (bridgeLen > 0) {
      var bStartX = currentPlatRight();
      var rad = (bridgeFallAngle / 180) * Math.PI;
      // Bridge rotates from start point
      var bEndX = bStartX + Math.sin(rad) * bridgeLen;
      var bEndY = FLOOR_Y - Math.cos(rad) * bridgeLen;
      game.draw.line(bStartX, FLOOR_Y, bEndX, bEndY, C.bridge, 16);
      game.draw.line(bStartX, FLOOR_Y, bEndX, bEndY, C.bridgeHi, 6);
    }

    // Player
    var playerScreenX = currentPlatLeft() + PLAYER_W / 2;
    if (phase === 'walking') {
      // Walking on bridge
      var bStart2 = currentPlatRight();
      playerScreenX = bStart2 + playerWalkX;
    }
    var playerScreenY = FLOOR_Y - PLAYER_H;

    // Walking bob
    var bob = phase === 'walking' ? Math.sin(game.time.elapsed * 12) * 8 : 0;

    game.draw.rect(playerScreenX - PLAYER_W/2, playerScreenY + bob, PLAYER_W, PLAYER_H, C.player);
    game.draw.rect(playerScreenX - PLAYER_W/2 + 8, playerScreenY + bob + 8, PLAYER_W - 16, PLAYER_H * 0.3, C.playerHi, 0.5);
    // Eyes
    game.draw.circle(playerScreenX - 14, playerScreenY + bob + 20, 12, '#fff');
    game.draw.circle(playerScreenX + 14, playerScreenY + bob + 20, 12, '#fff');
    game.draw.circle(playerScreenX - 14, playerScreenY + bob + 20, 6, '#000');
    game.draw.circle(playerScreenX + 14, playerScreenY + bob + 20, 6, '#000');

    // Bridge length indicator (while growing)
    if (phase === 'growing' || (phase === 'falling' && bridgeFallAngle < 20)) {
      game.draw.text(Math.floor(bridgeLen) + '', W * 0.5, H * 0.2, {
        size: 80, color: bridgeLen > maxBridgeLen * 0.8 ? C.danger : C.player, bold: true
      });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#05080e');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / 5', W / 2, 128, { size: 56, color: C.good, bold: true });

    // Guide
    var guideText = phase === 'idle' ? '長押しで橋を伸ばす' : (phase === 'growing' ? '離すと橋が倒れる！' : '');
    game.draw.text(guideText, W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
