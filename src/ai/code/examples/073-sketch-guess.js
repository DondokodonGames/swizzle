// 073-sketch-guess.js
// スケッチゲス — 少しずつ現れるスケッチが何かを当てる早押しクイズ
// 操作: 3択からタップで回答
// 成功: 5問正解  失敗: 3問不正解 or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060a10',
    sketch:  '#e2e8f0',
    card:    '#0f172a',
    cardHi:  '#1e293b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  // Each puzzle: draw instructions + 3 answers (1 correct)
  var PUZZLES = [
    {
      answer: 0,
      choices: ['太陽', '月', '星'],
      draw: function(t, cx, cy) {
        // Sun: big circle with rays
        game.draw.circle(cx, cy, 60 * t, '#fbbf24', t);
        for (var i = 0; i < 8; i++) {
          var ang = (i / 8) * Math.PI * 2;
          var r0 = 70, r1 = 90 + 20 * t;
          game.draw.line(cx + Math.cos(ang) * r0 * t, cy + Math.sin(ang) * r0 * t,
                        cx + Math.cos(ang) * r1 * t, cy + Math.sin(ang) * r1 * t, '#fbbf24', 5 * t);
        }
      }
    },
    {
      answer: 1,
      choices: ['魚', 'クジラ', 'イルカ'],
      draw: function(t, cx, cy) {
        // Whale body (horizontal oval)
        for (var r = 0; r < 80; r++) {
          var rw = (1 - Math.pow((r - 40) / 40, 2)) * 140 * t;
          game.draw.rect(cx - rw, cy - 80 * t + r * 2 * t, rw * 2, 2 * t, '#3b82f6', 0.9 * t);
        }
        // Tail
        game.draw.line(cx - 130 * t, cy, cx - 180 * t, cy - 60 * t, '#3b82f6', 8 * t);
        game.draw.line(cx - 130 * t, cy, cx - 180 * t, cy + 60 * t, '#3b82f6', 8 * t);
        // Eye
        game.draw.circle(cx + 60 * t, cy - 20 * t, 10 * t, '#fff', t);
      }
    },
    {
      answer: 2,
      choices: ['自動車', '飛行機', '電車'],
      draw: function(t, cx, cy) {
        // Train: rectangular body with windows
        game.draw.rect(cx - 130 * t, cy - 60 * t, 260 * t, 100 * t, '#1d4ed8', t);
        // Windows
        for (var w = 0; w < 3; w++) {
          game.draw.rect(cx - 100 * t + w * 84 * t, cy - 44 * t, 56 * t, 40 * t, '#bfdbfe', t * 0.9);
        }
        // Wheels
        game.draw.circle(cx - 70 * t, cy + 44 * t, 24 * t, '#374151', t);
        game.draw.circle(cx + 70 * t, cy + 44 * t, 24 * t, '#374151', t);
        // Front nose
        game.draw.rect(cx + 130 * t, cy - 60 * t, 40 * t, 100 * t, '#1e40af', t);
      }
    },
    {
      answer: 0,
      choices: ['リンゴ', 'バナナ', 'ブドウ'],
      draw: function(t, cx, cy) {
        // Apple: red circle with leaf
        game.draw.circle(cx, cy + 10 * t, 80 * t, '#ef4444', t);
        game.draw.circle(cx - 20 * t, cy - 20 * t, 28 * t, '#ef4444', t);
        // Leaf
        game.draw.line(cx, cy - 80 * t, cx, cy - 120 * t, '#22c55e', 6 * t);
        game.draw.circle(cx + 20 * t, cy - 100 * t, 20 * t, '#22c55e', t);
        // Shine
        game.draw.circle(cx + 24 * t, cy - 24 * t, 16 * t, '#fff', 0.5 * t);
      }
    },
    {
      answer: 1,
      choices: ['テント', '山', '三角定規'],
      draw: function(t, cx, cy) {
        // Mountain: triangle
        for (var row = 0; row < 140; row++) {
          var rw = (row / 140) * 220 * t;
          game.draw.rect(cx - rw, cy - 140 * t + row * 2 * t, rw * 2, 2 * t + 1, '#475569', t * 0.9);
        }
        // Snow cap
        for (var sr = 0; sr < 35; sr++) {
          var srw = (sr / 35) * 56 * t;
          game.draw.rect(cx - srw, cy - 140 * t + sr * 2 * t, srw * 2, 2 * t + 1, '#fff', t);
        }
      }
    },
    {
      answer: 2,
      choices: ['時計', 'コンパス', '虫眼鏡'],
      draw: function(t, cx, cy) {
        // Magnifying glass
        game.draw.circle(cx - 20 * t, cy - 20 * t, 70 * t, '#94a3b8', 0.4 * t);
        game.draw.circle(cx - 20 * t, cy - 20 * t, 60 * t, '#1e3a5f', t);
        game.draw.circle(cx - 20 * t, cy - 20 * t, 60 * t, '#bfdbfe', 0.15 * t);
        // Handle
        game.draw.line(cx + 24 * t, cy + 24 * t, cx + 90 * t, cy + 90 * t, '#94a3b8', 18 * t);
        game.draw.circle(cx - 32 * t, cy - 32 * t, 16 * t, '#fff', 0.4 * t);
      }
    }
  ];

  var currentPuzzle = 0;
  var revealTimer = 0;
  var REVEAL_TIME = 3.0; // seconds to fully reveal
  var phase = 'reveal';  // 'reveal' | 'choose' | 'feedback'
  var selectedAnswer = -1;
  var feedbackTimer = 0;

  var score = 0;
  var needed = 5;
  var wrongs = 0;
  var maxWrongs = 3;
  var timeLeft = 25;
  var done = false;

  var shuffledPuzzles = [];

  function initGame() {
    // Shuffle puzzles
    shuffledPuzzles = PUZZLES.slice();
    for (var s = shuffledPuzzles.length - 1; s > 0; s--) {
      var r = Math.floor(Math.random() * (s + 1));
      var tmp = shuffledPuzzles[s]; shuffledPuzzles[s] = shuffledPuzzles[r]; shuffledPuzzles[r] = tmp;
    }
    currentPuzzle = 0;
    revealTimer = 0;
    phase = 'reveal';
  }

  function nextPuzzle() {
    currentPuzzle = (currentPuzzle + 1) % shuffledPuzzles.length;
    revealTimer = 0;
    phase = 'reveal';
    selectedAnswer = -1;
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'choose') return;
    // Three buttons at bottom
    for (var i = 0; i < 3; i++) {
      var bx = W / 2 + (i - 1) * 300;
      var by = H * 0.78;
      if (Math.abs(x - bx) < 120 && y >= by && y <= by + 160) {
        selectedAnswer = i;
        var puzz = shuffledPuzzles[currentPuzzle];
        if (i === puzz.answer) {
          score++;
          game.audio.play('se_tap', 0.9);
        } else {
          wrongs++;
          game.audio.play('se_failure', 0.6);
        }
        phase = 'feedback';
        feedbackTimer = 0.7;
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 40 + Math.ceil(timeLeft) * 6); }, 700);
        } else if (wrongs >= maxWrongs && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
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

    if (phase === 'reveal') {
      revealTimer += dt;
      if (revealTimer >= REVEAL_TIME) {
        phase = 'choose';
        game.audio.play('se_tap', 0.3);
      }
    } else if (phase === 'feedback') {
      feedbackTimer -= dt;
      if (feedbackTimer <= 0 && !done) nextPuzzle();
    }

    var t = Math.min(1, revealTimer / REVEAL_TIME);

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sketch area
    var sketchCX = W / 2;
    var sketchCY = H * 0.42;
    game.draw.rect(80, H * 0.22, W - 160, H * 0.38, '#030712');

    // Draw current puzzle
    var puzz = shuffledPuzzles[currentPuzzle];
    puzz.draw(t, sketchCX, sketchCY);

    // Reveal progress bar
    if (phase === 'reveal') {
      game.draw.rect(80, H * 0.63, (W - 160) * t, 12, '#3b82f6', 0.7);
      game.draw.text('解明中...', W / 2, H * 0.67, { size: 40, color: '#475569' });
    }

    // Choice buttons
    if (phase === 'choose' || phase === 'feedback') {
      game.draw.text('これは何？', W / 2, H * 0.72, { size: 52, color: '#94a3b8', bold: true });
      for (var i = 0; i < 3; i++) {
        var bx = W / 2 + (i - 1) * 300;
        var by = H * 0.78;
        var choice = puzz.choices[i];
        var isSelected = selectedAnswer === i;
        var isCorrect = phase === 'feedback' && i === puzz.answer;
        var isWrong = phase === 'feedback' && isSelected && i !== puzz.answer;
        var btnColor = isCorrect ? C.correct : (isWrong ? C.wrong : '#1e293b');
        game.draw.rect(bx - 120, by, 240, 160, btnColor);
        game.draw.rect(bx - 108, by + 12, 216, 20, '#fff', 0.06);
        game.draw.text(choice, bx, by + 80, { size: 52, color: '#fff', bold: isCorrect || isWrong });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#060a10');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 128, 28, s < score ? C.correct : '#0f172a');
    }
    for (var w = 0; w < maxWrongs; w++) {
      var wx = W / 2 + (w - 1) * 60;
      game.draw.circle(wx, 200, 18, w < wrongs ? C.wrong : '#0f172a');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initGame();
  });
})(game);
