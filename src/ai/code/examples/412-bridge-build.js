// 412-bridge-build.js
// 橋を架ける — 棒を伸ばして向こう岸に届かせる
// 操作: タップ長押しで棒を伸ばし、離すと倒れる
// 成功: 10プラットフォームを渡る  失敗: 3回落ちる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04080f',
    sky:    '#0c1828',
    platform:'#78350f',
    platHi: '#92400e',
    platFace:'#b45309',
    stick:  '#e2e8f0',
    stickGood:'#22c55e',
    stickBad:'#ef4444',
    player: '#f97316',
    playerHi:'#fed7aa',
    bonus:  '#fbbf24',
    abyss:  '#020408',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var PLAT_H = 80;
  var PLAT_Y = H * 0.72;
  var playerSize = 36;

  // Platforms
  var platforms = [];
  var nextPlatX = W/2 + 120;

  function addPlatform() {
    var prevX = platforms.length > 0 ? platforms[platforms.length-1].x + platforms[platforms.length-1].w : W*0.1;
    var gap = 200 + Math.random()*250;
    var w = 100 + Math.random()*120;
    var px = prevX + gap;
    platforms.push({ x: px, y: PLAT_Y, w: w });
  }

  // Initialize
  platforms.push({ x: 0, y: PLAT_Y, w: 200 });
  for (var pi = 0; pi < 5; pi++) addPlatform();

  var currentPlatIdx = 0;
  var playerX = 100;
  var playerY = PLAT_Y - playerSize;
  var stickLength = 0;
  var stickAngle = -Math.PI/2;  // starts vertical
  var phase = 'wait';  // wait, grow, fall, walk, fell
  var stickFalling = false;
  var walkTimer = 0;
  var scrollOffset = 0;
  var completed = 0;
  var NEEDED = 10;
  var fell = 0;
  var MAX_FELL = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var fallAnim = 0;

  function getCurrentPlatform() { return platforms[currentPlatIdx]; }
  function getNextPlatform() { return platforms[currentPlatIdx+1]; }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'wait') {
      phase = 'grow';
    } else if (phase === 'grow') {
      // Stop growing, start falling
      phase = 'fall';
      stickFalling = false;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (fallAnim > 0) fallAnim -= dt * 2;

    var curPlat = getCurrentPlatform();
    var nxtPlat = getNextPlatform();

    if (phase === 'grow') {
      stickLength += 400 * dt;
      if (stickLength > 800) stickLength = 800; // cap
    }

    if (phase === 'fall') {
      if (!stickFalling) {
        stickFalling = true;
      }
      stickAngle = Math.min(0, stickAngle + dt * 3.5);  // rotate to horizontal

      if (stickAngle >= 0) {
        stickAngle = 0;
        // Check if stick reaches next platform
        var stickEndX = (curPlat.x + curPlat.w - scrollOffset) + stickLength;
        var nextPlatLeft = nxtPlat.x - scrollOffset;
        var nextPlatRight = nxtPlat.x + nxtPlat.w - scrollOffset;

        if (stickEndX >= nextPlatLeft && stickEndX <= nextPlatRight) {
          // Perfect!
          phase = 'walk';
          walkTimer = 0;
          game.audio.play('se_success', 0.5);
          // Bonus if on center zone
          var centerDist = Math.abs(stickEndX - (nextPlatLeft+nextPlatRight)/2);
          if (centerDist < 30) {
            for (var pi2 = 0; pi2 < 8; pi2++) {
              var ang = Math.random()*Math.PI*2;
              particles.push({ x:stickEndX, y:PLAT_Y-scrollOffset*0, vx:Math.cos(ang)*150, vy:Math.sin(ang)*150, life:0.6, col:C.bonus });
            }
          }
        } else if (stickEndX >= nextPlatLeft) {
          // Made it but stick extends past
          phase = 'walk';
          walkTimer = 0;
          game.audio.play('se_success', 0.4);
        } else {
          // Too short — fall
          phase = 'fell';
          fell++;
          fallAnim = 0.6;
          game.audio.play('se_failure', 0.5);
          for (var pi3 = 0; pi3 < 10; pi3++) {
            var ang2 = Math.random()*Math.PI*2;
            particles.push({ x:playerX, y:playerY, vx:Math.cos(ang2)*150, vy:Math.sin(ang2)*200, life:0.7, col:C.player });
          }
          if (fell >= MAX_FELL && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 600); return; }
          setTimeout(function(){ resetToCurrentPlatform(); }, 1000);
        }
      }
    }

    if (phase === 'walk') {
      walkTimer += dt;
      var stickEndX2 = (curPlat.x + curPlat.w - scrollOffset) + stickLength;
      var nextPlatLeft2 = nxtPlat.x - scrollOffset;
      playerX = (curPlat.x + curPlat.w - scrollOffset) + walkTimer * 280;

      if (playerX >= nextPlatLeft2 + 40) {
        // Reached next platform
        completed++;
        currentPlatIdx++;
        scrollOffset = (platforms[currentPlatIdx].x + platforms[currentPlatIdx].w/2) - W*0.3;
        stickLength = 0;
        stickAngle = -Math.PI/2;
        playerX = platforms[currentPlatIdx].x - scrollOffset + 40;
        playerY = PLAT_Y - playerSize;
        phase = 'wait';
        addPlatform();
        game.audio.play('se_tap', 0.3);
        if (completed >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(completed*400+Math.ceil(timeLeft)*80); }, 600); }
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy += 400*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, PLAT_Y, C.sky, 0.9);
    game.draw.rect(0, PLAT_Y, W, H-PLAT_Y, C.abyss, 0.9);

    // Platforms
    for (var pi4 = 0; pi4 < platforms.length; pi4++) {
      var plt = platforms[pi4];
      var px2 = plt.x - scrollOffset;
      if (px2 > W + 200 || px2 + plt.w < -200) continue;
      game.draw.rect(px2, PLAT_Y, plt.w, PLAT_H, C.platform, 0.9);
      game.draw.rect(px2, PLAT_Y, plt.w, 20, C.platHi, 0.8);
      game.draw.rect(px2+8, PLAT_Y+24, plt.w-16, 20, C.platFace, 0.4);
    }

    // Stick
    if (phase !== 'wait' && phase !== 'fell') {
      var curPlat2 = getCurrentPlatform();
      var stickBaseX = curPlat2.x + curPlat2.w - scrollOffset;
      var stickBaseY = PLAT_Y;
      var stickEndX3 = stickBaseX + Math.cos(stickAngle)*stickLength;
      var stickEndY = stickBaseY + Math.sin(stickAngle)*stickLength;
      var isGood = phase === 'walk';
      game.draw.line(stickBaseX, stickBaseY, stickEndX3, stickEndY, isGood ? C.stickGood : C.stick, 10);
    }

    // Player
    game.draw.circle(playerX, playerY, playerSize, C.player, 0.9);
    game.draw.circle(playerX-10, playerY-10, playerSize*0.4, C.playerHi, 0.7);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.8);
    }

    if (fallAnim > 0) game.draw.rect(0, 0, W, H, C.stickBad, fallAnim*0.15);

    // Fell dots
    for (var fi = 0; fi < MAX_FELL; fi++) {
      game.draw.circle(W/2-(MAX_FELL-1)*44+fi*88, H*0.935, 18, fi < fell ? C.stickBad : C.ui, 0.9);
    }

    game.draw.text(completed + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.platHi : C.stickBad);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  function resetToCurrentPlatform() {
    if (done) return;
    stickLength = 0;
    stickAngle = -Math.PI/2;
    playerX = platforms[currentPlatIdx].x - scrollOffset + 50;
    playerY = PLAT_Y - playerSize;
    phase = 'wait';
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
