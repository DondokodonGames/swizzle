// 358-bridge-cross.js
// ブリッジクロス — 壊れかけの橋を渡る、崩れる前に次の足場へ
// 操作: タップで次の石へジャンプ
// 成功: 川を10本渡る  失敗: 落ちる4回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1628',
    water:  '#1d4ed8',
    waterHi:'#3b82f6',
    waterFoam:'#93c5fd',
    stone:  '#6b7280',
    stoneHi:'#9ca3af',
    stoneCracked:'#d97706',
    stoneGone:'#ef4444',
    player: '#fbbf24',
    playerHi:'#fff',
    goal:   '#22c55e',
    goalHi: '#86efac',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var NUM_STONES = 5;
  var STONE_SPACING = (W - 200) / (NUM_STONES + 1);
  var stones = [];
  var playerStoneIdx = 0;
  var riversCrossed = 0;
  var NEEDED = 10;
  var falls = 0;
  var MAX_FALLS = 4;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var jumpAnim = 0;
  var jumpFrom = 0;
  var jumpTo = 0;
  var jumping = false;
  var waterWave = 0;
  var resultAnim = 0;
  var resultText = '';

  function setupRiver() {
    stones = [];
    // Starting bank
    stones.push({ x: 80, y: H * 0.55, r: 60, health: 3, crumbling: false, gone: false });
    // Stepping stones
    for (var i = 0; i < NUM_STONES; i++) {
      var maxHealth = 1 + Math.floor(Math.random() * 3); // 1-3
      stones.push({
        x: 100 + (i + 1) * STONE_SPACING,
        y: H * 0.55 + (Math.random() - 0.5) * 80,
        r: 44,
        health: maxHealth,
        maxHealth: maxHealth,
        crumbling: false,
        gone: false
      });
    }
    // End bank
    stones.push({ x: W - 80, y: H * 0.55, r: 60, health: 3, crumbling: false, gone: false });
    playerStoneIdx = 0;
  }

  function jump(toIdx) {
    if (jumping || done) return;
    var from = stones[playerStoneIdx];
    var to = stones[toIdx];
    if (!to || to.gone) return;
    // Can only jump to adjacent stone
    if (Math.abs(toIdx - playerStoneIdx) !== 1) return;

    jumping = true;
    jumpFrom = playerStoneIdx;
    jumpTo = toIdx;
    game.audio.play('se_tap', 0.4);
    setTimeout(function() {
      jumping = false;
      playerStoneIdx = toIdx;

      // Damage stone landed on
      var landed = stones[playerStoneIdx];
      if (landed.health > 0 && landed.health < 3) {
        landed.health--;
        if (landed.health <= 0) {
          landed.gone = true;
          // Player falls
          falls++;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: landed.x, y: landed.y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life:0.6, col: C.waterHi });
          }
          if (falls >= MAX_FALLS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
          // Reset to start
          setupRiver();
          playerStoneIdx = 0;
          return;
        }
      }

      // Reached end?
      if (playerStoneIdx === stones.length - 1) {
        riversCrossed++;
        resultText = '渡れた！';
        resultAnim = 0.7;
        game.audio.play('se_success', 0.6);
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: stones[stones.length-1].x, y: stones[stones.length-1].y, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.6, col: C.goalHi });
        }
        if (riversCrossed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(riversCrossed * 300 + Math.ceil(timeLeft) * 80); }, 600);
          return;
        }
        setupRiver();
        playerStoneIdx = 0;
      }
    }, 250);
  }

  game.onTap(function(tx, ty) {
    if (done || jumping) return;
    // Find tapped stone
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      if (!s.gone && Math.hypot(tx - s.x, ty - s.y) < s.r + 20) {
        if (i === playerStoneIdx + 1 || i === playerStoneIdx - 1) {
          jump(i);
          return;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;
    waterWave += dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Water
    game.draw.rect(0, H * 0.42, W, H * 0.3, C.water, 0.8);
    for (var wx = 0; wx < W; wx += 120) {
      var wave = Math.sin(waterWave * 2 + wx * 0.02) * 15;
      game.draw.circle(wx + 60, H * 0.42 + wave, 60, C.waterHi, 0.2);
    }
    // Foam
    for (var fx = 0; fx < W; fx += 80) {
      var foam = Math.sin(waterWave * 3 + fx * 0.03) * 10;
      game.draw.circle(fx + 40, H * 0.42 + 10 + foam, 20, C.waterFoam, 0.3);
    }

    // Banks
    game.draw.rect(0, H * 0.45, 110, H * 0.25, C.stoneHi, 0.8);
    game.draw.rect(W - 110, H * 0.45, 110, H * 0.25, C.goal, 0.6);
    game.draw.text('START', 55, H * 0.48, { size: 28, color: C.stone });
    game.draw.text('GOAL', W - 55, H * 0.48, { size: 28, color: C.goalHi });

    // Stones
    for (var si = 0; si < stones.length; si++) {
      var s2 = stones[si];
      if (s2.gone) {
        game.draw.circle(s2.x, s2.y, s2.r, C.water, 0.3);
        continue;
      }
      var health = s2.health !== undefined ? s2.health : 3;
      var maxH = s2.maxHealth || 3;
      var col = health >= 2 ? C.stone : C.stoneCracked;
      if (health === 1 && maxH > 1) col = C.stoneCracked;
      game.draw.circle(s2.x, s2.y, s2.r + 6, col, 0.2);
      game.draw.circle(s2.x, s2.y, s2.r, col, 0.85);
      // Cracks
      if (maxH > 1 && health < maxH) {
        game.draw.line(s2.x - 10, s2.y - 20, s2.x + 10, s2.y + 20, C.stoneCracked, 3);
        if (health === 1) {
          game.draw.line(s2.x - 20, s2.y + 5, s2.x + 20, s2.y - 5, C.stoneGone, 3);
        }
      }
      // Health dots
      if (si > 0 && si < stones.length - 1) {
        for (var h = 0; h < maxH; h++) {
          var dotCol = h < health ? C.stoneHi : '#333';
          game.draw.circle(s2.x - (maxH-1)*8 + h*16, s2.y - s2.r - 12, 6, dotCol, 0.8);
        }
      }
      // Tap hint if adjacent
      if (Math.abs(si - playerStoneIdx) === 1 && !s2.gone) {
        game.draw.circle(s2.x, s2.y, s2.r + 16, C.playerHi, 0.15 + Math.sin(elapsed * 4) * 0.1);
      }
    }

    // Jump animation
    if (jumping) {
      var fs = stones[jumpFrom], ts = stones[jumpTo];
      var t = 0.5 + 0.5 * Math.sin(elapsed * 20);
      var jx = fs.x + (ts.x - fs.x) * 0.5;
      var jy = Math.min(fs.y, ts.y) - 100;
      game.draw.circle(jx, jy, 28, C.player, 0.9);
    } else {
      // Player on stone
      var ps = stones[playerStoneIdx];
      if (ps && !ps.gone) {
        game.draw.circle(ps.x, ps.y - ps.r - 20, 32, C.player, 0.95);
        game.draw.circle(ps.x, ps.y - ps.r - 42, 20, C.playerHi, 0.9);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 56, color: C.goalHi, bold: true });
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 28 + fi * 56, H * 0.91, 16, fi < falls ? C.danger : '#0a1628');
    }

    game.draw.text(riversCrossed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.water : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    setupRiver();
  });
})(game);
