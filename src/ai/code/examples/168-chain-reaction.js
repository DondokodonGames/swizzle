// 168-chain-reaction.js
// 連鎖爆発 — 最初の一発から爆発が広がっていく達成感、最大連鎖を狙え
// 操作: タップで爆発を開始する位置を選ぶ
// 成功: 爆発が全ボムの80%以上に連鎖  失敗: 50%未満 or 20秒考えた

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060a',
    bomb:    '#374151',
    bombHi:  '#6b7280',
    fuse:    '#f59e0b',
    boom:    '#ef4444',
    boomHi:  '#fbbf24',
    shockwave:'#f97316',
    success: '#22c55e',
    ui:      '#334155'
  };

  var BOMB_R = 44;
  var CHAIN_RADIUS = 180; // explosion radius to ignite neighbors
  var BOMB_COUNT = 24;
  var bombs = [];
  var explosions = []; // { x, y, r, maxR, timer }
  var gamePhase = 'aim'; // 'aim' | 'exploding' | 'result'
  var aimX = W / 2, aimY = H / 2;
  var explodeCount = 0;
  var resultTimer = 0;
  var thinkTime = 0;
  var MAX_THINK = 20;
  var timeLeft = MAX_THINK;
  var done = false;

  function initBombs() {
    bombs = [];
    var tries = 0;
    while (bombs.length < BOMB_COUNT && tries < 500) {
      tries++;
      var bx = BOMB_R + 60 + Math.random() * (W - (BOMB_R + 60) * 2);
      var by = H * 0.12 + Math.random() * (H * 0.76);
      var overlap = false;
      for (var bi = 0; bi < bombs.length; bi++) {
        var dx = bx - bombs[bi].x, dy = by - bombs[bi].y;
        if (Math.sqrt(dx * dx + dy * dy) < BOMB_R * 2 + 16) { overlap = true; break; }
      }
      if (!overlap) bombs.push({ x: bx, y: by, exploded: false, explodeTimer: -1, chainTimer: -1 });
    }
  }

  function triggerExplosion(b, delay) {
    b.chainTimer = delay;
    b.exploded = true;
  }

  function startChain(cx, cy) {
    explosions.push({ x: cx, y: cy, r: 0, maxR: CHAIN_RADIUS, timer: 0.6 });
    explodeCount++;
    // Trigger nearby bombs
    for (var bi = 0; bi < bombs.length; bi++) {
      var b = bombs[bi];
      if (b.exploded) continue;
      var dx = cx - b.x, dy = cy - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CHAIN_RADIUS) {
        triggerExplosion(b, dist / CHAIN_RADIUS * 0.4);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (gamePhase === 'aim') {
      gamePhase = 'exploding';
      timeLeft = -1; // stop countdown
      startChain(tx, ty);
    }
  });

  game.onUpdate(function(dt) {
    if (gamePhase === 'aim') {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (gamePhase === 'exploding') {
      // Update chain timers
      var anyPending = false;
      for (var bi = 0; bi < bombs.length; bi++) {
        var b = bombs[bi];
        if (b.exploded && b.chainTimer >= 0) {
          b.chainTimer -= dt;
          if (b.chainTimer <= 0) {
            b.chainTimer = -1;
            startChain(b.x, b.y);
            game.audio.play('se_tap', 0.2);
          }
          anyPending = true;
        }
        if (!b.exploded) anyPending = true;
      }

      // Check if any explosion still expanding
      var anyExplosion = false;
      for (var ei = explosions.length - 1; ei >= 0; ei--) {
        explosions[ei].r += 600 * dt;
        explosions[ei].timer -= dt;
        if (explosions[ei].timer <= 0) {
          explosions.splice(ei, 1);
        } else {
          anyExplosion = true;
        }
      }

      // All done?
      if (!anyPending && !anyExplosion) {
        gamePhase = 'result';
        resultTimer = 1.5;
        var ratio = explodeCount / BOMB_COUNT;
        if (ratio >= 0.8) {
          game.audio.play('se_success');
          done = true;
          setTimeout(function() { game.end.success(Math.round(ratio * 1000) + 300); }, 1500);
        } else {
          game.audio.play('se_failure');
          done = true;
          setTimeout(function() { game.end.failure(); }, 1500);
        }
      }
    }

    if (gamePhase === 'result') resultTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Explosions (shockwaves)
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex = explosions[ei2];
      var alpha = ex.timer / 0.6;
      game.draw.circle(ex.x, ex.y, ex.r, C.shockwave, alpha * 0.15);
      game.draw.circle(ex.x, ex.y, ex.r * 0.6, C.boomHi, alpha * 0.12);
    }

    // Bombs
    for (var bi2 = 0; bi2 < bombs.length; bi2++) {
      var b2 = bombs[bi2];
      if (b2.exploded && b2.chainTimer < 0) {
        // Exploded - show as smoke
        game.draw.circle(b2.x, b2.y, BOMB_R + 16, C.boom, 0.15);
        game.draw.circle(b2.x, b2.y, BOMB_R, '#4b5563', 0.5);
      } else if (b2.exploded) {
        // About to explode - fuse burning
        game.draw.circle(b2.x, b2.y, BOMB_R + 8, C.fuse, 0.5);
        game.draw.circle(b2.x, b2.y, BOMB_R, C.bomb, 0.9);
        // Fuse spark
        var fX = b2.x + 16, fY = b2.y - BOMB_R - 16;
        game.draw.circle(fX, fY, 10, C.fuse, 0.9);
        game.draw.circle(fX + (Math.random() - 0.5) * 20, fY - 16, 6, C.boomHi, 0.8);
      } else {
        // Normal bomb
        game.draw.circle(b2.x, b2.y, BOMB_R, C.bomb, 0.9);
        game.draw.circle(b2.x, b2.y, BOMB_R - 8, C.bombHi, 0.4);
        // Fuse
        game.draw.line(b2.x + 16, b2.y - BOMB_R + 4, b2.x + 28, b2.y - BOMB_R - 20, C.fuse, 4);
      }
    }

    // Aim phase overlay
    if (gamePhase === 'aim') {
      // Chain radius preview
      game.draw.circle(aimX, aimY, CHAIN_RADIUS, C.boomHi, 0.06);
      game.draw.circle(aimX, aimY, CHAIN_RADIUS, C.boomHi, 0.06);
      game.draw.circle(aimX, aimY, 30, C.boom, 0.5);
      game.draw.text('タップで爆発！', W / 2, H * 0.9, { size: 46, color: C.ui });
      game.draw.text('どこから始める?', W / 2, H * 0.84, { size: 40, color: C.ui });
    }

    // Result
    if (gamePhase === 'result' || done) {
      var ratio2 = explodeCount / BOMB_COUNT;
      var pct = Math.round(ratio2 * 100);
      var resultCol = ratio2 >= 0.8 ? C.success : C.boom;
      game.draw.text(pct + '% 連鎖！', W / 2, H * 0.5, { size: 80, color: resultCol, bold: true });
      game.draw.text(explodeCount + ' / ' + BOMB_COUNT + ' 爆発', W / 2, H * 0.57, { size: 48, color: '#f1f5f9' });
    }

    var ratio3 = Math.max(0, timeLeft / MAX_THINK);
    game.draw.rect(0, 0, W, 72, C.bg);
    if (gamePhase === 'aim') {
      game.draw.rect(0, 0, W * ratio3, 72, ratio3 > 0.3 ? C.fuse : C.boom);
      game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    } else {
      game.draw.text('連鎖中...', W / 2, 36, { size: 44, color: C.boomHi, bold: true });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    initBombs();
  });
})(game);
