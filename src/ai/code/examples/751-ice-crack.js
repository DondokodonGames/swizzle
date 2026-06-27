// 751-ice-crack.js
// 氷割り — 溶ける前に3回タップして氷のブロックを砕け
// 操作: タップで亀裂を入れる（3回で砕ける）
// 成功: 30個粉砕  失敗: 8個溶ける or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030c18',
    ice:     '#7dd3fc',
    iceHi:   '#e0f2fe',
    iceDark: '#0369a1',
    crack:   '#ffffff',
    melt:    '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060f1e'
  };

  var blocks = [];
  var spawnTimer = 0.6;
  var MAX_BLOCKS = 6;

  var score = 0;
  var NEEDED = 30;
  var melted = 0;
  var MAX_MELT = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBlock() {
    var margin = 100;
    var s = 55 + Math.random() * 35;
    blocks.push({
      x: margin + Math.random() * (W - margin * 2),
      y: H * 0.2 + Math.random() * (H * 0.6),
      s: s,
      hp: 3,
      meltTime: Math.max(2.5, 5.0 - score * 0.08),
      meltTimer: 0,
      cracks: []
    });
  }

  function addCrack(block) {
    var angle = Math.random() * Math.PI;
    var len = block.s * (0.4 + Math.random() * 0.5);
    block.cracks.push({ a: angle, len: len });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = blocks.length - 1; i >= 0; i--) {
      var b = blocks[i];
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.abs(dx) < b.s && Math.abs(dy) < b.s) {
        hit = true;
        b.hp--;
        addCrack(b);
        game.audio.play('se_tap', 0.1);
        if (b.hp <= 0) {
          // Shatter!
          score++;
          flashCol = C.correct;
          flashAnim = 0.22;
          resultText = '砕いた！';
          resultTimer = 0.38;
          game.audio.play('se_success', 0.5);
          for (var p = 0; p < 8; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: C.iceHi });
          }
          blocks.splice(i, 1);
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 100); }, 700);
          }
        } else {
          flashCol = C.melt;
          flashAnim = 0.1;
        }
        break;
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

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnTimer = Math.max(0.45, 0.6 - score * 0.004);
      if (blocks.length < MAX_BLOCKS) spawnBlock();
    }

    for (var bi = blocks.length - 1; bi >= 0; bi--) {
      var b = blocks[bi];
      b.meltTimer += dt;
      if (b.meltTimer >= b.meltTime) {
        blocks.splice(bi, 1);
        melted++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '溶けた！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.22);
        if (melted >= MAX_MELT && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    for (var bi2 = 0; bi2 < blocks.length; bi2++) {
      var b2 = blocks[bi2];
      var meltFrac = b2.meltTimer / b2.meltTime;
      var alpha = 1 - meltFrac * 0.4;
      var sz = b2.s * (1 - meltFrac * 0.15);

      // Shadow
      game.draw.rect(b2.x - sz + 5, b2.y - sz + 5, sz * 2, sz * 2, '#000', 0.25);
      // Ice block
      game.draw.rect(b2.x - sz, b2.y - sz, sz * 2, sz * 2, C.ice, alpha * 0.85);
      // Highlight
      game.draw.rect(b2.x - sz, b2.y - sz, sz * 2, sz * 0.3, C.iceHi, alpha * 0.4);
      game.draw.rect(b2.x - sz, b2.y - sz, sz * 0.25, sz * 2, C.iceHi, alpha * 0.25);

      // Cracks
      for (var ci = 0; ci < b2.cracks.length; ci++) {
        var cr = b2.cracks[ci];
        var ex = b2.x + Math.cos(cr.a) * cr.len;
        var ey = b2.y + Math.sin(cr.a) * cr.len;
        game.draw.line(b2.x, b2.y, ex, ey, C.crack, 3);
        game.draw.line(b2.x, b2.y, b2.x - Math.cos(cr.a) * cr.len * 0.5, b2.y - Math.sin(cr.a) * cr.len * 0.5, C.crack, 2);
      }

      // HP pips
      for (var hi = 0; hi < 3; hi++) {
        var pipX = b2.x - 18 + hi * 18;
        game.draw.circle(pipX, b2.y + sz + 16, 6, hi < (3 - b2.hp) ? C.iceDark : C.iceHi, 0.9);
      }

      // Melt timer bar
      game.draw.rect(b2.x - sz, b2.y + sz + 24, sz * 2, 8, C.iceDark, 0.5);
      game.draw.rect(b2.x - sz, b2.y + sz + 24, sz * 2 * (1 - meltFrac), 8, meltFrac > 0.7 ? C.wrong : C.melt, 0.85);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_MELT; ei++) {
      game.draw.circle(W / 2 - (MAX_MELT - 1) * 48 + ei * 96, H * 0.955, 20, ei < melted ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBlock();
    spawnBlock();
  });
})(game);
