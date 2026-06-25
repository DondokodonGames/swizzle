// 256-shadow-match.js
// シャドウマッチ — 影だけを見て元の形を当てる形状認識ゲーム
// 操作: 影に対応する正しいシルエットをタップ
// 成功: 12問正解  失敗: 4問ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030510',
    shadow: '#0a0f20',
    shdHi:  '#1e2a44',
    correct:'#22c55e',
    corHi:  '#86efac',
    wrong:  '#ef4444',
    choice: '#1e3a5f',
    choHi:  '#3b82f6',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Shape definitions: each is a list of draw commands
  var SHAPES = [
    {
      name: '丸', shadow: function(cx, cy, r, col, a) { game.draw.circle(cx, cy, r, col, a); },
      choices: [
        { label: '丸', draw: function(cx, cy, col) { game.draw.circle(cx, cy, 50, col, 0.9); } },
        { label: '三角', draw: function(cx, cy, col) {
          game.draw.line(cx, cy - 55, cx - 48, cy + 27, col, 14);
          game.draw.line(cx - 48, cy + 27, cx + 48, cy + 27, col, 14);
          game.draw.line(cx + 48, cy + 27, cx, cy - 55, col, 14);
        }},
        { label: '四角', draw: function(cx, cy, col) { game.draw.rect(cx - 44, cy - 44, 88, 88, col, 0.9); } },
        { label: '星', draw: function(cx, cy, col) {
          for (var i = 0; i < 5; i++) {
            var a1 = i * Math.PI * 2 / 5 - Math.PI / 2;
            var a2 = (i + 0.5) * Math.PI * 2 / 5 - Math.PI / 2;
            var a3 = (i + 1) * Math.PI * 2 / 5 - Math.PI / 2;
            game.draw.line(Math.cos(a1)*50+cx, Math.sin(a1)*50+cy, Math.cos(a2)*20+cx, Math.sin(a2)*20+cy, col, 10);
            game.draw.line(Math.cos(a2)*20+cx, Math.sin(a2)*20+cy, Math.cos(a3)*50+cx, Math.sin(a3)*50+cy, col, 10);
          }
        }}
      ],
      correct: 0
    },
    {
      name: '三角', shadow: function(cx, cy, r, col, a) {
        game.draw.line(cx, cy - r, cx - r * 0.87, cy + r * 0.5, col, 14);
        game.draw.line(cx - r * 0.87, cy + r * 0.5, cx + r * 0.87, cy + r * 0.5, col, 14);
        game.draw.line(cx + r * 0.87, cy + r * 0.5, cx, cy - r, col, 14);
      },
      choices: [
        { label: '丸', draw: function(cx, cy, col) { game.draw.circle(cx, cy, 50, col, 0.9); } },
        { label: '三角', draw: function(cx, cy, col) {
          game.draw.line(cx, cy - 55, cx - 48, cy + 27, col, 14);
          game.draw.line(cx - 48, cy + 27, cx + 48, cy + 27, col, 14);
          game.draw.line(cx + 48, cy + 27, cx, cy - 55, col, 14);
        }},
        { label: '四角', draw: function(cx, cy, col) { game.draw.rect(cx - 44, cy - 44, 88, 88, col, 0.9); } },
        { label: '星', draw: function(cx, cy, col) {
          for (var i = 0; i < 5; i++) {
            var a1 = i * Math.PI * 2 / 5 - Math.PI / 2;
            var a2 = (i + 0.5) * Math.PI * 2 / 5 - Math.PI / 2;
            var a3 = (i + 1) * Math.PI * 2 / 5 - Math.PI / 2;
            game.draw.line(Math.cos(a1)*50+cx, Math.sin(a1)*50+cy, Math.cos(a2)*20+cx, Math.sin(a2)*20+cy, col, 10);
            game.draw.line(Math.cos(a2)*20+cx, Math.sin(a2)*20+cy, Math.cos(a3)*50+cx, Math.sin(a3)*50+cy, col, 10);
          }
        }}
      ],
      correct: 1
    },
    {
      name: '四角', shadow: function(cx, cy, r, col, a) { game.draw.rect(cx - r, cy - r, r * 2, r * 2, col, a); },
      choices: [
        { label: '丸', draw: function(cx, cy, col) { game.draw.circle(cx, cy, 50, col, 0.9); } },
        { label: '三角', draw: function(cx, cy, col) {
          game.draw.line(cx, cy - 55, cx - 48, cy + 27, col, 14);
          game.draw.line(cx - 48, cy + 27, cx + 48, cy + 27, col, 14);
          game.draw.line(cx + 48, cy + 27, cx, cy - 55, col, 14);
        }},
        { label: '四角', draw: function(cx, cy, col) { game.draw.rect(cx - 44, cy - 44, 88, 88, col, 0.9); } },
        { label: '星', draw: function(cx, cy, col) {
          for (var i = 0; i < 5; i++) {
            var a1 = i * Math.PI * 2 / 5 - Math.PI / 2;
            var a2 = (i + 0.5) * Math.PI * 2 / 5 - Math.PI / 2;
            var a3 = (i + 1) * Math.PI * 2 / 5 - Math.PI / 2;
            game.draw.line(Math.cos(a1)*50+cx, Math.sin(a1)*50+cy, Math.cos(a2)*20+cx, Math.sin(a2)*20+cy, col, 10);
            game.draw.line(Math.cos(a2)*20+cx, Math.sin(a2)*20+cy, Math.cos(a3)*50+cx, Math.sin(a3)*50+cy, col, 10);
          }
        }}
      ],
      correct: 2
    }
  ];

  var currentShape = null;
  var shuffledChoices = [];
  var correct = 0;
  var NEEDED = 12;
  var wrongs = 0;
  var MAX_WRONG = 4;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var shadowRotation = 0;
  var shadowScale = 1;

  var BTN_W = W / 2 - 30;
  var BTN_H = 200;

  function nextQuestion() {
    currentShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    shuffledChoices = currentShape.choices.slice();
    for (var i = shuffledChoices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffledChoices[i]; shuffledChoices[i] = shuffledChoices[j]; shuffledChoices[j] = tmp;
    }
    shadowRotation = (Math.random() - 0.5) * 0.5;
    shadowScale = 0.8 + Math.random() * 0.4;
  }

  function getBtnPos(i) {
    return { x: 20 + (i % 2) * (BTN_W + 20), y: H * 0.62 + Math.floor(i / 2) * (BTN_H + 20) };
  }

  game.onTap(function(tx, ty) {
    if (done || feedbackTimer > 0.15) return;

    var picked = -1;
    for (var i = 0; i < shuffledChoices.length; i++) {
      var p = getBtnPos(i);
      if (tx >= p.x && tx < p.x + BTN_W && ty >= p.y && ty < p.y + BTN_H) { picked = i; break; }
    }
    if (picked < 0) return;

    if (shuffledChoices[picked].label === currentShape.choices[currentShape.correct].label) {
      correct++;
      feedback = '正解！';
      feedbackCol = C.correct;
      feedbackTimer = 0.5;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.35, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.5 });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 120 + Math.ceil(timeLeft) * 50); }, 500);
        return;
      }
      nextQuestion();
    } else {
      wrongs++;
      feedback = '違う！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.5);
      if (wrongs >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Shadow display area
    game.draw.rect(W * 0.1, H * 0.18, W * 0.8, H * 0.32, C.shadow, 0.8);
    game.draw.text('この影は何？', W / 2, H * 0.21, { size: 42, color: C.ui });

    // Draw shadow (dark, slightly blurred look via multiple circles)
    if (currentShape) {
      var r = 80 * shadowScale;
      currentShape.shadow(W / 2, H * 0.35, r, '#000', 0.4);
      currentShape.shadow(W / 2, H * 0.35, r * 0.9, '#0a0a18', 0.7);
      currentShape.shadow(W / 2, H * 0.35, r * 0.8, C.shdHi, 0.5);
    }

    // Choices
    for (var i = 0; i < shuffledChoices.length; i++) {
      var p2 = getBtnPos(i);
      var ch = shuffledChoices[i];
      game.draw.rect(p2.x, p2.y, BTN_W, BTN_H, C.choice, 0.7);
      game.draw.rect(p2.x, p2.y, BTN_W, 6, C.choHi, 0.5);
      ch.draw(p2.x + BTN_W / 2, p2.y + BTN_H / 2, C.text);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 8 * (p3.life / 0.5), C.corHi, p3.life);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.58, { size: 56, color: feedbackCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_WRONG; mi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 28 + mi * 56, H * 0.94, 16, mi < wrongs ? C.wrong : '#0a0f20');
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    nextQuestion();
  });
})(game);
