// 534-typewriter.js
// タイプライター — 流れてくる文字を正確にタップして原稿を完成させる
// 操作: 光っている文字をタップ（日本語ボタン）
// 成功: 20文字正確入力  失敗: 8ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08050a',
    paper:   '#f8f4e8',
    ink:     '#1a0a00',
    key:     '#2d2020',
    keyHi:   '#4a3030',
    keyLit:  '#f59e0b',
    keyText: '#f1f5f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    typed:   '#0a0a0a'
  };

  var KEYS = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の']
  ];
  var ALL_KEYS = [];
  for (var ri = 0; ri < KEYS.length; ri++)
    for (var ci = 0; ci < KEYS[ri].length; ci++)
      ALL_KEYS.push(KEYS[ri][ci]);

  var BTN_W = 180, BTN_H = 120;
  var BTN_GAP = 12;
  var BTN_OX = (W - (5 * (BTN_W + BTN_GAP) - BTN_GAP)) / 2;
  var BTN_OY = H * 0.55;

  var targetKey = '';
  var typedText = '';
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var score = 0;
  var keyPressAnim = {}; // key -> anim timer
  var wrongKey = '';
  var wrongTimer = 0;

  function pickTarget() {
    var idx = Math.floor(Math.random() * ALL_KEYS.length);
    targetKey = ALL_KEYS[idx];
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check key buttons
    for (var ri2 = 0; ri2 < KEYS.length; ri2++) {
      for (var ci2 = 0; ci2 < KEYS[ri2].length; ci2++) {
        var bx = BTN_OX + ci2 * (BTN_W + BTN_GAP);
        var by = BTN_OY + ri2 * (BTN_H + BTN_GAP);
        if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) {
          var key = KEYS[ri2][ci2];
          keyPressAnim[key] = 0.25;

          if (key === targetKey) {
            score++;
            typedText += key;
            flashCol = C.correct;
            flashAnim = 0.25;
            game.audio.play('se_tap', 0.4);
            for (var pi = 0; pi < 5; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: bx + BTN_W / 2, y: by + BTN_H / 2, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.3, col: C.keyLit });
            }
            if (score >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 100); }, 700);
            } else {
              pickTarget();
            }
          } else {
            misses++;
            wrongKey = key;
            wrongTimer = 0.5;
            flashCol = C.wrong;
            flashAnim = 0.3;
            game.audio.play('se_failure', 0.3);
            if (misses >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 500);
            }
          }
          return;
        }
      }
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (wrongTimer > 0) wrongTimer -= dt;

    for (var k in keyPressAnim) {
      keyPressAnim[k] -= dt * 4;
      if (keyPressAnim[k] <= 0) delete keyPressAnim[k];
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Paper area (typed text display)
    game.draw.rect(60, H * 0.18, W - 120, 240, C.paper, 0.95);
    game.draw.rect(60, H * 0.18, W - 120, 8, '#ddd', 0.9);

    // Lines on paper
    for (var li = 1; li < 3; li++) {
      game.draw.line(60, H * 0.18 + li * 80, W - 60, H * 0.18 + li * 80, '#ddd', 2);
    }

    // Typed text
    var displayText = typedText.slice(-18);
    game.draw.text(displayText, W / 2, H * 0.18 + 120, { size: 48, color: C.typed, bold: false });

    // Cursor blink
    if (Math.sin(elapsed * 5) > 0) {
      var cursorX = W / 2 + displayText.length * 28 - 200;
      game.draw.rect(W / 2 + (displayText.length - 9) * 28, H * 0.18 + 80, 4, 60, C.ink, 0.8);
    }

    // Target display
    game.draw.text('→ ' + targetKey + ' ←', W / 2, H * 0.46, { size: 80, color: C.keyLit, bold: true });

    // Keyboard
    for (var ri3 = 0; ri3 < KEYS.length; ri3++) {
      for (var ci3 = 0; ci3 < KEYS[ri3].length; ci3++) {
        var bx2 = BTN_OX + ci3 * (BTN_W + BTN_GAP);
        var by2 = BTN_OY + ri3 * (BTN_H + BTN_GAP);
        var k2 = KEYS[ri3][ci3];
        var isTarget = k2 === targetKey;
        var isWrong = k2 === wrongKey && wrongTimer > 0;
        var pressAnim = keyPressAnim[k2] || 0;

        var bgCol = isTarget ? '#3a2800' : (isWrong ? '#3a0000' : C.key);
        var borderCol = isTarget ? C.keyLit : (isWrong ? C.wrong : C.keyHi);
        game.draw.rect(bx2 + 4, by2 + 4 + pressAnim * 6, BTN_W - 8, BTN_H - 8, bgCol, 0.9);
        game.draw.rect(bx2 + 4, by2 + 4 + pressAnim * 6, BTN_W - 8, 8, borderCol, isTarget ? 0.6 : 0.2);
        if (isTarget) {
          game.draw.rect(bx2 + 4, by2 + 4, BTN_W - 8, BTN_H - 8, C.keyLit, 0.12);
        }
        game.draw.text(k2, bx2 + BTN_W / 2, by2 + BTN_H * 0.6 + pressAnim * 6, { size: 52, color: isTarget ? C.keyLit : C.keyText, bold: isTarget });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.keyLit : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    pickTarget();
  });
})(game);
