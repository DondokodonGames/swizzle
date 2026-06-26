// 517-color-blend.js
// カラーブレンド — 混色パズルで指定色を作る
// 操作: 色ボタンをタップして混色、目標色に近づける
// 成功: 10色達成  失敗: 5ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0505',
    panel:   '#150a0a',
    text:    '#f1f5f9',
    ui:      '#374151',
    correct: '#22c55e',
    wrong:   '#ef4444',
    border:  '#4b2020'
  };

  var COLORS = [
    { name: '赤', r: 220, g: 40,  b: 40  },
    { name: '青', r: 40,  g: 80,  b: 220 },
    { name: '黄', r: 230, g: 200, b: 20  },
    { name: '白', r: 240, g: 240, b: 240 },
    { name: '黒', r: 20,  g: 20,  b: 20  }
  ];

  var BTN_W = 160, BTN_H = 160;
  var BTN_GAP = 20;
  var BTN_ROW_X = (W - (COLORS.length * (BTN_W + BTN_GAP) - BTN_GAP)) / 2;
  var BTN_Y = H * 0.72;

  var mixR = 128, mixG = 128, mixB = 128;
  var targetR, targetG, targetB;
  var score = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var feedback = '';
  var feedbackTimer = 0;

  function rgb(r, g, b) {
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  function genTarget() {
    targetR = 40 + Math.floor(Math.random() * 180);
    targetG = 40 + Math.floor(Math.random() * 180);
    targetB = 40 + Math.floor(Math.random() * 180);
    mixR = 128; mixG = 128; mixB = 128;
  }

  function colorDist() {
    var dr = mixR - targetR, dg = mixG - targetG, db = mixB - targetB;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Check color buttons
    for (var i = 0; i < COLORS.length; i++) {
      var bx = BTN_ROW_X + i * (BTN_W + BTN_GAP);
      if (tx >= bx && tx <= bx + BTN_W && ty >= BTN_Y && ty <= BTN_Y + BTN_H) {
        var col = COLORS[i];
        mixR = (mixR * 0.6 + col.r * 0.4);
        mixG = (mixG * 0.6 + col.g * 0.4);
        mixB = (mixB * 0.6 + col.b * 0.4);
        game.audio.play('se_tap', 0.3);
        return;
      }
    }

    // Submit button
    var subX = W / 2 - 200, subY = H * 0.88;
    if (tx >= subX && tx <= subX + 400 && ty >= subY && ty <= subY + 100) {
      var dist = colorDist();
      if (dist < 40) {
        score++;
        flashCol = C.correct;
        flashAnim = 0.5;
        feedback = '完璧！';
        feedbackTimer = 1.2;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.4, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: rgb(targetR, targetG, targetB) });
        }
        if (score >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) genTarget(); }, 600);
        }
      } else if (dist < 80) {
        score++;
        flashCol = C.correct;
        flashAnim = 0.3;
        feedback = 'OK！';
        feedbackTimer = 1.0;
        game.audio.play('se_success', 0.5);
        if (score >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          setTimeout(function() { if (!done) genTarget(); }, 600);
        }
      } else {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        feedback = 'もっと近く！';
        feedbackTimer = 1.0;
        game.audio.play('se_failure', 0.4);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target color
    game.draw.rect(W / 2 - 220, H * 0.18, 200, 200, rgb(targetR, targetG, targetB), 0.95);
    game.draw.rect(W / 2 - 220, H * 0.18, 200, 200, '#fff', 0.08);
    game.draw.text('目標', W / 2 - 120, H * 0.175, { size: 36, color: C.ui });

    // Mix color
    game.draw.rect(W / 2 + 20, H * 0.18, 200, 200, rgb(mixR, mixG, mixB), 0.95);
    game.draw.rect(W / 2 + 20, H * 0.18, 200, 200, '#fff', 0.08);
    game.draw.text('現在', W / 2 + 120, H * 0.175, { size: 36, color: C.ui });

    // Distance bar
    var dist = colorDist();
    var match = Math.max(0, 1 - dist / 150);
    var barCol = match > 0.7 ? C.correct : match > 0.4 ? '#f59e0b' : C.wrong;
    game.draw.rect(W / 2 - 220, H * 0.42, 440, 20, C.ui, 0.4);
    game.draw.rect(W / 2 - 220, H * 0.42, 440 * match, 20, barCol, 0.9);
    game.draw.text(Math.round(match * 100) + '% 一致', W / 2, H * 0.46, { size: 40, color: barCol, bold: true });

    // Color buttons
    for (var i = 0; i < COLORS.length; i++) {
      var bx = BTN_ROW_X + i * (BTN_W + BTN_GAP);
      var col = COLORS[i];
      game.draw.rect(bx + 4, BTN_Y + 4, BTN_W - 8, BTN_H - 8, rgb(col.r, col.g, col.b), 0.9);
      game.draw.rect(bx + 4, BTN_Y + 4, BTN_W - 8, 16, '#fff', 0.2);
      game.draw.text(col.name, bx + BTN_W / 2, BTN_Y + BTN_H * 0.65 + 8, { size: 36, color: '#fff', bold: true });
    }

    // Reset button
    game.draw.rect(W / 2 - 80, H * 0.65, 160, 64, C.border, 0.8);
    game.draw.text('リセット', W / 2, H * 0.651 + 32, { size: 36, color: '#ccc' });

    // Submit
    game.draw.rect(W / 2 - 200, H * 0.88, 400, 100, match > 0.5 ? '#14532d' : '#4b1919', 0.9);
    game.draw.text('決定！', W / 2, H * 0.88 + 50, { size: 52, color: '#fff', bold: true });

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.55, { size: 60, color: match > 0.5 ? C.correct : C.wrong, bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + mi * 112, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    genTarget();
  });
})(game);
