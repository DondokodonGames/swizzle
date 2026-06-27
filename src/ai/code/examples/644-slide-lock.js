// 644-slide-lock.js
// スライドロック — スライドパズルのピンをすべて正位置に並べろ
// 操作: スワイプでピンをスライド
// 成功: 全ピン正位置に合わせる  失敗: 動かせる回数超過 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a06',
    slot:    '#0f1f14',
    slotHi:  '#1a3020',
    pin:     '#22c55e',
    pinHi:   '#86efac',
    pinWrong:'#f97316',
    pinRight:'#22c55e',
    target:  '#15803d',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#04110a',
    lock:    '#fbbf24'
  };

  var NUM_PINS = 6;
  var SLOT_W = 120;
  var SLOT_H = 480;
  var SLOT_GAP = 36;
  var PIN_H = 120;
  var START_X = (W - (NUM_PINS * SLOT_W + (NUM_PINS - 1) * SLOT_GAP)) / 2;
  var BOARD_Y = H * 0.25;

  var pins = [];         // pin positions (0 = bottom, 4 = top)
  var targets = [];      // target positions
  var moves = 0;
  var MAX_MOVES = 25;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var solvedCount = 0;
  var rounds = 0;
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0;
  var resultText = '';

  var POSITIONS = 4; // 0 to 3 per pin

  function genPuzzle() {
    pins = [];
    targets = [];
    for (var i = 0; i < NUM_PINS; i++) {
      targets.push(Math.floor(Math.random() * POSITIONS));
      var p;
      do { p = Math.floor(Math.random() * POSITIONS); } while (p === targets[i]);
      pins.push(p);
    }
    moves = 0;
  }

  function checkSolved() {
    for (var i = 0; i < NUM_PINS; i++) {
      if (pins[i] !== targets[i]) return false;
    }
    return true;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir !== 'up' && dir !== 'down') return;
    // Tap area — just move all pins up or down based on majority?
    // Actually we'll move the pin the swipe is closest to
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which pin slot was tapped
    var pinIdx = -1;
    for (var i = 0; i < NUM_PINS; i++) {
      var slotX = START_X + i * (SLOT_W + SLOT_GAP);
      if (tx >= slotX && tx <= slotX + SLOT_W) {
        pinIdx = i;
        break;
      }
    }
    if (pinIdx < 0) return;

    // Determine direction from tap y
    var pinSlotTopY = BOARD_Y;
    var pinSlotBotY = BOARD_Y + SLOT_H;
    var pinMidY = pinSlotTopY + (SLOT_H * (1 - pins[pinIdx] / (POSITIONS - 1)));

    if (ty < pinMidY) {
      // Tap above pin — move up
      if (pins[pinIdx] < POSITIONS - 1) {
        pins[pinIdx]++;
        moves++;
        game.audio.play('se_tap', 0.15);
      }
    } else {
      // Tap below pin — move down
      if (pins[pinIdx] > 0) {
        pins[pinIdx]--;
        moves++;
        game.audio.play('se_tap', 0.15);
      }
    }

    if (checkSolved()) {
      solvedCount++;
      rounds++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = 'クリア！';
      resultTimer = 0.7;
      game.audio.play('se_success', 0.7);
      if (solvedCount >= 5 && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(solvedCount * 500 + Math.ceil(timeLeft) * 80); }, 800);
      } else {
        setTimeout(genPuzzle, 600);
      }
    } else if (moves >= MAX_MOVES) {
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function() { game.end.failure(); }, 500);
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

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Slots and pins
    for (var i = 0; i < NUM_PINS; i++) {
      var sx = START_X + i * (SLOT_W + SLOT_GAP);
      var sy = BOARD_Y;

      // Slot track
      game.draw.rect(sx + SLOT_W * 0.3, sy, SLOT_W * 0.4, SLOT_H, C.slot, 0.8);

      // Target marker
      var targetY = sy + SLOT_H * (1 - targets[i] / (POSITIONS - 1)) - PIN_H / 2;
      game.draw.rect(sx + 4, targetY, SLOT_W - 8, PIN_H, C.target, 0.4);
      game.draw.rect(sx + 4, targetY, SLOT_W - 8, 6, C.pinRight, 0.5);

      // Pin
      var pinY = sy + SLOT_H * (1 - pins[i] / (POSITIONS - 1)) - PIN_H / 2;
      var isCorrect = pins[i] === targets[i];
      var pinCol = isCorrect ? C.pinRight : C.pinWrong;
      game.draw.rect(sx + 6, pinY + 4, SLOT_W - 12, PIN_H, '#000', 0.3);
      game.draw.rect(sx + 6, pinY, SLOT_W - 12, PIN_H, pinCol, 0.9);
      game.draw.rect(sx + 6, pinY, SLOT_W - 12, 12, isCorrect ? C.pinHi : '#fed7aa', 0.5);

      // Up/down arrows
      game.draw.text('▲', sx + SLOT_W / 2, sy - 24, { size: 32, color: pins[i] < POSITIONS - 1 ? C.pinHi : '#33333355' });
      game.draw.text('▼', sx + SLOT_W / 2, sy + SLOT_H + 28, { size: 32, color: pins[i] > 0 ? C.pinHi : '#33333355' });
    }

    // Lock body
    var lockY = BOARD_Y + SLOT_H + 80;
    game.draw.rect(W / 2 - 160, lockY, 320, 120, C.ui, 0.9);
    game.draw.rect(W / 2 - 160, lockY, 320, 10, '#333', 0.8);
    var allRight = checkSolved();
    game.draw.circle(W / 2, lockY + 60, 36, allRight ? C.lock : '#33333377', 0.9);
    game.draw.text(allRight ? '開' : '錠', W / 2, lockY + 72, { size: 44, color: allRight ? '#000' : '#555', bold: true });

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 72, color: flashCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Moves bar
    var movRatio = Math.max(0, 1 - moves / MAX_MOVES);
    game.draw.rect(W / 2 - 200, H * 0.12, 400, 20, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.12, 400 * movRatio, 20, movRatio > 0.3 ? C.pin : C.wrong, 0.8);
    game.draw.text('残手数: ' + (MAX_MOVES - moves), W / 2, H * 0.12 + 40, { size: 32, color: C.text });

    game.draw.text(solvedCount + ' / 5', W / 2, 148, { size: 60, color: C.lock, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.pin : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    genPuzzle();
  });
})(game);
