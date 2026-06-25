// 062-blackout-bingo.js
// ブラックアウトビンゴ — 呼ばれた番号を全て埋めて5×5ビンゴを完成させる
// 操作: 呼ばれた番号の場所をタップ（番号は記憶が必要）
// 成功: 全25マス埋める(ブラックアウト)  失敗: 3回誤タップ or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030712',
    card:   '#0f172a',
    cardHi: '#1e293b',
    called: '#1d4ed8',
    calledHi:'#60a5fa',
    marked: '#166534',
    markedHi:'#22c55e',
    wrong:  '#7f1d1d',
    wrongHi:'#ef4444',
    num:    '#94a3b8',
    numHi:  '#e2e8f0',
    ui:     '#475569'
  };

  var GRID = 5;
  var CELL = 148;
  var GRID_X = (W - GRID * CELL) / 2;
  var GRID_Y = H * 0.22;

  var numbers = []; // 5x5 = 25 unique numbers (1-75)
  var marked = [];  // which cells are marked (correct)
  var calledNums = []; // numbers called so far
  var currentCalled = -1; // currently displayed number
  var callTimer = 0;
  var CALL_INTERVAL = 2.5; // seconds between calls

  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 40;
  var done = false;
  var calledCount = 0;

  var feedback = 0;
  var feedbackOk = false;
  var wrongCell = -1;

  function initBingo() {
    // Generate 25 unique numbers from 1-75
    var pool = [];
    for (var i = 1; i <= 75; i++) pool.push(i);
    // Shuffle
    for (var s = pool.length - 1; s > 0; s--) {
      var r = Math.floor(Math.random() * (s + 1));
      var tmp = pool[s]; pool[s] = pool[r]; pool[r] = tmp;
    }
    numbers = pool.slice(0, 25);
    marked = new Array(25).fill(false);
    calledNums = pool.slice(25); // remaining numbers to call
    currentCalled = -1;
    callTimer = 1.0; // first call after 1 second
  }

  function callNext() {
    if (calledNums.length === 0) return;
    var next = calledNums.shift();
    currentCalled = next;
    calledCount++;
    game.audio.play('se_tap', 0.3);
  }

  game.onTap(function(x, y) {
    if (done || currentCalled < 0) return;

    var col = Math.floor((x - GRID_X) / CELL);
    var row = Math.floor((y - GRID_Y) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;

    var idx = row * GRID + col;
    if (marked[idx]) return; // already marked

    if (numbers[idx] === currentCalled) {
      // Correct!
      marked[idx] = true;
      feedback = 0.5;
      feedbackOk = true;
      game.audio.play('se_tap', 0.8);
      currentCalled = -1;

      // Check blackout
      var allMarked = marked.every(function(m) { return m; });
      if (allMarked) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(500 + Math.ceil(timeLeft) * 8); }, 400);
      }
    } else if (numbers[idx] !== currentCalled) {
      // Wrong cell
      misses++;
      feedback = 0.4;
      feedbackOk = false;
      wrongCell = idx;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
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

    if (currentCalled < 0) {
      callTimer -= dt;
      if (callTimer <= 0) {
        callNext();
        callTimer = CALL_INTERVAL;
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Called number display
    if (currentCalled >= 0) {
      var pulse = 0.8 + 0.2 * Math.sin(game.time.elapsed * 8);
      game.draw.circle(W / 2, 128, 80, C.called, pulse);
      game.draw.circle(W / 2, 128, 64, C.calledHi, 0.3);
      game.draw.text(currentCalled + '', W / 2, 128, { size: 72, color: '#fff', bold: true });
      game.draw.text('どこ？', W / 2, 228, { size: 48, color: C.calledHi, bold: true });
    } else {
      // Waiting for next
      var waitRatio = 1 - (callTimer / CALL_INTERVAL);
      game.draw.rect(W / 2 - 120, 96, 240 * waitRatio, 24, C.called, 0.6);
      game.draw.rect(W / 2 - 120, 96, 240, 24, C.called, 0.1);
      game.draw.text('次の番号...', W / 2, 160, { size: 48, color: '#334155', bold: false });
    }

    // Bingo card
    for (var row = 0; row < GRID; row++) {
      for (var col = 0; col < GRID; col++) {
        var idx = row * GRID + col;
        var gx = GRID_X + col * CELL;
        var gy = GRID_Y + row * CELL;
        var num = numbers[idx];
        var isMarked = marked[idx];
        var isCurrent = num === currentCalled;
        var isWrong = idx === wrongCell && feedback > 0;

        // Cell background
        var bgColor = isWrong ? C.wrong : (isMarked ? C.marked : C.card);
        game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, bgColor);

        if (isCurrent) {
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.called, 0.3);
        }

        if (isMarked) {
          game.draw.rect(gx + 12, gy + 12, CELL - 24, 16, C.markedHi, 0.2);
        }

        // Number
        var numColor = isMarked ? C.markedHi : (isCurrent ? C.calledHi : C.num);
        game.draw.text(num + '', gx + CELL / 2, gy + CELL / 2, {
          size: isMarked ? 40 : 48, color: numColor, bold: isMarked || isCurrent
        });

        if (isMarked) {
          // Check mark
          game.draw.text('✓', gx + CELL - 32, gy + 28, { size: 32, color: C.markedHi });
        }
      }
    }

    // Feedback
    if (feedback > 0) {
      if (feedbackOk) {
        game.draw.text('マーク！', W / 2, GRID_Y + GRID * CELL + 60, { size: 64, color: C.markedHi, bold: true });
      } else {
        game.draw.text('違う！', W / 2, GRID_Y + GRID * CELL + 60, { size: 64, color: C.wrongHi, bold: true });
      }
    }

    // Progress
    var mCount = marked.filter(function(m) { return m; }).length;
    game.draw.text(mCount + ' / 25', W / 2, H * 0.9, { size: 52, color: C.calledHi, bold: true });

    // Miss pips
    for (var mp = 0; mp < maxMisses; mp++) {
      var mpx = W * 0.55 + mp * 52;
      game.draw.circle(mpx, H * 0.93, 18, mp < misses ? C.wrongHi : '#0f172a');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, '#030712');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.called : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initBingo();
  });
})(game);
