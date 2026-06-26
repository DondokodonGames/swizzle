// 585-chain-reaction.js
// チェーンリアクション — 1つのタップで連鎖爆発を最大化する戦略
// 操作: タップで爆発を開始する位置を選ぶ
// 成功: 80%の爆弾を連鎖爆発  失敗: 5回挑戦してクリアできない

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040a',
    bomb:    '#cc3344',
    bombHi:  '#ff6677',
    lit:     '#ff8800',
    litHi:   '#ffcc00',
    explode: '#ff4400',
    explodeHi:'#ffaa00',
    smoke:   '#443322',
    text:    '#f1f5f9',
    ui:      '#374151',
    win:     '#22c55e',
    lose:    '#ef4444'
  };

  var BOMB_R = 36;
  var EXPLODE_R = 100;
  var bombs = [];
  var exploding = [];
  var chainActive = false;
  var chainDone = false;
  var attempts = 0;
  var MAX_ATTEMPTS = 5;
  var totalBombs = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.win;
  var evalTimer = 0;
  var resultText = '';
  var resultTimer = 0;

  function spawnBombs() {
    bombs = [];
    var count = 20 + Math.floor(Math.random() * 10);
    for (var i = 0; i < count; i++) {
      bombs.push({
        x: 80 + Math.random() * (W - 160),
        y: H * 0.15 + Math.random() * (H * 0.65),
        r: BOMB_R,
        state: 'idle', // idle | lit | exploding | done
        litTimer: 0,
        explodeTimer: 0,
        explodeR: 0
      });
    }
    totalBombs = bombs.length;
    chainActive = false;
    chainDone = false;
    evalTimer = 0;
  }

  function triggerBomb(idx) {
    if (bombs[idx].state !== 'idle') return;
    bombs[idx].state = 'lit';
    bombs[idx].litTimer = 0.4 + Math.random() * 0.3;
    game.audio.play('se_tap', 0.2);
  }

  function startChain(tx, ty) {
    if (chainActive || chainDone) return;
    // Find closest bomb to tap
    var best = -1, bestDist = 80;
    for (var i = 0; i < bombs.length; i++) {
      var dx = tx - bombs[i].x, dy = ty - bombs[i].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best >= 0) {
      triggerBomb(best);
      chainActive = true;
      attempts++;
      game.audio.play('se_tap', 0.4);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!chainActive && !chainDone) {
      startChain(tx, ty);
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
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (resultTimer > 0) resultTimer -= dt;

    if (chainActive) {
      var anyActive = false;

      for (var i = 0; i < bombs.length; i++) {
        var b = bombs[i];
        if (b.state === 'lit') {
          anyActive = true;
          b.litTimer -= dt;
          if (b.litTimer <= 0) {
            b.state = 'exploding';
            b.explodeTimer = 0.5;
            b.explodeR = 0;
            game.audio.play('se_success', 0.4);
            // Spark particles
            for (var pi = 0; pi < 8; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.4, col: C.explodeHi });
            }
          }
        } else if (b.state === 'exploding') {
          anyActive = true;
          b.explodeTimer -= dt;
          b.explodeR = EXPLODE_R * (1 - b.explodeTimer / 0.5);

          // Chain: light nearby idle bombs
          for (var j = 0; j < bombs.length; j++) {
            if (bombs[j].state === 'idle') {
              var dx = bombs[j].x - b.x, dy = bombs[j].y - b.y;
              if (Math.sqrt(dx * dx + dy * dy) < b.explodeR + bombs[j].r) {
                triggerBomb(j);
              }
            }
          }

          if (b.explodeTimer <= 0) {
            b.state = 'done';
          }
        }
      }

      if (!anyActive) {
        // Chain finished — evaluate
        chainDone = true;
        chainActive = false;
        var explodedCount = 0;
        for (var i2 = 0; i2 < bombs.length; i2++) {
          if (bombs[i2].state === 'done') explodedCount++;
        }
        var ratio2 = explodedCount / totalBombs;

        if (ratio2 >= 0.8) {
          resultText = Math.round(ratio2 * 100) + '%! クリア!';
          flashCol = C.win;
          flashAnim = 0.5;
          resultTimer = 1.5;
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(Math.round(ratio2 * 3000) + Math.ceil(timeLeft) * 100); }, 800);
        } else {
          resultText = Math.round(ratio2 * 100) + '% (残り' + (attempts < MAX_ATTEMPTS ? MAX_ATTEMPTS - attempts + '回)' : '0回)');
          flashCol = C.lose;
          flashAnim = 0.4;
          resultTimer = 1.5;
          game.audio.play('se_failure', 0.4);
          if (attempts >= MAX_ATTEMPTS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            setTimeout(function() { if (!done) spawnBombs(); }, 1500);
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Explosion radius indicators (for done bombs)
    for (var i3 = 0; i3 < bombs.length; i3++) {
      var b3 = bombs[i3];
      if (b3.state === 'done') {
        game.draw.circle(b3.x, b3.y, EXPLODE_R, C.smoke, 0.08);
      }
    }

    // Bombs
    for (var i4 = 0; i4 < bombs.length; i4++) {
      var b4 = bombs[i4];
      if (b4.state === 'done') continue;

      var bx = b4.x, by = b4.y;

      if (b4.state === 'exploding') {
        // Explosion
        game.draw.circle(bx, by, b4.explodeR, C.explode, 0.3);
        game.draw.circle(bx, by, b4.explodeR * 0.6, C.explodeHi, 0.5);
        game.draw.circle(bx, by, b4.explodeR * 0.3, '#fff', 0.5);
        continue;
      }

      var bCol = b4.state === 'lit' ? C.lit : C.bomb;
      var bHi = b4.state === 'lit' ? C.litHi : C.bombHi;
      var pulse = b4.state === 'lit' ? 1 + Math.sin(elapsed * 15) * 0.15 : 1;

      // Explosion radius preview (faint)
      if (!chainActive && !chainDone) {
        game.draw.circle(bx, by, EXPLODE_R, bCol, 0.04);
      }

      game.draw.circle(bx + 4, by + 4, b4.r * pulse, '#000', 0.2);
      game.draw.circle(bx, by, b4.r * pulse, bCol, 0.9);
      game.draw.circle(bx - b4.r * 0.25, by - b4.r * 0.25, b4.r * 0.3, bHi, 0.5);
      // Fuse
      var fuseY = by - b4.r;
      game.draw.line(bx, fuseY, bx + 12, fuseY - 20, bHi, 3);
      if (b4.state === 'lit') {
        game.draw.circle(bx + 12, fuseY - 20, 8, C.litHi, 0.9 + Math.sin(elapsed * 20) * 0.1);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.7);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 44, color: flashCol, bold: true });
    } else if (!chainActive && !chainDone) {
      game.draw.text('タップして爆発を開始!', W / 2, H * 0.88, { size: 40, color: C.ui });
    }

    // Attempt dots
    for (var ai = 0; ai < MAX_ATTEMPTS; ai++) {
      game.draw.circle(W / 2 - (MAX_ATTEMPTS - 1) * 50 + ai * 100, H * 0.955, 20, ai < attempts ? (chainDone && flashCol === C.win ? C.win : C.lose) : C.ui, 0.9);
    }

    game.draw.text('挑戦: ' + attempts + ' / ' + MAX_ATTEMPTS, W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio3 = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio3, 12, ratio3 > 0.3 ? C.bomb : C.lose);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnBombs();
  });
})(game);
