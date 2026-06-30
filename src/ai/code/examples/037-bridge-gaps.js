// 037-bridge-gaps.js
// ブリッジギャップ — 橋を伸ばして渡る、長さの感覚を磨く一発勝負
// 操作: 長押しで橋を伸ばし、離すと渡り始める（長すぎると落ちる）
// 成功: 1つの台に着地  失敗: 橋が短すぎor長すぎ or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BRIDGE GAPS';
  var HOW_TO_PLAY = 'HOLD TO GROW, RELEASE TO DROP';
  var MAX_TIME = 30;
  var NEEDED = 1;            // 修正2: 5 → 1
  var FLOOR_Y = H * 0.72, PLAT_H = 56, PLAYER_W = 72, PLAYER_H = 96;
  var maxBridgeLen = 720, BRIDGE_GROW_RATE = 340, WALK_SPEED = 320;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var platforms, currentPlat, scrollX, bridgeLen, bridgeGrowing, phase, bridgeFallAngle, playerWalkX, score, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function generatePlatforms(count) {
    var plats = [], x = 80, pw = 180 + Math.random() * 60;
    plats.push({ x: x, w: pw });
    for (var i = 0; i < count; i++) { var gap = 200 + Math.random() * 180; x = plats[plats.length - 1].x + plats[plats.length - 1].w + gap; pw = 140 + Math.random() * 100; plats.push({ x: x, w: pw }); }
    return plats;
  }
  function initGame() {
    platforms = generatePlatforms(NEEDED + 1); currentPlat = 0; scrollX = 0;
    bridgeLen = 0; bridgeGrowing = false; phase = 'idle'; bridgeFallAngle = 0; playerWalkX = 0;
    score = 0; timeLeft = MAX_TIME; done = false;
  }
  function platRight() { return platforms[currentPlat].x + platforms[currentPlat].w - scrollX; }
  function platLeft() { return platforms[currentPlat].x - scrollX; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onHold(function(x, y) { if (state === S.PLAYING && !done && phase === 'idle') { bridgeGrowing = true; phase = 'growing'; } });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'growing' || bridgeGrowing) { bridgeGrowing = false; phase = 'falling'; game.audio.play('se_tap', 0.6); }
  });

  function background() {
    game.draw.clear(C.bg);
    for (var d = 0; d < 5; d++) game.draw.rect(0, FLOOR_Y - 80 - d * 80, W, 2, C.d, 0.3);
  }

  function drawScene() {
    for (var p = 0; p < platforms.length; p++) {
      var plat = platforms[p], px = plat.x - scrollX;
      game.draw.rect(snap(px), snap(FLOOR_Y), plat.w, H, C.a);
      game.draw.rect(snap(px), snap(FLOOR_Y), plat.w, 8, C.e);
      if (p < currentPlat) game.draw.rect(snap(px + plat.w / 2) - 16, snap(FLOOR_Y) - 48, 32, 32, C.b);
    }
    if (bridgeLen > 0) {
      var bsx = platRight(), rad = (bridgeFallAngle / 180) * Math.PI;
      var bex = bsx + Math.sin(rad) * bridgeLen, bey = FLOOR_Y - Math.cos(rad) * bridgeLen;
      game.draw.line(bsx, FLOOR_Y, bex, bey, C.f, 16);
    }
    var psx = platLeft() + PLAYER_W / 2;
    if (phase === 'walking') psx = platRight() + playerWalkX;
    var bob = phase === 'walking' ? (Math.floor(game.time.elapsed * 12) % 2) * 8 : 0;
    game.draw.rect(snap(psx - PLAYER_W / 2), snap(FLOOR_Y - PLAYER_H + bob), PLAYER_W, PLAYER_H, C.c);
    game.draw.rect(snap(psx) - 18, snap(FLOOR_Y - PLAYER_H + bob) + 20, 14, 14, C.a);
    game.draw.rect(snap(psx) + 6, snap(FLOOR_Y - PLAYER_H + bob) + 20, 14, 14, C.a);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!platforms) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.2, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 36, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.58, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.66, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'growing') { bridgeLen += BRIDGE_GROW_RATE * dt; if (bridgeLen >= maxBridgeLen) { bridgeLen = maxBridgeLen; bridgeGrowing = false; phase = 'falling'; } }
      else if (phase === 'falling') {
        bridgeFallAngle += 180 * dt;
        if (bridgeFallAngle >= 90) {
          bridgeFallAngle = 90;
          var bridgeEnd = platRight() + bridgeLen, np = platforms[currentPlat + 1];
          if (np && bridgeEnd >= np.x - scrollX && bridgeEnd <= np.x + np.w - scrollX) { phase = 'walking'; playerWalkX = 0; game.audio.play('se_tap', 0.4); }
          else { finish(false); return; }
        }
      } else if (phase === 'walking') {
        playerWalkX += WALK_SPEED * dt;
        if (playerWalkX >= bridgeLen) {
          currentPlat++; score++; bridgeLen = 0; bridgeFallAngle = 0; playerWalkX = 0; phase = 'idle';
          game.audio.play('se_tap', 0.8);
          scrollX = platforms[currentPlat].x - W * 0.2;
          if (currentPlat >= platforms.length - 1) { finish(true); return; }
        }
      }
    }

    // ---- draw ----
    background();
    drawScene();
    if (phase === 'growing' || (phase === 'falling' && bridgeFallAngle < 20)) txt(Math.floor(bridgeLen) + '', W / 2, H * 0.22, 80, bridgeLen > maxBridgeLen * 0.8 ? C.a : C.c);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    txt(phase === 'idle' ? 'HOLD TO GROW!' : (phase === 'growing' ? 'RELEASE!' : ''), W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
