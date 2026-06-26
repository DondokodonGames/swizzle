// 383-word-bomb.js
// ワードボム — 画面の文字を素早くタップして爆弾を解除
// 操作: タップで正しい文字を選ぶ
// 成功: 8問正解  失敗: 3問間違える or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a14',
    bomb:   '#1e293b',
    bombHi: '#334155',
    fuse:   '#d97706',
    fuseHi: '#fbbf24',
    correct:'#22c55e',
    wrong:  '#ef4444',
    btn:    '#1e3a5f',
    btnHi:  '#1d4ed8',
    btnWrong:'#7f1d1d',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  // Questions: which character/number is different
  var QUESTIONS = [
    { question: '数字はどれ？', choices: ['A','7','X','P'], correct: 1 },
    { question: '赤いものは？', choices: ['🟢','🔵','🔴','🟡'], correct: 2 },
    { question: '大文字はどれ？', choices: ['a','b','C','d'], correct: 2 },
    { question: '偶数はどれ？', choices: ['3','7','5','8'], correct: 3 },
    { question: '記号はどれ？', choices: ['1','2','#','4'], correct: 2 },
    { question: '最大はどれ？', choices: ['12','9','18','7'], correct: 2 },
    { question: 'ひらがなは？', choices: ['A','Z','あ','W'], correct: 2 },
    { question: '奇数はどれ？', choices: ['2','4','7','6'], correct: 2 },
    { question: '最小はどれ？', choices: ['15','3','22','8'], correct: 1 },
    { question: '平方数は？', choices: ['7','9','11','13'], correct: 1 },
    { question: '母音はどれ？', choices: ['B','C','D','E'], correct: 3 },
    { question: '数字が2つある？', choices: ['A1','BB','C3','5E'], correct: 2 }
  ];

  var qOrder = [];
  var qIdx = 0;
  var correct = 0;
  var NEEDED = 8;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var fuseLen = 1.0;  // 0-1, burns down per question

  // Shuffle questions
  function init() {
    qOrder = [];
    for (var i = 0; i < QUESTIONS.length; i++) qOrder.push(i);
    for (var i2 = qOrder.length - 1; i2 > 0; i2--) {
      var j = Math.floor(Math.random() * (i2 + 1));
      var tmp = qOrder[i2]; qOrder[i2] = qOrder[j]; qOrder[j] = tmp;
    }
    qIdx = 0;
  }

  function currentQ() {
    return QUESTIONS[qOrder[qIdx % qOrder.length]];
  }

  var BTN_W = 420, BTN_H = 140;
  var BTN_GAP = 20;
  var BTNS = [
    { x: W / 2 - BTN_W / 2, y: H * 0.55 },
    { x: W / 2 - BTN_W / 2, y: H * 0.55 + BTN_H + BTN_GAP },
    { x: W / 2 - BTN_W / 2, y: H * 0.55 + (BTN_H + BTN_GAP) * 2 },
    { x: W / 2 - BTN_W / 2, y: H * 0.55 + (BTN_H + BTN_GAP) * 3 }
  ];

  var lastAnswerState = new Array(4).fill(0); // 0=normal, 1=correct, -1=wrong

  game.onTap(function(tx, ty) {
    if (done || flashAnim > 0) return;
    for (var i = 0; i < 4; i++) {
      var b = BTNS[i];
      if (tx >= b.x && tx < b.x + BTN_W && ty >= b.y && ty < b.y + BTN_H) {
        var q = currentQ();
        lastAnswerState = [0,0,0,0];
        if (i === q.correct) {
          correct++;
          lastAnswerState[i] = 1;
          flashCol = C.correct;
          flashAnim = 0.5;
          fuseLen = Math.max(0, fuseLen - 0.1);
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x + BTN_W/2, y: b.y + BTN_H/2, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life:0.5, col: C.correct });
          }
          if (correct >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
        } else {
          wrong++;
          lastAnswerState[i] = -1;
          flashCol = C.wrong;
          flashAnim = 0.5;
          fuseLen = Math.min(1, fuseLen + 0.15);
          game.audio.play('se_failure', 0.4);
          if (wrong >= MAX_WRONG && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
            return;
          }
        }
        setTimeout(function() {
          lastAnswerState = [0,0,0,0];
          qIdx++;
        }, 450);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bomb
    var bombX = W / 2, bombY = H * 0.26;
    game.draw.circle(bombX, bombY, 110, C.bomb, 0.9);
    game.draw.circle(bombX, bombY, 90, C.bombHi, 0.85);
    game.draw.text('💣', bombX, bombY + 16, { size: 72 });

    // Fuse
    var fuseStartX = bombX + 60, fuseStartY = bombY - 80;
    var fuseEndX = fuseStartX + 80 * fuseLen, fuseEndY = fuseStartY - 60 * fuseLen;
    game.draw.line(fuseStartX, fuseStartY, fuseEndX, fuseEndY, C.fuse, 8);
    game.draw.circle(fuseEndX, fuseEndY, 14, C.fuseHi, 0.8 + Math.sin(elapsed * 10) * 0.2);

    // Question
    var q2 = currentQ();
    game.draw.text(q2.question, W / 2, H * 0.44, { size: 48, color: C.text, bold: true });

    // Buttons
    for (var bi = 0; bi < 4; bi++) {
      var b2 = BTNS[bi];
      var state = lastAnswerState[bi];
      var col2 = state === 1 ? C.correct : (state === -1 ? C.btnWrong : C.btn);
      game.draw.rect(b2.x, b2.y, BTN_W, BTN_H, col2, 0.85);
      game.draw.rect(b2.x, b2.y, BTN_W, 8, state === 1 ? C.correct : C.btnHi, 0.6);
      game.draw.text(q2.choices[bi], b2.x + BTN_W / 2, b2.y + BTN_H / 2 + 16, { size: 52, color: '#fff', bold: true });
    }

    // Flash overlay
    if (flashAnim > 0) {
      game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Mistake indicators
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2 - (MAX_WRONG-1)*40 + wi*80, H*0.935, 16, wi < wrong ? C.wrong : C.bombHi, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 56, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.fuse : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    init();
  });
})(game);
