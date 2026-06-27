// 651-lava-hop.js
// ラバホップ — 溶岩の上の石を飛び移れ、石は沈んでいく
// 操作: タップで次の石へジャンプ
// 成功: 25石クリア  失敗: 溶岩落下5回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#100200',
    lava:    '#c2410c',
    lavaHi:  '#fb923c',
    lavaGlow:'#ea580c',
    stone:   '#57534e',
    stoneHi: '#a8a29e',
    stoneSink:'#44403c',
    player:  '#60a5fa',
    playerHi:'#bfdbfe',
    safe:    '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#1c0400'
  };

  var STONE_R = 56;
  var LAVA_Y = H * 0.7;
  var PLAYER_R = 32;

  var stones = [];
  var playerX = 0, playerY = 0;
  var jumping = false;
  var jumpX = 0, jumpY = 0, jumpTargetX = 0, jumpTargetY = 0;
  var jumpT = 0, jumpDur = 0.35;
  var currentStone = 0;

  var cleared = 0;
  var NEEDED = 25;
  var fell = 0;
  var MAX_FELL = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.safe;
  var lavaWave = 0;

  function genStones() {
    stones = [];
    var x = 120;
    for (var i = 0; i < 6; i++) {
      var y = LAVA_Y - 80 - Math.random() * 160;
      stones.push({
        x: x,
        y: y,
        sinkSpeed: 15 + Math.random() * 20,
        originalY: y,
        sinking: false,
        sinkTimer: 0,
        r: STONE_R
      });
      x += 140 + Math.random() * 100;
    }
    currentStone = 0;
    playerX = stones[0].x;
    playerY = stones[0].y - STONE_R - PLAYER_R;
    stones[0].sinking = true;
    stones[0].sinkTimer = 1.5;
  }

  function shiftStones() {
    // Remove stones behind, add new ones ahead
    stones.shift();
    var lastX = stones[stones.length - 1].x;
    var y = LAVA_Y - 80 - Math.random() * 160;
    stones.push({
      x: lastX + 140 + Math.random() * 100,
      y: y,
      sinkSpeed: 15 + Math.random() * 20 + cleared * 0.5,
      originalY: y,
      sinking: false,
      sinkTimer: 0,
      r: STONE_R
    });
    currentStone = Math.max(0, currentStone - 1);
  }

  function jumpTo(targetIdx) {
    if (jumping || targetIdx >= stones.length) return;
    var target = stones[targetIdx];
    if (!target) return;
    jumping = true;
    jumpX = playerX; jumpY = playerY;
    jumpTargetX = target.x;
    jumpTargetY = target.y - STONE_R - PLAYER_R;
    jumpT = 0;
    currentStone = targetIdx;
    target.sinking = true;
    target.sinkTimer = 1.5;
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(tx, ty) {
    if (done || jumping) return;
    // Jump to nearest stone ahead
    var bestIdx = -1, bestDist = Infinity;
    for (var i = 0; i < stones.length; i++) {
      if (i <= currentStone) continue;
      var dx = stones[i].x - tx, dy = stones[i].y - ty;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestDist < 300) {
      jumpTo(bestIdx);
    } else {
      // Jump to next stone
      jumpTo(currentStone + 1);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    lavaWave += dt * 2;

    // Jump animation
    if (jumping) {
      jumpT += dt;
      var t = Math.min(1, jumpT / jumpDur);
      var arc = Math.sin(t * Math.PI) * 120; // jump height
      playerX = jumpX + (jumpTargetX - jumpX) * t;
      playerY = jumpY + (jumpTargetY - jumpY) * t - arc;

      if (t >= 1) {
        jumping = false;
        playerX = jumpTargetX;
        playerY = jumpTargetY;
        cleared++;
        game.audio.play('se_success', 0.3);
        for (var p = 0; p < 4; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: playerX, y: playerY, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.3, col: C.playerHi });
        }
        if (cleared >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(cleared * 200 + Math.ceil(timeLeft) * 100); }, 700);
          return;
        }
        // Shift view if player is near right edge
        if (currentStone >= 4) shiftStones();
      }
    }

    // Sink stones
    for (var si = 0; si < stones.length; si++) {
      var s = stones[si];
      if (s.sinking) {
        s.sinkTimer -= dt;
        if (s.sinkTimer <= 0) {
          s.y += s.sinkSpeed * dt;
        }
      }
    }

    // Check if player fell
    if (!jumping) {
      var curStone = stones[currentStone];
      if (curStone && curStone.y - STONE_R > LAVA_Y) {
        // Fell into lava!
        fell++;
        flashCol = C.lava;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.45);
        for (var p2 = 0; p2 < 8; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          particles.push({ x: playerX, y: LAVA_Y, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.5, col: C.lavaHi });
        }
        if (fell >= MAX_FELL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
        genStones();
        return;
      }
      if (curStone) {
        playerY = curStone.y - STONE_R - PLAYER_R;
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

    // Lava
    game.draw.rect(0, LAVA_Y, W, H - LAVA_Y, C.lava, 0.8);
    // Lava waves
    for (var lw = 0; lw < 8; lw++) {
      var lwx = (lw * W / 7 + lavaWave * 60) % (W + 60) - 30;
      game.draw.circle(lwx, LAVA_Y, 40, C.lavaHi, 0.3 + Math.sin(lavaWave + lw) * 0.1);
    }
    game.draw.rect(0, LAVA_Y, W, 20, C.lavaGlow, 0.4);

    // Stones
    for (var si2 = 0; si2 < stones.length; si2++) {
      var s2 = stones[si2];
      if (s2.y > H + 60) continue;
      var sinkRatio = s2.sinking ? Math.max(0, 1 - s2.sinkTimer / 1.5) : 0;
      var stoneCol = sinkRatio > 0.5 ? C.stoneSink : C.stone;
      game.draw.circle(s2.x + 5, s2.y + 5, s2.r, '#000', 0.4);
      game.draw.circle(s2.x, s2.y, s2.r, stoneCol, 0.9);
      game.draw.circle(s2.x - 16, s2.y - 16, s2.r * 0.3, C.stoneHi, 0.4);
      // Sink warning
      if (sinkRatio > 0.3) {
        var warnAlpha = (sinkRatio - 0.3) / 0.7 * 0.5;
        game.draw.circle(s2.x, s2.y, s2.r + 12, C.lavaHi, warnAlpha);
      }
    }

    // Player
    game.draw.circle(playerX + 4, playerY + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(playerX, playerY, PLAYER_R, C.player, 0.9);
    game.draw.circle(playerX - 10, playerY - 10, PLAYER_R * 0.3, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fell dots
    for (var fi = 0; fi < MAX_FELL; fi++) {
      game.draw.circle(W / 2 - (MAX_FELL - 1) * 52 + fi * 104, H * 0.955, 22, fi < fell ? C.lava : C.ui, 0.9);
    }

    game.draw.text(cleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.lava);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    genStones();
  });
})(game);
