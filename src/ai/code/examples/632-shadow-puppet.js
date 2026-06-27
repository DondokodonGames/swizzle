// 632-shadow-puppet.js
// シャドウパペット — 影の形を素早く真似しろ、時間が溶ける前に
// 操作: 画面の4つのゾーンをタップして手の形を作る
// 成功: 15形正解  失敗: 5形ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    shadow:  '#1a0a22',
    target:  '#6d28d9',
    targetHi:'#a78bfa',
    active:  '#c4b5fd',
    wrong:   '#ef4444',
    correct: '#22c55e',
    text:    '#f1f5f9',
    ui:      '#130d1a',
    wall:    '#0d0814'
  };

  // Each "shape" is defined by which of 4 zones are active: [top, left, right, bottom]
  var shapes = [
    { name: 'チョキ', zones: [true, false, true, false] },
    { name: 'グー',   zones: [false, false, false, false] },
    { name: 'パー',   zones: [true, true, true, true] },
    { name: '鳥',     zones: [true, true, false, true] },
    { name: '犬',     zones: [true, false, true, true] },
    { name: '蝶',     zones: [false, true, true, false] },
    { name: 'ウサギ', zones: [true, true, false, false] },
    { name: '魚',     zones: [false, false, true, true] }
  ];

  var currentShape = null;
  var playerZones = [false, false, false, false]; // top, left, right, bottom
  var correct = 0;
  var NEEDED = 15;
  var wrong = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;
  var shapeTimer = 0;
  var SHAPE_TIME = 4;
  var resultText = '';
  var resultTimer = 0;

  function nextShape() {
    currentShape = shapes[Math.floor(Math.random() * shapes.length)];
    playerZones = [false, false, false, false];
    shapeTimer = SHAPE_TIME;
  }

  function checkMatch() {
    if (!currentShape) return;
    var isMatch = true;
    for (var i = 0; i < 4; i++) {
      if (playerZones[i] !== currentShape.zones[i]) { isMatch = false; break; }
    }
    if (isMatch) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = '正解！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.5);
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 300 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      wrong++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ミス！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (wrong >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    if (!done) setTimeout(nextShape, 400);
  }

  // Zone tap areas: top (upper quarter), left (left half middle), right (right half middle), bottom (lower quarter)
  game.onTap(function(tx, ty) {
    if (done || !currentShape) return;
    var zone = -1;
    if (ty < H * 0.3) zone = 0;          // top
    else if (ty > H * 0.7) zone = 3;     // bottom
    else if (tx < W / 2) zone = 1;       // left
    else zone = 2;                        // right

    if (zone >= 0) {
      playerZones[zone] = !playerZones[zone];
      game.audio.play('se_tap', 0.1);
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
      shapeTimer -= dt;
      if (shapeTimer <= 0 && !done) {
        // Time expired for this shape — count as wrong
        wrong++;
        flashCol = C.wrong;
        flashAnim = 0.25;
        resultText = '時間切れ';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.25);
        if (wrong >= MAX_WRONG && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        if (!done) nextShape();
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    game.draw.rect(0, 0, W, H, C.bg);

    // Wall background — center shadow projection surface
    var CX = W / 2, CY = H / 2;
    game.draw.rect(CX - 300, CY - 380, 600, 760, C.wall, 0.7);

    if (currentShape) {
      // Draw TARGET silhouette in purple
      var tz = currentShape.zones;
      game.draw.circle(CX, CY, 100, C.target, 0.9);
      if (tz[0]) game.draw.rect(CX - 40, CY - 200, 80, 120, C.target, 0.85);  // top
      if (tz[1]) game.draw.rect(CX - 200, CY - 50, 120, 100, C.target, 0.85); // left
      if (tz[2]) game.draw.rect(CX + 80,  CY - 50, 120, 100, C.target, 0.85); // right
      if (tz[3]) game.draw.rect(CX - 40, CY + 100, 80, 120, C.target, 0.85); // bottom
      game.draw.text(currentShape.name, CX, CY - 240, { size: 44, color: C.targetHi, bold: true });

      // Draw PLAYER silhouette in white/active
      game.draw.circle(CX + 320, CY, 100, C.active, 0.9);
      if (playerZones[0]) game.draw.rect(CX + 320 - 40, CY - 200, 80, 120, C.active, 0.85);
      if (playerZones[1]) game.draw.rect(CX + 320 - 200, CY - 50, 120, 100, C.active, 0.85);
      if (playerZones[2]) game.draw.rect(CX + 320 + 80, CY - 50, 120, 100, C.active, 0.85);
      if (playerZones[3]) game.draw.rect(CX + 320 - 40, CY + 100, 80, 120, C.active, 0.85);

      // Zone tap labels
      game.draw.text('▲ タップ', W / 2, H * 0.22, { size: 32, color: playerZones[0] ? C.active : '#ffffff44' });
      game.draw.text('◀ タップ', W * 0.18, H * 0.5, { size: 32, color: playerZones[1] ? C.active : '#ffffff44' });
      game.draw.text('タップ ▶', W * 0.82, H * 0.5, { size: 32, color: playerZones[2] ? C.active : '#ffffff44' });
      game.draw.text('▼ タップ', W / 2, H * 0.78, { size: 32, color: playerZones[3] ? C.active : '#ffffff44' });

      // Confirm button area
      game.draw.rect(W / 2 - 160, H * 0.84, 320, 80, C.target, 0.7);
      game.draw.text('決定 (中央タップ)', W / 2, H * 0.84 + 44, { size: 32, color: C.targetHi, bold: true });

      // Shape timer bar
      var tRatio = Math.max(0, shapeTimer / SHAPE_TIME);
      game.draw.rect(W / 2 - 200, H * 0.9, 400, 16, C.ui, 0.8);
      game.draw.rect(W / 2 - 200, H * 0.9, 400 * tRatio, 16, tRatio > 0.4 ? C.target : C.wrong, 0.9);
    }

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.5, { size: 80, color: flashCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 44 + wi * 88, H * 0.955, 18, wi < wrong ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.target : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextShape();
  });
})(game);
