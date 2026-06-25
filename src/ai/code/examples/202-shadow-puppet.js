// 202-shadow-puppet.js
// 影絵パズル — シルエットの形を見て、散らばったパーツを正しい位置に置く
// 操作: タップでパーツを選択、もう一度タップで配置
// 成功: 全パーツ正しく配置  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040c',
    target:  '#1a1220',
    targetB: '#2a1a30',
    piece:   '#a855f7',
    pieceHi: '#d8b4fe',
    placed:  '#22c55e',
    placedHi:'#86efac',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Simple star shape made of pieces
  var PIECE_R = 56;
  var TARGET_X = W / 2;
  var TARGET_Y = H * 0.35;

  // 5 pieces forming a star pattern
  var targetPositions = [
    { x: TARGET_X, y: TARGET_Y - 160 },
    { x: TARGET_X + 140, y: TARGET_Y - 40 },
    { x: TARGET_X + 80, y: TARGET_Y + 130 },
    { x: TARGET_X - 80, y: TARGET_Y + 130 },
    { x: TARGET_X - 140, y: TARGET_Y - 40 }
  ];

  var pieces = [];
  var selected = -1;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var correctCount = 0;
  var feedback = 0;
  var feedbackOk = false;

  function initPieces() {
    pieces = [];
    var offsets = [
      { x: -280, y: H * 0.62 },
      { x: -100, y: H * 0.68 },
      { x: 80, y: H * 0.65 },
      { x: 250, y: H * 0.70 },
      { x: 0, y: H * 0.75 }
    ];
    // Shuffle offsets
    for (var i = offsets.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = offsets[i]; offsets[i] = offsets[j]; offsets[j] = tmp;
    }
    for (var pi = 0; pi < 5; pi++) {
      pieces.push({
        x: W / 2 + offsets[pi].x,
        y: offsets[pi].y,
        targetIdx: pi,
        placed: false
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (selected >= 0) {
      // Try to place at target position
      var piece = pieces[selected];
      var tgt = targetPositions[piece.targetIdx];
      var dx = tx - tgt.x, dy = ty - tgt.y;
      if (Math.sqrt(dx * dx + dy * dy) < PIECE_R + 30) {
        piece.placed = true;
        piece.x = tgt.x;
        piece.y = tgt.y;
        selected = -1;
        correctCount++;
        feedbackOk = true; feedback = 0.3;
        game.audio.play('se_success', 0.6);
        if (correctCount >= 5) {
          done = true;
          setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 60 + 500); }, 400);
        }
      } else {
        // Check if tapped another piece
        var hitPiece = -1;
        for (var pi2 = 0; pi2 < pieces.length; pi2++) {
          if (pieces[pi2].placed) continue;
          var dx2 = tx - pieces[pi2].x, dy2 = ty - pieces[pi2].y;
          if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < PIECE_R) { hitPiece = pi2; break; }
        }
        if (hitPiece >= 0 && hitPiece !== selected) {
          selected = hitPiece;
          game.audio.play('se_tap', 0.3);
        } else {
          // Drop
          selected = -1;
          feedbackOk = false; feedback = 0.2;
          game.audio.play('se_failure', 0.2);
        }
      }
    } else {
      // Select a piece
      for (var pi3 = 0; pi3 < pieces.length; pi3++) {
        if (pieces[pi3].placed) continue;
        var dx3 = tx - pieces[pi3].x, dy3 = ty - pieces[pi3].y;
        if (Math.sqrt(dx3 * dx3 + dy3 * dy3) < PIECE_R) {
          selected = pi3;
          game.audio.play('se_tap', 0.4);
          break;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target silhouette (star outline)
    game.draw.circle(TARGET_X, TARGET_Y, 220, C.targetB, 0.4);
    for (var ti = 0; ti < targetPositions.length; ti++) {
      var tp = targetPositions[ti];
      game.draw.circle(tp.x, tp.y, PIECE_R + 8, C.target, 0.8);
      game.draw.circle(tp.x, tp.y, PIECE_R, C.targetB, 0.9);
      // Target outlines
      for (var a = 0; a < 12; a++) {
        var ang = a / 12 * Math.PI * 2;
        game.draw.circle(tp.x + Math.cos(ang) * (PIECE_R - 4), tp.y + Math.sin(ang) * (PIECE_R - 4), 4, '#3a2050', 0.5);
      }
    }

    // Placed pieces
    for (var pi4 = 0; pi4 < pieces.length; pi4++) {
      var p4 = pieces[pi4];
      if (!p4.placed) continue;
      game.draw.circle(p4.x, p4.y, PIECE_R + 6, C.placedHi, 0.2);
      game.draw.circle(p4.x, p4.y, PIECE_R, C.placed, 0.85);
      game.draw.circle(p4.x - PIECE_R * 0.28, p4.y - PIECE_R * 0.28, PIECE_R * 0.22, '#fff', 0.4);
    }

    // Unplaced pieces
    for (var pi5 = 0; pi5 < pieces.length; pi5++) {
      var p5 = pieces[pi5];
      if (p5.placed) continue;
      var isSel = pi5 === selected;
      var bobY = isSel ? Math.sin(elapsed * 4) * 12 : 0;
      game.draw.circle(p5.x, p5.y + bobY, PIECE_R + (isSel ? 12 : 4), isSel ? C.pieceHi : C.piece, isSel ? 0.35 : 0.2);
      game.draw.circle(p5.x, p5.y + bobY, PIECE_R, isSel ? C.pieceHi : C.piece, 0.85);
      game.draw.circle(p5.x - PIECE_R * 0.28, p5.y + bobY - PIECE_R * 0.28, PIECE_R * 0.22, '#fff', 0.4);
    }

    // Show highlighted target when piece selected
    if (selected >= 0 && !pieces[selected].placed) {
      var selPiece = pieces[selected];
      var selTgt = targetPositions[selPiece.targetIdx];
      game.draw.circle(selTgt.x, selTgt.y, PIECE_R + 16, C.pieceHi, 0.35 + 0.15 * Math.sin(elapsed * 5));
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.placed : C.wrong, feedback * 0.1);
    }

    game.draw.text(correctCount + ' / 5 配置完了', W / 2, H * 0.87, { size: 44, color: '#f1f5f9', bold: true });
    game.draw.text(selected >= 0 ? '置く場所をタップ' : 'パーツを選択', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.piece : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initPieces();
  });
})(game);
