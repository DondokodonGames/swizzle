// 629-crumble-wall.js
// クランブルウォール — 崩れ落ちる壁に穴が開く前に通り抜けろ
// 操作: スワイプで左右に移動、タイミングよく壁の穴を通過
// 成功: 20枚突破  失敗: 5回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080404',
    wall:    '#5a2a1a',
    wallHi:  '#8a4a30',
    wallCrk: '#3a1a0a',
    player:  '#60a5fa',
    playerHi:'#bfdbfe',
    safe:    '#22c55e',
    hit:     '#ef4444',
    text:    '#f1f5f9',
    ui:      '#1a0a06',
    dust:    '#aa8866'
  };

  var PLAYER_X = W / 2;
  var PLAYER_Y = H * 0.75;
  var PLAYER_R = 32;
  var playerCol = 2; // column (0-4)
  var COLS = 5;
  var COL_W = W / COLS;

  var walls = [];
  var passed = 0;
  var NEEDED = 20;
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var invincible = 0;
  var spawnTimer = 0;
  var wallSpeed = 320;
  var targetCol = 2;

  function spawnWall() {
    // Open 1-2 holes
    var holeCount = elapsed < 20 ? 2 : 1;
    var holes = [];
    var available = [0,1,2,3,4];
    for (var i = 0; i < holeCount; i++) {
      var idx = Math.floor(Math.random() * available.length);
      holes.push(available.splice(idx, 1)[0]);
    }
    walls.push({
      y: -60,
      holes: holes,
      h: 60,
      crumble: 0 // 0-1 animation for crumbling effect
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && targetCol > 0) {
      targetCol--;
      game.audio.play('se_tap', 0.15);
    } else if (dir === 'right' && targetCol < COLS - 1) {
      targetCol++;
      game.audio.play('se_tap', 0.15);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor(tx / COL_W);
    col = Math.max(0, Math.min(COLS - 1, col));
    targetCol = col;
    game.audio.play('se_tap', 0.1);
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
    if (invincible > 0) invincible -= dt;

    // Smooth column movement
    playerCol += (targetCol - playerCol) * Math.min(1, dt * 12);

    wallSpeed = 320 + elapsed * 4 + passed * 5;

    spawnTimer += dt;
    if (spawnTimer > 1.2) {
      spawnTimer = 0;
      spawnWall();
    }

    var px = COL_W * playerCol + COL_W / 2;

    for (var wi = walls.length - 1; wi >= 0; wi--) {
      var w = walls[wi];
      w.y += wallSpeed * dt;
      w.crumble = Math.max(0, Math.min(1, (w.y - H * 0.5) / 200));

      // Check collision
      if (invincible <= 0 && w.y + w.h >= PLAYER_Y - PLAYER_R && w.y <= PLAYER_Y + PLAYER_R) {
        var pc = Math.floor(px / COL_W);
        var inHole = false;
        for (var hi = 0; hi < w.holes.length; hi++) {
          if (w.holes[hi] === pc) { inHole = true; break; }
        }
        // More precise: check if center is in hole col
        var exactCol = px / COL_W - 0.5;
        for (var hi2 = 0; hi2 < w.holes.length; hi2++) {
          if (Math.abs(exactCol - w.holes[hi2]) < 0.45) { inHole = true; break; }
        }
        if (!inHole) {
          hits++;
          invincible = 0.8;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: px, y: PLAYER_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.playerHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }

      // Passed
      if (w.y > H + 80) {
        walls.splice(wi, 1);
        passed++;
        if (passed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(passed * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Column guides
    for (var ci = 0; ci < COLS; ci++) {
      game.draw.rect(ci * COL_W, 0, 2, H, C.ui, 0.5);
    }

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w2 = walls[wi2];
      var crumbleShake = w2.crumble > 0.5 ? (Math.random() - 0.5) * w2.crumble * 8 : 0;
      for (var ci2 = 0; ci2 < COLS; ci2++) {
        var isHole = false;
        for (var hi3 = 0; hi3 < w2.holes.length; hi3++) {
          if (w2.holes[hi3] === ci2) { isHole = true; break; }
        }
        if (!isHole) {
          var wx = ci2 * COL_W + crumbleShake;
          var wy = w2.y;
          game.draw.rect(wx + 4, wy, COL_W - 8, w2.h, C.wallCrk, 0.9);
          game.draw.rect(wx + 4, wy, COL_W - 8, w2.h, C.wall, 0.9 - w2.crumble * 0.5);
          game.draw.rect(wx + 4, wy, COL_W - 8, 8, C.wallHi, 0.5);
          // Crack marks
          if (w2.crumble > 0.3) {
            game.draw.line(wx + COL_W * 0.3, wy + 10, wx + COL_W * 0.5, wy + w2.h - 10, C.wallCrk, 3);
          }
        }
      }
    }

    // Player
    var pAlpha = (invincible > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.circle(px + 4, PLAYER_Y + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(px, PLAYER_Y, PLAYER_R, C.player, pAlpha);
    game.draw.circle(px - 10, PLAYER_Y - 10, PLAYER_R * 0.3, C.playerHi, pAlpha * 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // Hit dots
    for (var hi4 = 0; hi4 < MAX_HITS; hi4++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi4 * 104, H * 0.955, 22, hi4 < hits ? C.hit : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnWall();
  });
})(game);
