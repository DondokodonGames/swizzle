// 242-mirror-type.js
// ミラータイプ — 鏡に映った文字を読み解いてタップする左右反転認知パズル
// 操作: 鏡文字のどちらが正しい元の文字か選ぶ
// 成功: 15問正解  失敗: 5問間違える or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04060c',
    mirror: '#1e3a5f',
    mirHi:  '#3b82f6',
    correct:'#22c55e',
    corHi:  '#86efac',
    wrong:  '#ef4444',
    wrnHi:  '#fca5a5',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  // Pairs of similar letters / characters for the puzzle
  // Each question: show a mirrored version, player picks correct original
  var QUESTIONS = [
    { mirrored: 'b', choices: ['b', 'd'], correct: 'd' }, // 'd' mirrored is 'b'
    { mirrored: 'p', choices: ['p', 'q'], correct: 'q' },
    { mirrored: '6', choices: ['6', '9'], correct: '9' },
    { mirrored: 'R', choices: ['R', 'Я'], correct: 'R' },
    { mirrored: 'E', choices: ['E', '3'], correct: 'E' },
    { mirrored: 'S', choices: ['S', 'Z'], correct: 'S' },
    { mirrored: 'K', choices: ['K', 'Ж'], correct: 'K' },
    { mirrored: 'L', choices: ['L', 'J'], correct: 'J' },
    { mirrored: 'C', choices: ['C', 'Ↄ'], correct: 'C' },
    { mirrored: 'N', choices: ['N', 'И'], correct: 'N' }
  ];

  var questionIdx = 0;
  var currentQ = null;
  var correct = 0;
  var NEEDED = 15;
  var wrongs = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var CHOICE_W = W / 2 - 60;
  var CHOICE_H = 180;

  function nextQuestion() {
    currentQ = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    // Randomly flip choice order
    if (Math.random() < 0.5) {
      currentQ = {
        mirrored: currentQ.mirrored,
        choices: [currentQ.choices[1], currentQ.choices[0]],
        correct: currentQ.correct
      };
    }
  }

  game.onTap(function(tx, ty) {
    if (done || !currentQ || feedbackTimer > 0.3) return;

    // Two choice buttons
    var leftX = 40, rightX = W / 2 + 20;
    var choiceY = H * 0.55;
    var picked = -1;
    if (tx >= leftX && tx < leftX + CHOICE_W && ty >= choiceY && ty < choiceY + CHOICE_H) picked = 0;
    else if (tx >= rightX && tx < rightX + CHOICE_W && ty >= choiceY && ty < choiceY + CHOICE_H) picked = 1;

    if (picked < 0) return;

    var chosen = currentQ.choices[picked];
    if (chosen === currentQ.correct) {
      correct++;
      feedback = '正解！';
      feedbackCol = C.correct;
      feedbackTimer = 0.6;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.6, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5 });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 100 + Math.ceil(timeLeft) * 30); }, 400);
      }
    } else {
      wrongs++;
      feedback = '不正解';
      feedbackCol = C.wrong;
      feedbackTimer = 0.6;
      game.audio.play('se_failure', 0.5);
      if (wrongs >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
    nextQuestion();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 200 * dt;
      particles[pi].life -= dt;
      if (particles[pi].life <= 0) particles.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Mirror visual
    game.draw.rect(W / 2 - 4, H * 0.1, 8, H * 0.8, C.mirHi, 0.6);
    game.draw.text('鏡', W / 2, H * 0.13, { size: 32, color: C.mirHi });

    if (currentQ) {
      // Show mirrored character on left side (reflected)
      game.draw.text('鏡文字:', W / 4, H * 0.25, { size: 36, color: C.ui });
      // Draw mirrored char (we just display it with a ← indicator)
      game.draw.text(currentQ.mirrored, W / 4, H * 0.38, { size: 160, color: C.mirHi, bold: true });
      game.draw.text('← 鏡像', W / 4, H * 0.46, { size: 32, color: C.ui });

      // Question text
      game.draw.text('元の文字は？', W * 0.75, H * 0.25, { size: 42, color: C.text, bold: true });

      // Choice buttons
      var leftX = 40, rightX = W / 2 + 20;
      var choiceY = H * 0.55;
      for (var ci = 0; ci < 2; ci++) {
        var bx = ci === 0 ? leftX : rightX;
        var choice = currentQ.choices[ci];
        var isCorrect = choice === currentQ.correct;
        game.draw.rect(bx, choiceY, CHOICE_W, CHOICE_H, C.mirror, 0.7);
        game.draw.rect(bx, choiceY, CHOICE_W, 6, C.mirHi, 0.5);
        game.draw.text(choice, bx + CHOICE_W / 2, choiceY + CHOICE_H / 2 + 30, { size: 130, color: C.text, bold: true });
      }
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.82, { size: 60, color: feedbackCol, bold: true });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 8 * p.life, C.corHi, p.life * 0.8);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 26 + wi * 52, H * 0.88, 16, wi < wrongs ? C.wrong : '#0a0a14');
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    nextQuestion();
  });
})(game);
