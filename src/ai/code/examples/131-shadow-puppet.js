// 131-shadow-puppet.js
// 影絵当て — シルエットが何かを当てて正しい選択肢をタップする直感推理ゲーム
// 操作: タップで答えを選ぶ
// 成功: 8問正解  失敗: 3回間違える or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    shadow:  '#0a0f18',
    shadowFill:'#1a2030',
    light:   '#fef3c7',
    correct: '#22c55e',
    wrong:   '#ef4444',
    button:  '#0f1e30',
    buttonHi:'#1e3a5f',
    ui:      '#334155'
  };

  // Each puzzle: shape drawing function + choices + answerIdx
  var puzzles = [
    {
      name: 'ねこ', choices: ['ねこ', 'いぬ', 'うさぎ', 'くま'], answer: 0,
      draw: function(cx, cy, s) {
        // Cat silhouette
        game.draw.circle(cx, cy, s*0.5, C.shadowFill);
        game.draw.circle(cx, cy-s*0.15, s*0.38, C.shadowFill);
        // Ears
        game.draw.rect(cx-s*0.25, cy-s*0.5, s*0.2, s*0.25, C.shadowFill);
        game.draw.rect(cx+s*0.05, cy-s*0.5, s*0.2, s*0.25, C.shadowFill);
        // Tail
        game.draw.circle(cx+s*0.6, cy+s*0.1, s*0.12, C.shadowFill);
        game.draw.circle(cx+s*0.5, cy+s*0.3, s*0.1, C.shadowFill);
      }
    },
    {
      name: 'はな', choices: ['はな', 'き', 'きのこ', 'くも'], answer: 0,
      draw: function(cx, cy, s) {
        // Flower
        for (var pi = 0; pi < 6; pi++) {
          var ang = pi / 6 * Math.PI * 2;
          game.draw.circle(cx+Math.cos(ang)*s*0.3, cy-s*0.1+Math.sin(ang)*s*0.3, s*0.22, C.shadowFill);
        }
        game.draw.circle(cx, cy-s*0.1, s*0.2, C.shadowFill);
        game.draw.rect(cx-s*0.06, cy+s*0.1, s*0.12, s*0.5, C.shadowFill);
      }
    },
    {
      name: 'おうち', choices: ['おうち', 'やま', 'とり', 'ふね'], answer: 0,
      draw: function(cx, cy, s) {
        // House body
        game.draw.rect(cx-s*0.35, cy-s*0.1, s*0.7, s*0.55, C.shadowFill);
        // Roof (triangle approx)
        game.draw.circle(cx, cy-s*0.35, s*0.45, C.shadowFill);
        game.draw.rect(cx-s*0.35, cy-s*0.1, s*0.7, s*0.15, C.bg, 0.5);
        // Door
        game.draw.rect(cx-s*0.1, cy+s*0.15, s*0.2, s*0.3, C.bg, 0.8);
      }
    },
    {
      name: 'ほし', choices: ['ほし', 'つき', 'たいよう', 'かみなり'], answer: 0,
      draw: function(cx, cy, s) {
        // Star (5 points)
        for (var si = 0; si < 5; si++) {
          var a = si/5*Math.PI*2 - Math.PI/2;
          var px = cx + Math.cos(a)*s*0.45;
          var py = cy + Math.sin(a)*s*0.45;
          game.draw.circle(px, py, s*0.15, C.shadowFill);
        }
        game.draw.circle(cx, cy, s*0.25, C.shadowFill);
      }
    },
    {
      name: 'くるま', choices: ['くるま', 'ふね', 'ひこうき', 'じてんしゃ'], answer: 0,
      draw: function(cx, cy, s) {
        // Car body
        game.draw.rect(cx-s*0.45, cy, s*0.9, s*0.35, C.shadowFill);
        game.draw.rect(cx-s*0.25, cy-s*0.28, s*0.5, s*0.32, C.shadowFill);
        // Wheels
        game.draw.circle(cx-s*0.28, cy+s*0.3, s*0.18, C.shadowFill);
        game.draw.circle(cx+s*0.28, cy+s*0.3, s*0.18, C.shadowFill);
      }
    },
    {
      name: 'さかな', choices: ['さかな', 'えび', 'かめ', 'たこ'], answer: 0,
      draw: function(cx, cy, s) {
        // Fish body
        game.draw.circle(cx-s*0.05, cy, s*0.35, C.shadowFill);
        // Tail
        game.draw.circle(cx+s*0.38, cy, s*0.2, C.shadowFill);
        game.draw.circle(cx+s*0.38, cy-s*0.15, s*0.12, C.shadowFill);
        game.draw.circle(cx+s*0.38, cy+s*0.15, s*0.12, C.shadowFill);
        // Eye
        game.draw.circle(cx-s*0.18, cy-s*0.1, s*0.06, C.bg, 0.9);
      }
    },
    {
      name: 'やま', choices: ['やま', 'おうち', 'なみ', 'くも'], answer: 0,
      draw: function(cx, cy, s) {
        // Mountain
        game.draw.circle(cx, cy-s*0.15, s*0.55, C.shadowFill);
        game.draw.circle(cx-s*0.35, cy+s*0.1, s*0.38, C.shadowFill);
        game.draw.circle(cx+s*0.35, cy+s*0.15, s*0.32, C.shadowFill);
        game.draw.rect(cx-s*0.6, cy+s*0.25, s*1.2, s*0.3, C.shadowFill);
      }
    },
    {
      name: 'けいたいでんわ', choices: ['けいたいでんわ', 'どけい', 'カメラ', 'さいふ'], answer: 0,
      draw: function(cx, cy, s) {
        // Smartphone
        game.draw.rect(cx-s*0.2, cy-s*0.45, s*0.4, s*0.9, C.shadowFill);
        game.draw.circle(cx, cy+s*0.32, s*0.06, C.bg, 0.9);
      }
    }
  ];

  var questionOrder = [];
  for (var qi = 0; qi < puzzles.length; qi++) questionOrder.push(qi);
  // Shuffle
  for (var si = questionOrder.length-1; si > 0; si--) {
    var sj = Math.floor(Math.random()*(si+1));
    var st = questionOrder[si]; questionOrder[si] = questionOrder[sj]; questionOrder[sj] = st;
  }

  var currentQ = 0;
  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var feedbackText = '';

  var SHADOW_X = W/2;
  var SHADOW_Y = H*0.38;
  var SHADOW_S = 180;

  var CHOICES_Y = H*0.67;
  var CHOICE_W = (W-80)/2;
  var CHOICE_H = 120;
  var choiceLayout = [
    {x: 40, y: CHOICES_Y},
    {x: W/2+20, y: CHOICES_Y},
    {x: 40, y: CHOICES_Y+CHOICE_H+20},
    {x: W/2+20, y: CHOICES_Y+CHOICE_H+20}
  ];

  function shuffleChoices(puzzle) {
    // Shuffle choices but track correct answer index
    var order = [0,1,2,3];
    for (var i = 3; i > 0; i--) {
      var j = Math.floor(Math.random()*(i+1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    return order;
  }

  var choiceOrder = shuffleChoices(puzzles[questionOrder[0]]);

  game.onTap(function(tx, ty) {
    if (done || feedback > 0) return;
    var puzzle = puzzles[questionOrder[currentQ % puzzles.length]];
    for (var i = 0; i < 4; i++) {
      var cl = choiceLayout[i];
      if (tx >= cl.x && tx < cl.x + CHOICE_W && ty >= cl.y && ty < cl.y + CHOICE_H) {
        var choiceIdx = choiceOrder[i];
        if (choiceIdx === puzzle.answer) {
          score++;
          feedbackOk = true;
          feedbackText = '正解！';
          game.audio.play('se_success');
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score*60 + Math.ceil(timeLeft)*10); }, 500);
            return;
          }
        } else {
          misses++;
          feedbackOk = false;
          feedbackText = '不正解…';
          game.audio.play('se_failure');
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
        }
        feedback = 0.5;
        currentQ++;
        choiceOrder = shuffleChoices(puzzles[questionOrder[currentQ % puzzles.length]]);
        return;
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
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Light source glow
    game.draw.circle(W*0.1, H*0.08, 50, C.light, 0.3);
    game.draw.circle(W*0.1, H*0.08, 24, C.light, 0.8);
    game.draw.line(W*0.1, H*0.08, SHADOW_X, SHADOW_Y, C.light, 1);

    // Shadow
    var puzzle2 = puzzles[questionOrder[currentQ % puzzles.length]];
    puzzle2.draw(SHADOW_X, SHADOW_Y, SHADOW_S);

    // Question mark during reveal
    game.draw.text('これは何？', W/2, H*0.59, { size: 48, color: C.light, bold: true });

    // Choices
    for (var i2 = 0; i2 < 4; i2++) {
      var cl2 = choiceLayout[i2];
      var choiceIdx2 = choiceOrder[i2];
      game.draw.rect(cl2.x, cl2.y, CHOICE_W, CHOICE_H, C.button);
      game.draw.rect(cl2.x, cl2.y, CHOICE_W, 6, C.buttonHi);
      game.draw.text(puzzle2.choices[choiceIdx2], cl2.x + CHOICE_W/2, cl2.y + CHOICE_H/2, {
        size: 44, color: '#e2e8f0', bold: true
      });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback*0.2);
      game.draw.text(feedbackText, W/2, H*0.5, { size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true });
    }

    game.draw.text(score+' / '+needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-1)*52, 216, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? '#6366f1' : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
