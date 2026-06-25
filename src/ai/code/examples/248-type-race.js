// 248-type-race.js
// タイプレース — 画面に流れてくる文字を素早く認識して対応パネルをタップ
// 操作: タップで正しい文字ボタンを押す（4択）
// 成功: 25問正解  失敗: 5問ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020408',
    track:  '#0f172a',
    btn:    '#1e293b',
    btnHi:  '#334155',
    correct:'#22c55e',
    corHi:  '#86efac',
    wrong:  '#ef4444',
    wrnHi:  '#fca5a5',
    text:   '#f1f5f9',
    ui:     '#475569',
    glow:   '#3b82f6'
  };

  var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('');

  var current = '';
  var choices = [];
  var correct = 0;
  var NEEDED = 25;
  var wrongs = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var trail = [];
  var charX = W + 100;
  var charSpeed = 400;
  var charY = H * 0.38;

  function nextChar() {
    current = CHARS[Math.floor(Math.random() * CHARS.length)];
    // 4 choices including correct
    var pool = CHARS.filter(function(c) { return c !== current; });
    choices = [current];
    for (var i = 0; i < 3; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      choices.push(pool[idx]);
      pool.splice(idx, 1);
    }
    // shuffle
    for (var j = choices.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = choices[j]; choices[j] = choices[k]; choices[k] = tmp;
    }
    charX = W * 0.5;
  }

  var BTN_W = W / 2 - 30;
  var BTN_H = 200;
  var BTN_COLS = 2;
  var BTN_ROWS = 2;
  var BTN_START_Y = H * 0.6;

  function getBtnRect(i) {
    var col = i % 2;
    var row = Math.floor(i / 2);
    return {
      x: 20 + col * (BTN_W + 20),
      y: BTN_START_Y + row * (BTN_H + 20),
      w: BTN_W,
      h: BTN_H
    };
  }

  game.onTap(function(tx, ty) {
    if (done || feedbackTimer > 0.2) return;

    var picked = -1;
    for (var i = 0; i < choices.length; i++) {
      var r = getBtnRect(i);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
        picked = i;
        break;
      }
    }
    if (picked < 0) return;

    if (choices[picked] === current) {
      correct++;
      feedback = '正解！';
      feedbackCol = C.correct;
      feedbackTimer = 0.5;
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: charY, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5 });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 80 + Math.ceil(timeLeft) * 40); }, 400);
        return;
      }
      nextChar();
    } else {
      wrongs++;
      feedback = 'ミス！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.5);
      if (wrongs >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
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

    // Track
    game.draw.rect(0, H * 0.22, W, H * 0.32, C.track, 0.6);
    game.draw.rect(0, H * 0.22, W, 4, C.glow, 0.4);
    game.draw.rect(0, H * 0.22 + H * 0.32, W, 4, C.glow, 0.4);

    // Speed lines
    for (var li = 0; li < 8; li++) {
      var ly = H * 0.25 + li * 40;
      var lx = (elapsed * 300 * (li % 2 === 0 ? 1 : 1.3)) % (W + 200) - 200;
      game.draw.line(lx, ly, lx + 120, ly, C.glow, 2);
    }

    // Current char
    if (current) {
      var glowPulse = 0.3 + 0.2 * Math.abs(Math.sin(elapsed * 8));
      game.draw.circle(W / 2, charY, 90, C.glow, glowPulse);
      game.draw.circle(W / 2, charY, 70, '#0a0f1a', 0.9);
      game.draw.text(current, W / 2, charY + 24, { size: 120, color: '#fff', bold: true });
    }

    // Buttons
    for (var i = 0; i < choices.length; i++) {
      var r = getBtnRect(i);
      var isCorrect = choices[i] === current;
      game.draw.rect(r.x, r.y, r.w, r.h, C.btn, 0.8);
      game.draw.rect(r.x, r.y, r.w, 6, isCorrect ? C.corHi : C.btnHi, 0.5);
      game.draw.text(choices[i], r.x + r.w / 2, r.y + r.h / 2 + 30, { size: 110, color: C.text, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life / 0.5, C.corHi, p.life);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.18, { size: 56, color: feedbackCol, bold: true });
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 26 + wi * 52, H * 0.94, 15, wi < wrongs ? C.wrong : '#0a0f1a');
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    nextChar();
  });
})(game);
