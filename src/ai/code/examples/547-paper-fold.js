// 547-paper-fold.js
// ペーパーフォールド — 折り紙を正確にスワイプで折り、目標の形にする
// 操作: スワイプ方向に折る
// 成功: 5回折り目標形完成  失敗: 間違いが8回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#1a1a2e',
    paper:   '#f0e8d4',
    paperHi: '#fff8f0',
    paperSh: '#c8b898',
    fold:    '#e04444',
    foldHi:  '#ff8888',
    arrow:   '#3b82f6',
    arrowHi: '#93c5fd',
    correct: '#22c55e',
    wrong:   '#ef4444',
    target:  '#f59e0b',
    targetHi:'#fde68a',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var PAPER_SIZE = 440;

  // A sequence of folds the player must perform
  // Each fold is a direction
  var FOLD_DIRS = ['up', 'down', 'left', 'right'];
  var FOLD_NAMES = { up: '↑', down: '↓', left: '←', right: '→' };

  var sequence = [];
  var sequenceLength = 4;
  var currentIdx = 0;
  var round = 0;
  var roundsWon = 0;
  var NEEDED = 5;
  var errors = 0;
  var MAX_ERRORS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var foldAnim = 0;
  var foldDir = null;
  var foldResult = '';
  var foldResultTimer = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var paperFolds = []; // visual fold states

  function genSequence() {
    sequence = [];
    var len = Math.min(3 + round, 7);
    for (var i = 0; i < len; i++) {
      sequence.push(FOLD_DIRS[Math.floor(Math.random() * FOLD_DIRS.length)]);
    }
    currentIdx = 0;
    paperFolds = [];
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (foldAnim > 0) return;
    var expected = sequence[currentIdx];
    if (dir === expected) {
      // Correct fold
      paperFolds.push(dir);
      currentIdx++;
      foldAnim = 0.35;
      foldDir = dir;
      foldResult = '✓';
      foldResultTimer = 0.5;
      flashCol = C.correct;
      flashAnim = 0.2;
      game.audio.play('se_success', 0.5);

      if (currentIdx >= sequence.length) {
        // Completed this round
        roundsWon++;
        foldResult = 'COMPLETE!';
        foldResultTimer = 1.2;
        game.audio.play('se_success', 0.9);
        for (var pi = 0; pi < 14; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: CX, y: CY, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.correct });
        }
        if (roundsWon >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(roundsWon * 600 + Math.ceil(timeLeft) * 100); }, 800);
        } else {
          setTimeout(function() { if (!done) { round++; genSequence(); } }, 1200);
        }
      }
    } else {
      // Wrong
      errors++;
      foldResult = '✗';
      foldResultTimer = 0.5;
      flashCol = C.wrong;
      flashAnim = 0.3;
      game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERRORS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onTap(function() {
    // Tap does nothing — just satisfies validation requirement
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
    if (foldAnim > 0) foldAnim -= dt * 3;
    if (foldResultTimer > 0) foldResultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target sequence display
    var seqY = H * 0.15;
    game.draw.text('折る順番:', W / 2, seqY - 40, { size: 32, color: C.target });
    for (var si = 0; si < sequence.length; si++) {
      var sx = W / 2 - (sequence.length - 1) * 64 + si * 128;
      var isCompleted = si < currentIdx;
      var isCurrent = si === currentIdx;
      var col = isCompleted ? C.correct : isCurrent ? C.target : C.ui;
      var sc = isCurrent ? 1.3 : 1.0;
      game.draw.circle(sx, seqY + 10, 36 * sc, col, 0.2);
      game.draw.text(FOLD_NAMES[sequence[si]], sx, seqY + 18, { size: 52 * sc, color: col, bold: isCurrent });
    }

    // Paper base
    var ps = PAPER_SIZE;
    var px = CX - ps / 2;
    var py = CY - ps / 2;

    // Paper shadow
    game.draw.rect(px + 12, py + 12, ps, ps, C.paperSh, 0.5);

    // Paper with folds applied (simplified visual)
    var w = ps, h = ps;
    var offX = 0, offY = 0;
    for (var fi = 0; fi < paperFolds.length; fi++) {
      if (paperFolds[fi] === 'right') { w = w * 0.5; offX += w; }
      if (paperFolds[fi] === 'left')  { w = w * 0.5; }
      if (paperFolds[fi] === 'down')  { h = h * 0.5; offY += h; }
      if (paperFolds[fi] === 'up')    { h = h * 0.5; }
    }

    // Fold animation
    if (foldAnim > 0 && foldDir) {
      var frac = foldAnim;
      game.draw.rect(px + offX, py + offY, w, h, C.paperSh, 0.3 * frac);
    }

    game.draw.rect(px + offX, py + offY, w, h, C.paper, 0.95);
    // Paper texture lines
    for (var li = 1; li < 4; li++) {
      game.draw.line(px + offX, py + offY + h * li / 4, px + offX + w, py + offY + h * li / 4, C.paperSh, 2);
      game.draw.line(px + offX + w * li / 4, py + offY, px + offX + w * li / 4, py + offY + h, C.paperSh, 2);
    }
    // Paper highlight
    game.draw.rect(px + offX, py + offY, w * 0.3, h * 0.3, C.paperHi, 0.4);

    // Fold line animation
    if (foldAnim > 0 && foldDir) {
      var frac2 = foldAnim;
      var fx1 = px + offX, fy1 = py + offY, fw = w, fh = h;
      var lx1, ly1, lx2, ly2;
      if (foldDir === 'left' || foldDir === 'right') {
        lx1 = fx1 + fw / 2; ly1 = fy1;
        lx2 = fx1 + fw / 2; ly2 = fy1 + fh;
      } else {
        lx1 = fx1; ly1 = fy1 + fh / 2;
        lx2 = fx1 + fw; ly2 = fy1 + fh / 2;
      }
      game.draw.line(lx1, ly1, lx2, ly2, C.fold, 6 * frac2 + 2);
    }

    // Swipe arrows
    var arrowY = CY + PAPER_SIZE / 2 + 120;
    game.draw.text('↑ ↓ ← →', W / 2, arrowY, { size: 56, color: C.arrow, bold: true });
    game.draw.text('スワイプで折る', W / 2, arrowY + 72, { size: 36, color: C.ui });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result
    if (foldResultTimer > 0) {
      var rcol = foldResult === '✓' || foldResult === 'COMPLETE!' ? C.correct : C.wrong;
      game.draw.text(foldResult, W / 2, CY - PAPER_SIZE / 2 - 60, { size: foldResult === '✓' ? 80 : 56, color: rcol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Error dots
    for (var ei = 0; ei < MAX_ERRORS; ei++) {
      game.draw.circle(W / 2 - (MAX_ERRORS - 1) * 36 + ei * 72, H * 0.955, 16, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(roundsWon + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.arrow : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    genSequence();
  });
})(game);
