// 038-laser-dodge.js
// レーザードッジ — チカッと光るレーザーを体で避ける緊張の一瞬
// 操作: スワイプで位置を3列のうち一つに移動
// 成功: 15秒生存  失敗: レーザーに当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    column:  '#04101e',
    player:  '#22d3ee',
    playerHi:'#a5f3fc',
    laser:   '#ef4444',
    laserHi: '#fca5a5',
    warn:    '#f59e0b',
    good:    '#22c55e',
    ui:      '#475569'
  };

  var COL_COUNT = 3;
  var COL_W = W / COL_COUNT;
  var playerCol = 1; // 0=left, 1=center, 2=right
  var PLAYER_R = 56;
  var PLAYER_Y = H * 0.75;

  var lasers = [];
  // Each laser: { col, phase, warnTimer, activeTimer }
  var WARNING_TIME = 0.7;
  var ACTIVE_TIME = 0.35;

  var timeLeft = 15;
  var done = false;
  var elapsed = 0;

  function spawnLaser() {
    var col = Math.floor(Math.random() * COL_COUNT);
    lasers.push({ col: col, warnTimer: WARNING_TIME, activeTimer: 0, state: 'warn' });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && playerCol > 0) {
      playerCol--;
      game.audio.play('se_tap', 0.4);
    } else if (dir === 'right' && playerCol < 2) {
      playerCol++;
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + 100); }, 300);
        return;
      }
    }

    // Spawn lasers (frequency increases over time)
    var spawnRate = Math.max(0.6, 2.0 - elapsed * 0.06);
    if (Math.random() < dt / spawnRate) {
      spawnLaser();
      // Sometimes spawn 2 simultaneous lasers (forces a specific column)
      if (elapsed > 8 && Math.random() < 0.3) {
        spawnLaser();
      }
    }

    // Update lasers
    for (var i = lasers.length - 1; i >= 0; i--) {
      var laser = lasers[i];
      if (laser.state === 'warn') {
        laser.warnTimer -= dt;
        if (laser.warnTimer <= 0) {
          laser.state = 'active';
          laser.activeTimer = ACTIVE_TIME;
          game.audio.play('se_failure', 0.3);
        }
      } else if (laser.state === 'active') {
        laser.activeTimer -= dt;
        // Collision check
        if (laser.col === playerCol) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        if (laser.activeTimer <= 0) {
          lasers.splice(i, 1);
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Columns
    for (var c = 0; c < COL_COUNT; c++) {
      var cx2 = c * COL_W;
      game.draw.rect(cx2, 0, COL_W, H, C.column, c % 2 === 0 ? 1 : 0.7);
      // Column dividers
      if (c > 0) game.draw.rect(cx2, 0, 2, H, '#0a1a2a');
    }

    // Laser beams
    for (var l = 0; l < lasers.length; l++) {
      var laser2 = lasers[l];
      var lx = laser2.col * COL_W + COL_W / 2;

      if (laser2.state === 'warn') {
        // Warning flash (pulsing yellow line)
        var warnProg = 1 - laser2.warnTimer / WARNING_TIME;
        var warnAlpha = 0.3 + 0.5 * Math.sin(warnProg * Math.PI * 6);
        game.draw.rect(laser2.col * COL_W, 0, COL_W, H, C.warn, warnAlpha * 0.3);
        game.draw.line(lx, 0, lx, H, C.warn, 4 + warnProg * 8);

        // Warning icon
        game.draw.text('⚠', lx, H * 0.2, { size: 80, color: C.warn, bold: true });
      } else if (laser2.state === 'active') {
        // Active laser
        var laserAlpha = 0.6 + 0.4 * Math.sin(game.time.elapsed * 40);
        game.draw.rect(laser2.col * COL_W, 0, COL_W, H, C.laser, laserAlpha * 0.4);
        game.draw.line(lx - 12, 0, lx - 12, H, C.laser, 8);
        game.draw.line(lx, 0, lx, H, C.laserHi, 12);
        game.draw.line(lx + 12, 0, lx + 12, H, C.laser, 8);
        // Glow
        game.draw.rect(laser2.col * COL_W, 0, COL_W, H, C.laserHi, 0.08);
      }
    }

    // Player
    var px3 = playerCol * COL_W + COL_W / 2;
    game.draw.circle(px3, PLAYER_Y, PLAYER_R + 14, C.playerHi, 0.15);
    game.draw.circle(px3, PLAYER_Y, PLAYER_R, C.player);
    game.draw.circle(px3, PLAYER_Y, PLAYER_R * 0.5, C.playerHi, 0.7);
    game.draw.circle(px3, PLAYER_Y, PLAYER_R * 0.25, '#fff', 0.9);

    // Player column highlight
    game.draw.rect(playerCol * COL_W, H - 120, COL_W, 120, C.player, 0.08);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#020810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.laser);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('スワイプで避けろ！', W / 2, H - 190, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);
