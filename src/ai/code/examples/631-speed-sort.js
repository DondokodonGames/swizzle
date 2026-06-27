// 631-speed-sort.js
// スピードソート — 流れてくる数字を正しい順に素早く振り分けろ
// 操作: スワイプで左(小)または右(大)に振り分け
// 成功: 30個正解  失敗: 8個誤答 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    left:    '#3b82f6',
    leftHi:  '#93c5fd',
    right:   '#ec4899',
    rightHi: '#f9a8d4',
    card:    '#0f1a30',
    cardHi:  '#1a2a48',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0f20',
    number:  '#ffffff'
  };

  var currentNum = 0;
  var threshold = 0; // numbers < threshold go left, >= go right
  var correct = 0;
  var NEEDED = 30;
  var wrong = 0;
  var MAX_WRONG = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var cardScale = 1;
  var cardVelX = 0;
  var resultTimer = 0;
  var resultText = '';
  var cardX = W / 2;
  var animating = false;

  function nextCard() {
    currentNum = Math.floor(Math.random() * 99) + 1;
    threshold = 20 + Math.floor(Math.random() * 60);
    cardX = W / 2;
    cardScale = 1;
    cardVelX = 0;
    animating = false;
  }

  function decide(dir) {
    if (animating) return;
    animating = true;
    var isLeft = dir === 'left';
    var shouldLeft = currentNum < threshold;
    var isCorrect = (isLeft === shouldLeft);
    cardVelX = isLeft ? -1200 : 1200;

    if (isCorrect) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = '正解!';
      resultTimer = 0.4;
      game.audio.play('se_success', 0.5);
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 200 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      wrong++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '不正解';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.35);
      if (wrong >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    setTimeout(function() { if (!done) nextCard(); }, 350);
  }

  game.onSwipe(function(dir) {
    if (done || animating) return;
    if (dir === 'left' || dir === 'right') decide(dir);
  });

  game.onTap(function(tx, ty) {
    if (done || animating) return;
    decide(tx < W / 2 ? 'left' : 'right');
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
    if (resultTimer > 0) resultTimer -= dt;

    if (animating) {
      cardX += cardVelX * dt;
      cardScale = Math.max(0.5, cardScale - dt * 2);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Left zone
    game.draw.rect(0, H * 0.2, W / 2, H * 0.65, C.left, 0.06);
    game.draw.text('< ' + threshold, W / 4, H * 0.52, { size: 52, color: C.left, bold: true });
    game.draw.text('小さい', W / 4, H * 0.59, { size: 36, color: C.leftHi });

    // Right zone
    game.draw.rect(W / 2, H * 0.2, W / 2, H * 0.65, C.right, 0.06);
    game.draw.text('≥ ' + threshold, W * 3 / 4, H * 0.52, { size: 52, color: C.right, bold: true });
    game.draw.text('大きい', W * 3 / 4, H * 0.59, { size: 36, color: C.rightHi });

    // Divider
    game.draw.line(W / 2, H * 0.2, W / 2, H * 0.85, '#ffffff', 2);

    // Card
    var CARD_W = 300 * cardScale;
    var CARD_H = 300 * cardScale;
    game.draw.rect(cardX - CARD_W / 2 + 8, H * 0.35 + 8, CARD_W, CARD_H, '#000', 0.3);
    game.draw.rect(cardX - CARD_W / 2, H * 0.35, CARD_W, CARD_H, C.card, 0.95);
    game.draw.rect(cardX - CARD_W / 2, H * 0.35, CARD_W, 16, C.cardHi, 0.5);
    game.draw.text(currentNum + '', cardX, H * 0.52, { size: 120 * cardScale, color: C.number, bold: true });

    // Swipe arrows
    if (!animating) {
      game.draw.text('←', W / 2 - 180, H * 0.88, { size: 72, color: C.left });
      game.draw.text('→', W / 2 + 180, H * 0.88, { size: 72, color: C.right });
    }

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 56, color: flashCol, bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 44 + wi * 88, H * 0.955, 18, wi < wrong ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.left : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    nextCard();
  });
})(game);
