// 086-beat-slice.js
// ビートスライス — リズムに合わせて流れてくるブロックをスワイプで斬る爽快感
// 操作: スワイプでブロックを斬る（方向は矢印で指示）
// 成功: 16ブロック斬る  失敗: 4回ミス or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080410',
    blockR:  '#ef4444',
    blockB:  '#3b82f6',
    slashR:  '#fca5a5',
    slashB:  '#93c5fd',
    correct: '#22c55e',
    wrong:   '#ef4444',
    beat:    '#8b5cf6',
    ui:      '#334155'
  };

  var BPM = 130;
  var BEAT = 60 / BPM;
  var LANE_XS = [W * 0.25, W * 0.5, W * 0.75];

  var blocks = []; // { x, y, dir, color, hit, hitTimer }
  var beatTimer = 0;
  var beatCount = 0;
  var beatFlash = 0;

  var score = 0;
  var needed = 16;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 30;
  var done = false;
  var slashTrail = []; // { x1,y1,x2,y2, life, color }
  var lastSwipeDir = null;
  var feedback = 0;
  var feedbackOk = false;

  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

  function spawnBlock() {
    var lane = LANE_XS[Math.floor(Math.random() * LANE_XS.length)];
    var dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    var color = (Math.random() > 0.5) ? 'R' : 'B';
    blocks.push({
      x: lane, y: -80, dir: dir, color: color,
      speed: 500 + score * 15, hit: false, hitTimer: 0
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    lastSwipeDir = dir;
    // Find the first hittable block in range
    var hit = false;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.hit) continue;
      if (b.y > H * 0.35 && b.y < H * 0.75) {
        if (b.dir === dir) {
          b.hit = true;
          b.hitTimer = 0.3;
          score++;
          feedbackOk = true;
          feedback = 0.25;
          game.audio.play('se_tap', 1.0);
          // Slash trail
          slashTrail.push({
            x1: b.x - 100, y1: b.y,
            x2: b.x + 100, y2: b.y,
            life: 0.3, maxLife: 0.3,
            color: b.color === 'R' ? C.slashR : C.slashB
          });
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 25 + Math.ceil(timeLeft) * 8); }, 400);
          }
          hit = true;
          break;
        } else {
          // Wrong direction
          misses++;
          feedbackOk = false;
          feedback = 0.35;
          game.audio.play('se_failure', 0.7);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 350);
          }
          hit = true;
          break;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Beat
    beatTimer -= dt;
    if (beatTimer <= 0) {
      beatTimer = BEAT;
      beatCount++;
      beatFlash = 0.1;
      // Spawn on every 2 beats
      if (beatCount % 2 === 0) spawnBlock();
    }
    if (beatFlash > 0) beatFlash -= dt;

    // Update blocks
    var toRemove = [];
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (!b.hit) {
        b.y += b.speed * dt;
        // Missed if passed the zone
        if (b.y > H * 0.78) {
          toRemove.push(i);
          misses++;
          feedbackOk = false;
          feedback = 0.3;
          game.audio.play('se_failure', 0.4);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 300);
          }
        }
      } else {
        b.hitTimer -= dt;
        if (b.hitTimer <= 0) toRemove.push(i);
      }
    }
    for (var j = toRemove.length - 1; j >= 0; j--) blocks.splice(toRemove[j], 1);

    // Update slash trails
    for (var k = 0; k < slashTrail.length; k++) {
      slashTrail[k].life -= dt;
    }
    slashTrail = slashTrail.filter(function(s) { return s.life > 0; });

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat flash
    if (beatFlash > 0) {
      game.draw.rect(0, 0, W, H, C.beat, beatFlash / 0.1 * 0.07);
    }

    // Lane lines
    for (var l = 0; l < LANE_XS.length; l++) {
      game.draw.line(LANE_XS[l], 0, LANE_XS[l], H, C.ui, 2);
    }

    // Hit zone
    game.draw.rect(0, H * 0.52, W, 8, C.beat, 0.5);
    game.draw.text('↓ HIT ZONE ↓', W / 2, H * 0.50, { size: 36, color: C.beat });

    // Blocks
    for (var bi = 0; bi < blocks.length; bi++) {
      var b = blocks[bi];
      var bColor = b.color === 'R' ? C.blockR : C.blockB;
      if (b.hit) {
        var frac = b.hitTimer / 0.3;
        var explodeR = 80 * (1 - frac);
        game.draw.circle(b.x, b.y, 48 + explodeR, bColor, frac * 0.5);
        game.draw.circle(b.x, b.y, 24 * frac, '#fff', frac);
      } else {
        // Block body
        game.draw.rect(b.x - 56, b.y - 56, 112, 112, bColor);
        game.draw.rect(b.x - 48, b.y - 48, 96, 96, '#000', 0.3);
        // Direction arrow
        game.draw.text(DIR_ARROWS[b.dir], b.x, b.y, { size: 68, color: '#fff', bold: true });
        // Glow when in hit zone
        if (b.y > H * 0.45 && b.y < H * 0.65) {
          game.draw.rect(b.x - 60, b.y - 60, 120, 120, bColor, 0.2);
        }
      }
    }

    // Slash trails
    for (var si = 0; si < slashTrail.length; si++) {
      var sl = slashTrail[si];
      var slFrac = sl.life / sl.maxLife;
      game.draw.line(sl.x1, sl.y1, sl.x2, sl.y2, sl.color, 12 * slFrac);
      game.draw.line(sl.x1, sl.y1 - 8, sl.x2, sl.y2 + 8, '#fff', 4 * slFrac);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? 'スライス！' : '方向違い！', W / 2, H * 0.28, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#080410');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beat : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 56;
      game.draw.circle(sx, 128, 18, s < score ? C.correct : '#0a0418');
    }
    for (var mi = 0; mi < maxMisses; mi++) {
      var mx = W / 2 + (mi - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 192, 18, mi < misses ? C.wrong : '#0a0418');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    beatTimer = BEAT * 2; // slight delay before first block
  });
})(game);
