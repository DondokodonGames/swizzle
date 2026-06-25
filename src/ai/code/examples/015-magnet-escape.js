// 015-magnet-escape.js
// 磁石逃亡 — 引き寄せる力に逆らいながら脱出する緊張感
// 操作: スワイプで4方向に移動
// 成功: 15秒間磁石に吸い込まれずに生き延びる  失敗: 磁石に触れる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0c0410',
    fieldN:   '#ef4444',  // red = North
    fieldS:   '#3b82f6',  // blue = South
    player:   '#fbbf24',
    playerGlow:'#fef3c7',
    trail:    '#d97706',
    repel:    '#22c55e',
    danger:   '#ff0000',
    ui:       '#6b7280'
  };

  var player = { x: W / 2, y: H / 2 };
  var PLAYER_R = 40;
  var MOVE_STEP = 220;
  var timeLeft = 15;
  var done = false;

  var magnets = [];
  var trailPts = [];
  var magnetSpawnTimer = 2.0;

  function spawnMagnet() {
    // spawn on edge
    var edge = Math.floor(Math.random() * 4);
    var mx, my;
    if (edge === 0) { mx = game.random(80, W - 80); my = -80; }      // top
    else if (edge === 1) { mx = W + 80; my = game.random(200, H - 200); } // right
    else if (edge === 2) { mx = game.random(80, W - 80); my = H + 80; }   // bottom
    else { mx = -80; my = game.random(200, H - 200); }                     // left

    var isNorth = Math.random() < 0.5;
    magnets.push({
      x: mx, y: my,
      r: 56,
      isNorth: isNorth,
      vx: (W / 2 - mx) * 0.12,
      vy: (H / 2 - my) * 0.12,
      age: 0
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left')  player.x = Math.max(PLAYER_R, player.x - MOVE_STEP);
    if (dir === 'right') player.x = Math.min(W - PLAYER_R, player.x + MOVE_STEP);
    if (dir === 'up')    player.y = Math.max(200 + PLAYER_R, player.y - MOVE_STEP);
    if (dir === 'down')  player.y = Math.min(H - PLAYER_R, player.y + MOVE_STEP);
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (done) {
      drawScene();
      return;
    }

    timeLeft -= dt;
    if (timeLeft <= 0) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(200 + Math.floor(timeLeft * 0 + 200)); }, 300);
      return;
    }

    // spawn magnets
    magnetSpawnTimer -= dt;
    if (magnetSpawnTimer <= 0 && magnets.length < 5) {
      spawnMagnet();
      magnetSpawnTimer = Math.max(1.2, 2.5 - (15 - timeLeft) * 0.08);
    }

    // move magnets toward player (gravity attraction)
    for (var i = magnets.length - 1; i >= 0; i--) {
      var mg = magnets[i];
      mg.age += dt;

      var dx = player.x - mg.x;
      var dy = player.y - mg.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) dist = 1;

      // attraction force (inverse square-ish)
      var force = 60000 / (dist * dist + 1000);
      var ux = dx / dist;
      var uy = dy / dist;

      mg.vx += ux * force * dt;
      mg.vy += uy * force * dt;
      mg.vx *= 0.98;
      mg.vy *= 0.98;

      mg.x += mg.vx * dt;
      mg.y += mg.vy * dt;

      // collision with player
      if (dist < mg.r + PLAYER_R - 8) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }

      // remove if out of bounds for too long
      if (mg.age > 12 || (mg.x < -200 || mg.x > W + 200 || mg.y < -200 || mg.y > H + 200)) {
        magnets.splice(i, 1);
      }
    }

    // trail
    trailPts.unshift({ x: player.x, y: player.y });
    if (trailPts.length > 8) trailPts.pop();

    drawScene();
  });

  function drawScene() {
    game.draw.rect(0, 0, W, H, C.bg);

    // magnetic field lines (background)
    for (var i = 0; i < magnets.length; i++) {
      var mg = magnets[i];
      for (var ring = 1; ring <= 3; ring++) {
        game.draw.circle(mg.x, mg.y, mg.r * (1 + ring * 1.2), mg.isNorth ? C.fieldN : C.fieldS,
          0.04 + 0.02 * Math.sin(game.time.elapsed * 3 - ring));
      }
    }

    // timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#0a0210');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // danger flash near magnets
    var minDist = 9999;
    for (var j = 0; j < magnets.length; j++) {
      var dx = player.x - magnets[j].x;
      var dy = player.y - magnets[j].y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < minDist) minDist = d;
    }
    var dangerLevel = Math.max(0, 1 - minDist / 300);
    if (dangerLevel > 0) {
      game.draw.rect(0, 0, W, H, C.danger, dangerLevel * 0.12 * (0.5 + 0.5 * Math.sin(game.time.elapsed * 12)));
    }

    // trail
    for (var t = 0; t < trailPts.length; t++) {
      var tp = trailPts[t];
      var ta = (1 - t / trailPts.length) * 0.5;
      game.draw.circle(tp.x, tp.y, PLAYER_R * 0.6 * (1 - t / trailPts.length), C.trail, ta);
    }

    // magnets
    for (var k = 0; k < magnets.length; k++) {
      var mg2 = magnets[k];
      var col = mg2.isNorth ? C.fieldN : C.fieldS;
      var pulse = 0.85 + 0.15 * Math.sin(game.time.elapsed * 5 + k);
      // outer ring
      game.draw.circle(mg2.x, mg2.y, mg2.r * 1.3 * pulse, col, 0.25);
      // body
      game.draw.circle(mg2.x, mg2.y, mg2.r, col);
      game.draw.circle(mg2.x, mg2.y, mg2.r * 0.6, '#ffffff', 0.3);
      // N/S label
      game.draw.text(mg2.isNorth ? 'N' : 'S', mg2.x, mg2.y, { size: 52, color: '#fff', bold: true });
    }

    // player
    game.draw.circle(player.x, player.y, PLAYER_R + 12, C.playerGlow, 0.3);
    game.draw.circle(player.x, player.y, PLAYER_R, C.player);
    game.draw.circle(player.x, player.y, PLAYER_R * 0.45, '#fff', 0.7);

    // guide
    game.draw.text('スワイプで逃げろ！', W / 2, H - 180, { size: 52, color: C.ui });
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnMagnet();
  });
})(game);
