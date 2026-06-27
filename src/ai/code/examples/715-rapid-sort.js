// 715-rapid-sort.js
// 高速仕分け — 流れてくるアイテムを左右にスワイプで仕分けろ
// 操作: 左スワイプ or 右スワイプで振り分け
// 成功: 40個正確に仕分ける  失敗: 10個ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060f',
    boxL:    '#0f2d52',
    boxR:    '#2d0f14',
    labelL:  '#38bdf8',
    labelR:  '#f87171',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060810'
  };

  // Items are shapes: ROUND or ANGULAR
  // Left = round (circles), Right = angular (squares)
  var ITEM_SIZE = 90;
  var ITEM_X = W / 2;
  var ITEM_Y = H * 0.45;

  var currentItem = null; // { type: 'round'|'angular', x, y, vx, animX }
  var spawnTimer = 0;
  var SPAWN_DELAY = 0.3;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var slideAnim = null; // { x, y, vx, type, correct }
  var swipeDone = false;

  var ITEM_TYPES = ['round', 'angular'];

  function spawnItem() {
    var type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    currentItem = {
      type: type,
      x: ITEM_X,
      y: ITEM_Y,
      phase: Math.random() * Math.PI * 2
    };
    swipeDone = false;
  }

  function resolveSwipe(direction) {
    if (!currentItem || swipeDone) return;
    swipeDone = true;
    var correctDir = currentItem.type === 'round' ? 'left' : 'right';
    var isCorrect = direction === correctDir;

    slideAnim = {
      x: currentItem.x,
      y: currentItem.y,
      vx: direction === 'left' ? -1200 : 1200,
      vy: 0,
      type: currentItem.type,
      life: 0.35,
      correct: isCorrect
    };

    if (isCorrect) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      game.audio.play('se_tap', 0.1);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '逆！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    currentItem = null;
    spawnTimer = SPAWN_DELAY;
  }

  game.onTap(function(tx, ty) {
    if (done || !currentItem || swipeDone) return;
    // Left half = round (left), Right half = angular (right)
    if (tx < W / 2) {
      resolveSwipe('left');
    } else {
      resolveSwipe('right');
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (spawnTimer > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && !currentItem && !done) spawnItem();
    }

    if (!currentItem && !done && spawnTimer <= 0) spawnItem();

    if (currentItem) currentItem.phase += dt * 2;

    if (slideAnim) {
      slideAnim.x += slideAnim.vx * dt;
      slideAnim.life -= dt * 3;
      if (slideAnim.life <= 0) slideAnim = null;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Left box (round)
    game.draw.rect(0, H * 0.72, W * 0.42, H * 0.18, C.boxL, 0.8);
    game.draw.circle(W * 0.21, H * 0.81, 50, C.labelL, 0.7);
    game.draw.text('←', W * 0.1, H * 0.22, { size: 80, color: C.labelL + '66', bold: true });

    // Right box (angular)
    game.draw.rect(W * 0.58, H * 0.72, W * 0.42, H * 0.18, C.boxR, 0.8);
    game.draw.rect(W * 0.7, H * 0.77, 80, 80, C.labelR, 0.7);
    game.draw.text('→', W * 0.9, H * 0.22, { size: 80, color: C.labelR + '66', bold: true });

    // Divider
    game.draw.line(W / 2, H * 0.2, W / 2, H * 0.72, '#ffffff0a', 2);

    // Center question item
    if (currentItem) {
      var pulse = 0.9 + 0.1 * Math.sin(currentItem.phase * 3);
      if (currentItem.type === 'round') {
        game.draw.circle(currentItem.x + 4, currentItem.y + 4, ITEM_SIZE * pulse, '#000', 0.25);
        game.draw.circle(currentItem.x, currentItem.y, ITEM_SIZE * pulse, C.labelL, 0.9);
        game.draw.circle(currentItem.x - ITEM_SIZE * 0.3, currentItem.y - ITEM_SIZE * 0.3, ITEM_SIZE * 0.25, '#fff', 0.3);
      } else {
        var sz = ITEM_SIZE * pulse;
        game.draw.rect(currentItem.x - sz + 4, currentItem.y - sz + 4, sz * 2, sz * 2, '#000', 0.25);
        game.draw.rect(currentItem.x - sz, currentItem.y - sz, sz * 2, sz * 2, C.labelR, 0.9);
        game.draw.rect(currentItem.x - sz, currentItem.y - sz, sz * 2, 12, '#ffffff22', 1);
      }
    }

    // Slide animation
    if (slideAnim) {
      var sa = slideAnim;
      var saAlpha = sa.life * 2;
      if (sa.type === 'round') {
        game.draw.circle(sa.x, sa.y, ITEM_SIZE, sa.correct ? C.correct : C.wrong, saAlpha);
      } else {
        game.draw.rect(sa.x - ITEM_SIZE, sa.y - ITEM_SIZE, ITEM_SIZE * 2, ITEM_SIZE * 2, sa.correct ? C.correct : C.wrong, saAlpha);
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.64, { size: 60, color: C.wrong, bold: true });
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 40 + ei * 80, H * 0.955, 16, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnItem();
  });
})(game);
