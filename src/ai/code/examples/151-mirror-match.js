// 151-mirror-match.js
// 鏡文字 — 左右反転した文字・図形を見て正しいものを選ぶ空間認識ゲーム
// 操作: タップで左右どちらかを選択
// 成功: 15問正解  失敗: 4回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060e',
    panel:   '#0d1a2e',
    panelHi: '#1e3a5f',
    mirror:  '#06b6d4',
    mirrorHi:'#67e8f9',
    choose:  '#7c3aed',
    chooseHi:'#a78bfa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Shapes defined as draw commands, each with a "mirror" flag
  // Each challenge: show a target shape on top, two choices below (one mirrored, one not)
  // Player picks which choice matches the target (not mirrored)

  var SHAPES = [
    { name: 'J', draw: function(cx, cy, size, mirror) {
      var m = mirror ? -1 : 1;
      game.draw.line(cx, cy-size*0.5, cx, cy+size*0.3, '#f1f5f9', 8);
      game.draw.line(cx, cy+size*0.3, cx+m*size*0.3, cy+size*0.3, '#f1f5f9', 8);
      game.draw.circle(cx+m*size*0.3, cy+size*0.15, size*0.18, '#f1f5f9', 0.9);
    }},
    { name: 'arrow', draw: function(cx, cy, size, mirror) {
      var m = mirror ? -1 : 1;
      game.draw.line(cx-m*size*0.4, cy, cx+m*size*0.4, cy, '#f1f5f9', 8);
      game.draw.line(cx+m*size*0.1, cy-size*0.25, cx+m*size*0.4, cy, '#f1f5f9', 8);
      game.draw.line(cx+m*size*0.1, cy+size*0.25, cx+m*size*0.4, cy, '#f1f5f9', 8);
    }},
    { name: 'L', draw: function(cx, cy, size, mirror) {
      var m = mirror ? -1 : 1;
      game.draw.line(cx-m*size*0.15, cy-size*0.4, cx-m*size*0.15, cy+size*0.4, '#f1f5f9', 8);
      game.draw.line(cx-m*size*0.15, cy+size*0.4, cx+m*size*0.35, cy+size*0.4, '#f1f5f9', 8);
    }},
    { name: 'F', draw: function(cx, cy, size, mirror) {
      var m = mirror ? -1 : 1;
      game.draw.line(cx-m*size*0.15, cy-size*0.4, cx-m*size*0.15, cy+size*0.4, '#f1f5f9', 8);
      game.draw.line(cx-m*size*0.15, cy-size*0.4, cx+m*size*0.3, cy-size*0.4, '#f1f5f9', 8);
      game.draw.line(cx-m*size*0.15, cy, cx+m*size*0.2, cy, '#f1f5f9', 8);
    }},
    { name: 'p', draw: function(cx, cy, size, mirror) {
      var m = mirror ? -1 : 1;
      game.draw.line(cx-m*size*0.2, cy-size*0.4, cx-m*size*0.2, cy+size*0.4, '#f1f5f9', 8);
      game.draw.circle(cx+m*size*0.05, cy-size*0.15, size*0.28, '#f1f5f9', 0.0);
      game.draw.line(cx-m*size*0.2, cy-size*0.4, cx+m*size*0.15, cy-size*0.4, '#f1f5f9', 8);
      game.draw.line(cx+m*size*0.15, cy-size*0.4, cx+m*size*0.3, cy-size*0.15, '#f1f5f9', 8);
      game.draw.line(cx+m*size*0.3, cy-size*0.15, cx+m*size*0.15, cy, '#f1f5f9', 8);
      game.draw.line(cx+m*size*0.15, cy, cx-m*size*0.2, cy, '#f1f5f9', 8);
    }},
    { name: 'zigzag', draw: function(cx, cy, size, mirror) {
      var m = mirror ? -1 : 1;
      game.draw.line(cx-m*size*0.35, cy-size*0.3, cx+m*size*0.1, cy, '#f1f5f9', 8);
      game.draw.line(cx+m*size*0.1, cy, cx-m*size*0.35, cy+size*0.3, '#f1f5f9', 8);
      game.draw.line(cx-m*size*0.35, cy+size*0.3, cx+m*size*0.35, cy+size*0.3, '#f1f5f9', 8);
    }}
  ];

  var currentShape = null;
  var correctSide = 0; // 0=left, 1=right
  var score = 0;
  var needed = 15;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var feedbackSide = -1;

  function newRound() {
    currentShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    correctSide = Math.random() < 0.5 ? 0 : 1;
    feedback = 0;
  }

  game.onTap(function(tx) {
    if (done || feedback > 0) return;
    var pickedLeft = tx < W / 2;
    var correct = (pickedLeft && correctSide === 0) || (!pickedLeft && correctSide === 1);
    if (correct) {
      score++; feedbackOk = true; feedback = 0.6;
      feedbackSide = pickedLeft ? 0 : 1;
      game.audio.play('se_success');
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score*40+Math.ceil(timeLeft)*15); }, 600);
        return;
      }
      setTimeout(function() { newRound(); }, 650);
    } else {
      misses++; feedbackOk = false; feedback = 0.6;
      feedbackSide = pickedLeft ? 0 : 1;
      game.audio.play('se_failure');
      if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 600); return; }
      setTimeout(function() { newRound(); }, 650);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (!currentShape) { newRound(); return; }

    // Target (top center)
    var targetY = H * 0.3;
    game.draw.rect(W/2-140, targetY-100, 280, 200, C.panel, 0.8);
    game.draw.rect(W/2-140, targetY-100, 280, 8, C.mirrorHi, 0.6);
    game.draw.text('これは？', W/2, targetY-130, { size: 40, color: C.mirrorHi });
    currentShape.draw(W/2, targetY, 100, false);

    // Divider
    game.draw.line(W/2, H*0.52, W/2, H*0.78, C.ui, 2);

    // Two choices
    var choiceY = H * 0.65;
    var leftMirrored = correctSide === 1; // left is mirror if correct is right
    var rightMirrored = correctSide === 0;

    // Left panel
    var leftCol = feedback > 0 && feedbackSide === 0 ? (feedbackOk ? C.correct : C.wrong) : C.panel;
    game.draw.rect(40, choiceY-100, W/2-60, 200, leftCol, feedback > 0 && feedbackSide === 0 ? 0.4 : 0.7);
    game.draw.rect(40, choiceY-100, W/2-60, 8, C.chooseHi, 0.5);
    currentShape.draw(W/4, choiceY, 80, leftMirrored);

    // Right panel
    var rightCol = feedback > 0 && feedbackSide === 1 ? (feedbackOk ? C.correct : C.wrong) : C.panel;
    game.draw.rect(W/2+20, choiceY-100, W/2-60, 200, rightCol, feedback > 0 && feedbackSide === 1 ? 0.4 : 0.7);
    game.draw.rect(W/2+20, choiceY-100, W/2-60, 8, C.chooseHi, 0.5);
    currentShape.draw(W*3/4, choiceY, 80, rightMirrored);

    // Mirror label on the mirrored one
    var mirrorX = leftMirrored ? W/4 : W*3/4;
    game.draw.text('⟷', mirrorX, choiceY + 80, { size: 36, color: C.mirrorHi, bold: true });

    // Labels
    game.draw.text('← 左を選択', W*0.25, H*0.87, { size: 40, color: C.ui });
    game.draw.text('右を選択 →', W*0.75, H*0.87, { size: 40, color: C.ui });

    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) game.draw.circle(W/2+(mi-(maxMisses-1)/2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.mirror : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); newRound(); });
})(game);
