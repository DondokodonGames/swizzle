// 731-fuse-timer.js
// 導火線タイマー — 燃え尽きる直前の導火線をタップで切断せよ
// 操作: タップ — 導火線の残り5%以内になったら切断成功
// 成功: 20回切断  失敗: 10回失敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0402',
    fuse:    '#a16207',
    fuseHi:  '#fbbf24',
    flame:   '#f97316',
    flameHi: '#fde68a',
    cut:     '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#110805'
  };

  var FUSE_X0 = 80;
  var FUSE_Y  = H * 0.45;
  var FUSE_W  = W - 160;
  var FUSE_H  = 14;
  var CUT_ZONE = 0.05;  // must tap when fuse is < 5% remaining

  var fuseLife = 1.0;   // 1.0 = full, 0.0 = exploded
  var FUSE_SPEED = 0.12; // fraction per second
  var fuseActive = true;
  var exploded = false;
  var waitTimer = 0;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var cutAnim = 0;

  // Sparks at flame tip
  var sparks = [];

  function resetFuse() {
    fuseLife = 1.0;
    FUSE_SPEED = Math.min(0.28, 0.12 + score * 0.008);
    fuseActive = true;
    exploded = false;
    sparks = [];
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || !fuseActive || waitTimer > 0) return;
    if (fuseLife <= CUT_ZONE) {
      // Success — cut just in time!
      fuseActive = false;
      score++;
      cutAnim = 0.5;
      flashCol = C.correct;
      flashAnim = 0.35;
      resultText = '切断！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        var fx = FUSE_X0 + fuseLife * FUSE_W;
        particles.push({ x: fx, y: FUSE_Y, vx: Math.cos(pa)*200, vy: Math.sin(pa)*200, life: 0.5, col: C.fuseHi });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        waitTimer = 0.7;
      }
    } else {
      // Too early
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '早すぎ！（' + Math.round(fuseLife * 100) + '%）';
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) resetFuse();
    }

    if (fuseActive && !done) {
      fuseLife -= FUSE_SPEED * dt;
      if (fuseLife <= 0) {
        fuseLife = 0;
        fuseActive = false;
        exploded = true;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        resultText = '爆発！';
        resultTimer = 0.7;
        game.audio.play('se_failure', 0.5);
        // Big explosion particles
        for (var e2 = 0; e2 < 14; e2++) {
          var ea = Math.random() * Math.PI * 2;
          particles.push({ x: FUSE_X0, y: FUSE_Y, vx: Math.cos(ea)*300, vy: Math.sin(ea)*300, life: 0.6, col: C.flame });
        }
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
        } else {
          waitTimer = 0.9;
        }
      }
    }

    // Sparks at flame tip
    if (fuseActive && fuseLife > 0) {
      var fx = FUSE_X0 + fuseLife * FUSE_W;
      if (Math.random() < 0.4) {
        var sa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        sparks.push({ x: fx, y: FUSE_Y, vx: Math.cos(sa)*80, vy: Math.sin(sa)*80 - 60, life: 0.25, col: C.flameHi });
      }
    }

    for (var si = sparks.length - 1; si >= 0; si--) {
      sparks[si].x += sparks[si].vx * dt;
      sparks[si].y += sparks[si].vy * dt;
      sparks[si].vy += 120 * dt;
      sparks[si].life -= dt * 4;
      if (sparks[si].life <= 0) sparks.splice(si, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (cutAnim > 0) cutAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var fuseX = FUSE_X0 + fuseLife * FUSE_W;
    var inZone = fuseLife <= CUT_ZONE;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Instructions
    game.draw.text('残り5%でタップ！', W / 2, H * 0.28, { size: 44, color: '#ffffff44' });

    // Burned section
    var burnedW = (1 - fuseLife) * FUSE_W;
    if (burnedW > 0) {
      game.draw.rect(FUSE_X0, FUSE_Y - FUSE_H / 2, burnedW, FUSE_H, '#2d1a08', 0.9);
    }

    // Remaining fuse
    if (fuseLife > 0) {
      game.draw.rect(fuseX, FUSE_Y - FUSE_H / 2, fuseLife * FUSE_W, FUSE_H, C.fuse, 0.9);
      game.draw.rect(fuseX, FUSE_Y - FUSE_H / 2, fuseLife * FUSE_W, 4, C.fuseHi, 0.6);
    }

    // Cut zone highlight
    var cutX0 = FUSE_X0;
    var cutW = CUT_ZONE * FUSE_W;
    game.draw.rect(cutX0, FUSE_Y - FUSE_H / 2 - 16, cutW, FUSE_H + 32, inZone ? C.correct : C.cut, inZone ? 0.3 : 0.08);
    game.draw.text('↑ 切断ゾーン', cutX0 + cutW / 2, FUSE_Y + FUSE_H / 2 + 36, { size: 28, color: C.cut + (inZone ? 'ff' : '55') });

    // Cut animation
    if (cutAnim > 0) {
      game.draw.rect(fuseX - 4, FUSE_Y - 40, 8, 80, C.correct, cutAnim);
    }

    // Flame at tip
    if (fuseActive && fuseLife > 0) {
      game.draw.circle(fuseX + 3, fuseX + 3, 18, '#000', 0.2);
      game.draw.circle(fuseX, FUSE_Y, 18, C.flame, 0.9);
      game.draw.circle(fuseX, FUSE_Y, 10, C.flameHi, 0.85);
    }

    // Sparks
    for (var si2 = 0; si2 < sparks.length; si2++) {
      var sp = sparks[si2];
      game.draw.circle(sp.x, sp.y, 5 * sp.life * 4, sp.col, sp.life * 3);
    }

    // Percentage display
    var pct = Math.ceil(fuseLife * 100);
    var pctCol = inZone ? C.correct : (fuseLife < 0.2 ? C.flame : C.fuseHi);
    game.draw.text(pct + '%', W / 2, H * 0.60, { size: 88, color: pctCol, bold: true });

    // Speed indicator
    game.draw.text('速度: ' + FUSE_SPEED.toFixed(2) + '/s', W * 0.82, H * 0.60, { size: 28, color: '#ffffff33' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.83, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    resetFuse();
  });
})(game);
