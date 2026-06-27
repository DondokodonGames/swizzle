// 611-neon-tetro.js
// ネオンテトロ — 落下するブロックの隙間を見抜いてすり抜けろ
// 操作: 左右スワイプでプレイヤー移動、タップで一時停止なし加速
// 成功: 30段落下  失敗: 3回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050010',
    p:       '#00ffcc',
    pHi:     '#aaffee',
    block:   '#ff2d78',
    blockHi: '#ff8ab8',
    safe:    '#22c55e',
    miss:    '#ef4444',
    grid:    '#0a0025',
    text:    '#f1f5f9',
    ui:      '#100030',
    glow:    '#00ffcc44'
  };

  var COLS = 6;
  var COL_W = W / COLS;
  var PLAYER_W = COL_W * 0.7;
  var PLAYER_H = 50;
  var PLAYER_Y = H * 0.8;

  var playerCol = 2; // 0-5
  var playerX = playerCol * COL_W + COL_W / 2;
  var targetX = playerX;

  var rows = []; // { y, gaps: [colIndex, ...] }
  var descended = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.safe;
  var speed = 300; // pixels per second
  var spawnTimer = 0;
  var invincible = 0;
  var rowHeight = 120;

  function spawnRow() {
    // Gap size increases with score
    var gapCols = Math.min(3, 1 + Math.floor(descended / 10));
    var gap = [];
    var available = [0,1,2,3,4,5];
    for (var i = 0; i < gapCols; i++) {
      var idx = Math.floor(Math.random() * available.length);
      gap.push(available.splice(idx, 1)[0]);
    }
    rows.push({ y: -rowHeight, gaps: gap });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && playerCol > 0) {
      playerCol--;
      targetX = playerCol * COL_W + COL_W / 2;
      game.audio.play('se_tap', 0.15);
    } else if (dir === 'right' && playerCol < COLS - 1) {
      playerCol++;
      targetX = playerCol * COL_W + COL_W / 2;
      game.audio.play('se_tap', 0.15);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap: move toward tapped side
    if (tx < W / 2 && playerCol > 0) {
      playerCol--;
      targetX = playerCol * COL_W + COL_W / 2;
    } else if (tx >= W / 2 && playerCol < COLS - 1) {
      playerCol++;
      targetX = playerCol * COL_W + COL_W / 2;
    }
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

    // Smooth player movement
    playerX += (targetX - playerX) * Math.min(1, dt * 12);

    // Speed increase
    speed = 300 + elapsed * 5 + descended * 3;

    // Spawn rows
    spawnTimer += dt;
    var spawnRate = rowHeight / speed;
    if (spawnTimer > spawnRate) {
      spawnTimer = 0;
      spawnRow();
    }

    // Move rows down
    for (var ri = rows.length - 1; ri >= 0; ri--) {
      rows[ri].y += speed * dt;
      // Check collision with player
      if (invincible <= 0 && rows[ri].y + rowHeight >= PLAYER_Y && rows[ri].y <= PLAYER_Y + PLAYER_H) {
        var inGap = false;
        for (var gi = 0; gi < rows[ri].gaps.length; gi++) {
          var gc = rows[ri].gaps[gi];
          var gLeft = gc * COL_W;
          var gRight = gLeft + COL_W;
          if (playerX - PLAYER_W / 2 >= gLeft && playerX + PLAYER_W / 2 <= gRight) {
            inGap = true;
            break;
          }
        }
        if (!inGap) {
          hits++;
          invincible = 1.0;
          flashCol = C.miss;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: PLAYER_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.pHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        } else if (rows[ri].y > PLAYER_Y + PLAYER_H) {
          // passed through
        }
      }
      // Remove passed rows, count descent
      if (rows[ri].y > H + rowHeight) {
        rows.splice(ri, 1);
        descended++;
        if (descended >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(descended * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid lines
    for (var ci = 1; ci < COLS; ci++) {
      game.draw.line(ci * COL_W, 0, ci * COL_W, H, C.grid, 2);
    }

    // Rows
    for (var ri2 = 0; ri2 < rows.length; ri2++) {
      var row = rows[ri2];
      for (var ci2 = 0; ci2 < COLS; ci2++) {
        var isGap = false;
        for (var gi2 = 0; gi2 < row.gaps.length; gi2++) {
          if (row.gaps[gi2] === ci2) { isGap = true; break; }
        }
        if (!isGap) {
          game.draw.rect(ci2 * COL_W + 4, row.y + 4, COL_W - 8, rowHeight - 8, C.block, 0.85);
          game.draw.rect(ci2 * COL_W + 4, row.y + 4, COL_W - 8, 6, C.blockHi, 0.6);
        }
      }
    }

    // Player
    var pAlpha = (invincible > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.rect(playerX - PLAYER_W / 2, PLAYER_Y, PLAYER_W, PLAYER_H, C.p, pAlpha);
    game.draw.rect(playerX - PLAYER_W / 2, PLAYER_Y, PLAYER_W, 8, C.pHi, pAlpha * 0.8);
    game.draw.circle(playerX, PLAYER_Y + PLAYER_H / 2, PLAYER_W * 0.25, C.pHi, pAlpha * 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 80 + hi * 160, H * 0.955, 28, hi < hits ? C.miss : C.ui, 0.9);
    }

    game.draw.text(descended + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.p : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnRow();
    spawnRow();
  });
})(game);
