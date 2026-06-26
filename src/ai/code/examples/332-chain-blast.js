// 332-chain-blast.js
// チェーンブラスト — 爆発を連鎖させてすべての爆弾を消す
// 操作: タップで最初の爆弾を起爆
// 成功: 8ラウンドクリア  失敗: 3回チェーン失敗 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0700',
    bomb:   '#1c1917',
    bombHi: '#292524',
    fuse:   '#d97706',
    fuseHi: '#fbbf24',
    blast:  '#f97316',
    blastHi:'#fed7aa',
    smoke:  '#44403c',
    clear:  '#22c55e',
    clearHi:'#86efac',
    fail:   '#ef4444',
    failHi: '#fca5a5',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  var BOMB_RADIUS = 80; // explosion radius

  var bombs = [];
  var explosions = [];
  var round = 0;
  var cleared = 0;
  var NEEDED = 8;
  var failures = 0;
  var MAX_FAIL = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var phase = 'place'; // place, exploding, result
  var resultTimer = 0;
  var resultGood = false;
  var particles = [];

  function generateRound() {
    bombs = [];
    var count = 5 + round;
    // Place bombs in a layout where chain is possible
    for (var i = 0; i < count; i++) {
      var tries = 0;
      var bx, by;
      do {
        bx = 100 + Math.random() * (W - 200);
        by = H * 0.22 + Math.random() * H * 0.55;
        tries++;
      } while (tries < 30 && bombs.some(function(b) { return Math.hypot(b.x - bx, b.y - by) < 50; }));
      bombs.push({ x: bx, y: by, r: 28, exploded: false, fuseAnim: 0 });
    }
    // Make sure at least a chain of 3 is possible
    // Ensure some bombs are within BOMB_RADIUS of each other
    if (count > 1) {
      bombs[1].x = bombs[0].x + 100 + Math.random() * 60;
      bombs[1].y = bombs[0].y + (Math.random() - 0.5) * 80;
      if (count > 2) {
        bombs[2].x = bombs[1].x + 100 + Math.random() * 60;
        bombs[2].y = bombs[1].y + (Math.random() - 0.5) * 80;
      }
    }
    explosions = [];
    phase = 'place';
  }

  function triggerExplosion(bIdx) {
    var b = bombs[bIdx];
    b.exploded = true;
    explosions.push({ x: b.x, y: b.y, r: 0, maxR: BOMB_RADIUS, life: 0.8 });
    game.audio.play('se_success', 0.4);
    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 60, life: 0.5, col: C.blastHi });
    }
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'place') return;
    // Find tapped bomb
    for (var bi = 0; bi < bombs.length; bi++) {
      if (!bombs[bi].exploded && Math.hypot(tx - bombs[bi].x, ty - bombs[bi].y) < bombs[bi].r + 20) {
        phase = 'exploding';
        triggerExplosion(bi);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultTimer > 0) {
      resultTimer -= dt;
      if (resultTimer <= 0 && !done) {
        round++;
        generateRound();
      }
    }

    if (phase === 'exploding') {
      // Expand explosions and chain
      for (var ei = explosions.length - 1; ei >= 0; ei--) {
        var ex = explosions[ei];
        ex.r += 300 * dt;
        ex.life -= dt * 1.2;

        // Chain reaction: trigger nearby unexploded bombs
        if (ex.r < ex.maxR * 1.1) {
          for (var bi = 0; bi < bombs.length; bi++) {
            if (!bombs[bi].exploded) {
              if (Math.hypot(bombs[bi].x - ex.x, bombs[bi].y - ex.y) < ex.r + bombs[bi].r) {
                triggerExplosion(bi);
              }
            }
          }
        }

        if (ex.life <= 0) explosions.splice(ei, 1);
      }

      // Check if all bombs exploded
      var allDone = bombs.every(function(b) { return b.exploded; });
      var anyLeft = bombs.some(function(b) { return !b.exploded; });

      if (allDone && explosions.length === 0) {
        phase = 'result';
        resultGood = true;
        cleared++;
        game.audio.play('se_success', 0.8);
        resultTimer = 0.9;
        if (cleared >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(cleared * 400 + Math.ceil(timeLeft) * 100); }, 600);
        }
      } else if (!anyLeft && explosions.length === 0 && bombs.some(function(b) { return !b.exploded; })) {
        // Some bombs missed
        phase = 'result';
        resultGood = false;
        failures++;
        game.audio.play('se_failure', 0.5);
        resultTimer = 0.9;
        if (failures >= MAX_FAIL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      } else if (explosions.length === 0 && anyLeft) {
        // Chain ended with bombs remaining
        phase = 'result';
        resultGood = false;
        failures++;
        game.audio.play('se_failure', 0.5);
        resultTimer = 1.0;
        if (failures >= MAX_FAIL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex2 = explosions[ei2];
      game.draw.circle(ex2.x, ex2.y, ex2.r * 1.3, C.blast, ex2.life * 0.2);
      game.draw.circle(ex2.x, ex2.y, ex2.r, C.blast, ex2.life * 0.6);
      game.draw.circle(ex2.x, ex2.y, ex2.r * 0.5, C.blastHi, ex2.life * 0.8);
    }

    // Bombs
    for (var bi2 = 0; bi2 < bombs.length; bi2++) {
      var b2 = bombs[bi2];
      if (b2.exploded) continue;
      // Show explosion radius hint
      if (phase === 'place') {
        game.draw.circle(b2.x, b2.y, BOMB_RADIUS, C.blast, 0.06);
      }
      game.draw.circle(b2.x, b2.y, b2.r + 6, C.bombHi, 0.5);
      game.draw.circle(b2.x, b2.y, b2.r, C.bomb, 0.9);
      // Fuse
      game.draw.line(b2.x, b2.y - b2.r, b2.x + 12, b2.y - b2.r - 24, C.fuse, 5);
      game.draw.circle(b2.x + 12, b2.y - b2.r - 24, 8, C.fuseHi, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Result
    if (phase === 'result' && resultTimer > 0) {
      if (resultGood) {
        game.draw.text('全消し！', W / 2, H * 0.82, { size: 72, color: C.clearHi, bold: true });
      } else {
        game.draw.text('失敗…', W / 2, H * 0.82, { size: 72, color: C.failHi, bold: true });
      }
    } else if (phase === 'place') {
      game.draw.text('爆弾をタップして起爆！', W / 2, H * 0.83, { size: 42, color: C.ui });
    }

    // Failure dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 28 + fi * 56, H * 0.91, 16, fi < failures ? C.fail : '#0c0700');
    }

    game.draw.text(cleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.blast : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateRound();
  });
})(game);
