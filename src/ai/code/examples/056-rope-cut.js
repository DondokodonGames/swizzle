// 056-rope-cut.js
// ロープカット — 正しい順序でロープを切って爆弾を解除する
// 操作: スワイプで切断、色の順序を守れ
// 成功: 爆弾3個解除  失敗: 順序ミス or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0806',
    bomb:   '#1c1c1c',
    bombHi: '#374151',
    fuse:   '#d97706',
    fuseHi: '#fbbf24',
    cut:    '#22c55e',
    wrong:  '#ef4444',
    ui:     '#475569'
  };

  // Rope colors & their cut order
  var ROPE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#fbbf24', '#8b5cf6'];
  var ROPE_NAMES  = ['赤', '青', '緑', '黄', '紫'];

  var ropes = [];
  var bombsDefused = 0;
  var needed = 3;
  var timeLeft = 25;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  var BOMB_X = W / 2;
  var BOMB_Y = H * 0.42;
  var BOMB_R = 120;
  var ROPE_SPACING = 160;

  var fuseAnim = 0;

  function newBomb() {
    // Pick 3-4 ropes randomly, assign random cut order
    var count = 3 + Math.floor(Math.random() * 2); // 3 or 4 ropes
    var indices = [];
    for (var i = 0; i < ROPE_COLORS.length; i++) indices.push(i);
    // Shuffle
    for (var s = indices.length - 1; s > 0; s--) {
      var r = Math.floor(Math.random() * (s + 1));
      var tmp = indices[s]; indices[s] = indices[r]; indices[r] = tmp;
    }
    indices = indices.slice(0, count);

    // Assign cut order (1=first to cut, etc)
    var order = [];
    for (var j = 0; j < count; j++) order.push(j + 1);
    // Shuffle order assignment
    var shuffledOrder = order.slice();
    for (var s2 = shuffledOrder.length - 1; s2 > 0; s2--) {
      var r2 = Math.floor(Math.random() * (s2 + 1));
      var tmp2 = shuffledOrder[s2]; shuffledOrder[s2] = shuffledOrder[r2]; shuffledOrder[r2] = tmp2;
    }

    ropes = [];
    for (var k = 0; k < count; k++) {
      ropes.push({
        colorIdx: indices[k],
        cutOrder: shuffledOrder[k],
        cut: false,
        x: W / 2 + (k - (count - 1) / 2) * ROPE_SPACING
      });
    }
    // Sort display by x position
    fuseAnim = 0;
  }

  function getNextExpected() {
    var minOrder = 9999;
    for (var i = 0; i < ropes.length; i++) {
      if (!ropes[i].cut && ropes[i].cutOrder < minOrder) {
        minOrder = ropes[i].cutOrder;
      }
    }
    return minOrder;
  }

  game.onSwipe(function(dir) {
    if (done || ropes.length === 0) return;
    if (dir !== 'up' && dir !== 'down') return;

    // Determine which rope zone based on last tap position (use center for simplicity)
    // Actually: swipe selects the leftmost uncut rope or cycle through them
    // Let's use: up=cut current selected, left/right=change selection
    // Simpler: each swipe cuts the earliest-in-order uncut rope
    var expected = getNextExpected();
    var targetRope = null;
    for (var i = 0; i < ropes.length; i++) {
      if (!ropes[i].cut && ropes[i].cutOrder === expected) {
        targetRope = ropes[i];
        break;
      }
    }

    if (dir === 'up') {
      // Always cuts "next in sequence"
      if (targetRope) {
        targetRope.cut = true;
        game.audio.play('se_tap', 0.8);
        // Check if all cut
        var allCut = ropes.every(function(r) { return r.cut; });
        if (allCut) {
          bombsDefused++;
          feedbackOk = true;
          feedback = 0.6;
          game.audio.play('se_success', 0.7);
          if (bombsDefused >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(bombsDefused * 60 + Math.ceil(timeLeft) * 8); }, 600);
          } else {
            setTimeout(newBomb, 700);
          }
        }
      }
    } else if (dir === 'down') {
      // Wrong direction means cutting wrong rope
      missCut();
    }
  });

  var wrongFlash = 0;

  function missCut() {
    feedbackOk = false;
    feedback = 0.5;
    wrongFlash = 0.5;
    game.audio.play('se_failure', 0.7);
    if (!done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 600);
    }
  }

  game.onTap(function(x, y) {
    if (done || ropes.length === 0) return;
    // Tap a specific rope to cut it
    for (var i = 0; i < ropes.length; i++) {
      if (!ropes[i].cut && Math.abs(x - ropes[i].x) < 48) {
        var expected = getNextExpected();
        if (ropes[i].cutOrder === expected) {
          ropes[i].cut = true;
          game.audio.play('se_tap', 0.8);
          var allCut2 = ropes.every(function(r) { return r.cut; });
          if (allCut2) {
            bombsDefused++;
            feedbackOk = true;
            feedback = 0.6;
            game.audio.play('se_success', 0.7);
            if (bombsDefused >= needed && !done) {
              done = true;
              game.audio.play('se_success');
              setTimeout(function() { game.end.success(bombsDefused * 60 + Math.ceil(timeLeft) * 8); }, 600);
            } else {
              setTimeout(newBomb, 700);
            }
          }
        } else {
          missCut();
        }
        break;
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

    fuseAnim += dt * 2;
    if (feedback > 0) feedback -= dt;
    if (wrongFlash > 0) wrongFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (wrongFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, wrongFlash * 0.3);
    }

    // Bomb body
    game.draw.circle(BOMB_X, BOMB_Y, BOMB_R + 16, C.bombHi, 0.15);
    game.draw.circle(BOMB_X, BOMB_Y, BOMB_R, C.bomb);
    game.draw.circle(BOMB_X, BOMB_Y, BOMB_R * 0.6, C.bombHi, 0.1);
    // Bomb shine
    game.draw.circle(BOMB_X - 36, BOMB_Y - 40, 30, '#fff', 0.1);

    // Fuse
    var fuseLength = 60 + Math.sin(fuseAnim) * 12;
    game.draw.line(BOMB_X, BOMB_Y - BOMB_R, BOMB_X + 20, BOMB_Y - BOMB_R - fuseLength, C.fuse, 6);
    // Fuse spark
    game.draw.circle(BOMB_X + 20, BOMB_Y - BOMB_R - fuseLength, 10, C.fuseHi, 0.9);
    game.draw.circle(BOMB_X + 20, BOMB_Y - BOMB_R - fuseLength, 6, '#fff', 0.7);

    // Ropes
    for (var i = 0; i < ropes.length; i++) {
      var rope = ropes[i];
      var rx = rope.x;
      var ropeTop = BOMB_Y - BOMB_R - 20;
      var ropeBottom = BOMB_Y + BOMB_R + 80;
      var rColor = ROPE_COLORS[rope.colorIdx];

      if (rope.cut) {
        // Draw cut rope (two halves)
        game.draw.line(rx, ropeTop, rx, (ropeTop + ropeBottom) / 2 - 20, rColor, 10);
        game.draw.line(rx, (ropeTop + ropeBottom) / 2 + 20, rx, ropeBottom, rColor, 10);
        game.draw.text('✓', rx, (ropeTop + ropeBottom) / 2, { size: 44, color: C.cut, bold: true });
      } else {
        game.draw.line(rx, ropeTop, rx, ropeBottom, rColor, 12);
        game.draw.rect(rx - 8, ropeTop, 16, 8, '#fff', 0.3); // attachment point
      }

      // Cut order number
      game.draw.circle(rx, ropeBottom + 48, 36, rope.cut ? '#1a2e0a' : rColor, rope.cut ? 0.3 : 1.0);
      game.draw.text(rope.cutOrder + '', rx, ropeBottom + 48, { size: 40, color: rope.cut ? '#334155' : '#fff', bold: true });
    }

    // Feedback text
    if (feedback > 0 && feedbackOk) {
      game.draw.text('解除！', W / 2, H * 0.75, { size: 88, color: C.cut, bold: true });
    }

    // Bomb counter
    for (var b = 0; b < needed; b++) {
      var bx = W / 2 + (b - (needed - 1) / 2) * 80;
      game.draw.circle(bx, H * 0.86, 28, b < bombsDefused ? C.cut : '#1c1c1c');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0a0806');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.4 ? '#d97706' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('番号順にロープをタップ！', W / 2, H - 200, { size: 48, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newBomb();
  });
})(game);
