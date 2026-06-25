// 262-ice-sculptor.js
// アイス彫刻 — 回転する氷のブロックをスワイプで削って目標シルエットに合わせる
// 操作: 上下左右スワイプで対応方向を削る
// 成功: 4方向を目標値±1まで合わせる  失敗: 過削り or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020510',
    ice:     '#7dd3fc',
    iceHi:   '#e0f2fe',
    iceDark: '#0284c7',
    target:  '#22c55e',
    tgtHi:   '#86efac',
    over:    '#ef4444',
    chip:    '#bae6fd',
    ui:      '#475569',
    text:    '#f1f5f9',
    glow:    '#38bdf8'
  };

  var ICE_MAX = 20;

  function newPuzzle() {
    return {
      top:    ICE_MAX,
      right:  ICE_MAX,
      bottom: ICE_MAX,
      left:   ICE_MAX
    };
  }

  function newTarget() {
    return {
      top:    4 + Math.floor(Math.random() * 12),
      right:  4 + Math.floor(Math.random() * 12),
      bottom: 4 + Math.floor(Math.random() * 12),
      left:   4 + Math.floor(Math.random() * 12)
    };
  }

  var ice = newPuzzle();
  var target = newTarget();
  var solved = 0;
  var NEEDED = 4;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var chips = [];
  var round = 0;
  var TOTAL_ROUNDS = 5;

  function checkSolved() {
    var dirs = ['top', 'right', 'bottom', 'left'];
    for (var i = 0; i < dirs.length; i++) {
      if (Math.abs(ice[dirs[i]] - target[dirs[i]]) > 1) return false;
    }
    return true;
  }

  function carveDir(dir) {
    var amt = 1 + Math.floor(Math.random() * 2);
    ice[dir] = Math.max(1, ice[dir] - amt);

    if (ice[dir] < target[dir]) {
      // Over-carved
      feedback = '削りすぎ！';
      feedbackCol = C.over;
      feedbackTimer = 0.7;
      game.audio.play('se_failure', 0.6);
      done = true;
      setTimeout(function() { game.end.failure(); }, 600);
      return;
    }

    game.audio.play('se_tap', 0.3);

    // Spawn chips
    var cx = W / 2, cy = H / 2;
    var chipDir = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[dir];
    for (var ci = 0; ci < 4; ci++) {
      var ang = Math.atan2(chipDir[1], chipDir[0]) + (Math.random() - 0.5) * 1.2;
      chips.push({ x: cx + chipDir[0] * 100, y: cy + chipDir[1] * 100, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5 });
    }

    if (checkSolved()) {
      round++;
      feedback = 'ぴったり！';
      feedbackCol = C.tgtHi;
      feedbackTimer = 0.8;
      game.audio.play('se_success', 0.8);
      if (round >= TOTAL_ROUNDS && !done) {
        done = true;
        setTimeout(function() { game.end.success(round * 300 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
      setTimeout(function() {
        if (!done) {
          ice = newPuzzle();
          target = newTarget();
        }
      }, 900);
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || feedbackTimer > 0.1) return;
    var carved = { up: 'top', down: 'bottom', left: 'left', right: 'right' }[dir];
    if (carved) carveDir(carved);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var ci = chips.length - 1; ci >= 0; ci--) {
      chips[ci].x += chips[ci].vx * dt;
      chips[ci].y += chips[ci].vy * dt;
      chips[ci].vy += 300 * dt;
      chips[ci].life -= dt;
      if (chips[ci].life <= 0) chips.splice(ci, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice block
    var CX = W / 2, CY = H / 2 + 30;
    var baseSize = ICE_MAX * 10;
    var tSize = ice.top * 10;
    var rSize = ice.right * 10;
    var bSize = ice.bottom * 10;
    var lSize = ice.left * 10;

    // Glow
    game.draw.circle(CX, CY, baseSize * 0.9, C.glow, 0.08);

    // Ice block as quadrilateral-ish shape (using overlapping rects)
    game.draw.rect(CX - lSize, CY - tSize, lSize + rSize, tSize + bSize, C.ice, 0.3);
    game.draw.rect(CX - lSize + 4, CY - tSize + 4, lSize + rSize - 8, tSize + bSize - 8, C.iceHi, 0.15);

    // Side labels with current/target
    var dirs2 = ['top', 'right', 'bottom', 'left'];
    var dirPos = [
      { lx: CX, ly: CY - tSize - 50 },
      { lx: CX + rSize + 70, ly: CY },
      { lx: CX, ly: CY + bSize + 50 },
      { lx: CX - lSize - 70, ly: CY }
    ];
    var arrowLabels = ['↑スワイプ', '→スワイプ', '↓スワイプ', '←スワイプ'];

    for (var di = 0; di < 4; di++) {
      var d = dirs2[di];
      var pos = dirPos[di];
      var cur = ice[d];
      var tgt = target[d];
      var diff = cur - tgt;
      var col = diff <= 1 ? C.tgtHi : (diff > 10 ? C.text : C.ui);
      game.draw.text(cur + ' → ' + tgt, pos.lx, pos.ly - 16, { size: 36, color: col, bold: diff <= 1 });
      game.draw.text(arrowLabels[di], pos.lx, pos.ly + 16, { size: 28, color: C.ui });
    }

    // Target lines (visual guides)
    game.draw.line(CX - target.left * 10, CY - H * 0.5, CX - target.left * 10, CY + H * 0.5, C.target, 2);
    game.draw.line(CX + target.right * 10, CY - H * 0.5, CX + target.right * 10, CY + H * 0.5, C.target, 2);
    game.draw.line(0, CY - target.top * 10, W, CY - target.top * 10, C.target, 2);
    game.draw.line(0, CY + target.bottom * 10, W, CY + target.bottom * 10, C.target, 2);

    // Chips
    for (var ci2 = 0; ci2 < chips.length; ci2++) {
      var ch = chips[ci2];
      game.draw.rect(ch.x - 6, ch.y - 4, 12, 8, C.chip, ch.life / 0.5);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.88, { size: 56, color: feedbackCol, bold: true });
    }

    game.draw.text('ROUND ' + (round + 1) + ' / ' + TOTAL_ROUNDS, W / 2, 148, { size: 54, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.target : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
