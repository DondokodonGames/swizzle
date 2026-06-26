// 486-color-blend.js
// 色調合 — 2色のペイントをスワイプで混ぜてターゲットの色を作る
// 操作: 左右スワイプで色のバランスを調整、上スワイプで確定
// 成功: 8色一致  失敗: 5ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0810',
    panel:  '#1a1028',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    white:  '#f8fafc',
    border: '#4b5563'
  };

  // Color mixing puzzles: color A + color B mix at ratio 0..1
  var MIXES = [
    { a: [255, 50, 50],   b: [50, 50, 255],  target: 0.5  },  // red+blue = purple
    { a: [255, 200, 0],   b: [255, 0, 0],    target: 0.3  },  // yellow mostly
    { a: [0, 180, 0],     b: [0, 0, 220],    target: 0.4  },  // green+blue = teal-ish
    { a: [255, 100, 0],   b: [255, 255, 0],  target: 0.6  },  // orange+yellow
    { a: [150, 0, 255],   b: [255, 0, 100],  target: 0.5  },  // purple+pink
    { a: [0, 220, 180],   b: [0, 100, 255],  target: 0.35 },  // cyan+blue
    { a: [255, 50, 150],  b: [255, 200, 50], target: 0.45 },  // pink+yellow
    { a: [50, 200, 255],  b: [100, 50, 255], target: 0.6  }   // sky+violet
  ];

  function lerp3(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function rgb(col) {
    return 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
  }

  var mixIdx = 0;
  var ratio = 0.5;
  var TOLERANCE = 0.10;
  var successes = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.correct;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var confirming = false;

  function getCurrentMix() { return MIXES[mixIdx % MIXES.length]; }
  function getTargetColor() {
    var m = getCurrentMix();
    return lerp3(m.a, m.b, m.target);
  }
  function getCurrentColor() {
    var m = getCurrentMix();
    return lerp3(m.a, m.b, ratio);
  }

  function confirm() {
    if (done || confirming) return;
    confirming = true;
    var m = getCurrentMix();
    var diff = Math.abs(ratio - m.target);
    if (diff <= TOLERANCE) {
      successes++;
      resultText = '一致！';
      resultCol = C.correct;
      flashCol = C.correct;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.7);
      var tc = getTargetColor();
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6, col: rgb(tc) });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(successes * 500 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
    } else {
      misses++;
      resultText = diff < 0.25 ? 'もう少し！' : '大きく外れ！';
      resultCol = C.wrong;
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    resultAnim = 1.0;
    setTimeout(function() {
      if (!done) {
        mixIdx++;
        ratio = 0.5;
        confirming = false;
      }
    }, 800);
  }

  game.onSwipe(function(dir) {
    if (done || confirming) return;
    if (dir === 'left') {
      ratio = Math.max(0, ratio - 0.1);
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'right') {
      ratio = Math.min(1, ratio + 0.1);
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'up') {
      confirm();
    }
  });

  game.onTap(function(tx, ty) {
    // Tap lower half = confirm
    if (done || confirming) return;
    if (ty > H * 0.75) {
      confirm();
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
    if (resultAnim > 0) resultAnim -= dt * 1.5;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(80, H * 0.12, W - 160, H * 0.8, C.panel, 0.7);

    var m = getCurrentMix();
    var targetCol = getTargetColor();
    var currentCol = getCurrentColor();

    // Target color swatch
    game.draw.text('目標色', W / 2, H * 0.2, { size: 44, color: C.text });
    game.draw.rect(W / 2 - 160, H * 0.24, 320, 160, rgb(targetCol), 1.0);
    game.draw.rect(W / 2 - 160, H * 0.24, 320, 160, C.border, 0.2);

    // Color A and B swatches
    game.draw.rect(120, H * 0.46, 200, 100, rgb(m.a), 0.9);
    game.draw.rect(W - 320, H * 0.46, 200, 100, rgb(m.b), 0.9);
    game.draw.text('A', 220, H * 0.51, { size: 48, color: '#fff', bold: true });
    game.draw.text('B', W - 220, H * 0.51, { size: 48, color: '#fff', bold: true });

    // Mix bar
    var barX = 100, barW = W - 200, barY = H * 0.62;
    game.draw.rect(barX, barY, barW, 40, rgb(m.a), 0.7);
    game.draw.rect(barX + barW * ratio, barY, barW * (1 - ratio), 40, rgb(m.b), 0.7);
    // Slider
    game.draw.circle(barX + barW * ratio, barY + 20, 30, C.white, 0.9);
    game.draw.circle(barX + barW * ratio, barY + 20, 20, rgb(currentCol), 1.0);

    // Target marker
    var targetX = barX + barW * m.target;
    game.draw.line(targetX, barY - 16, targetX, barY + 56, '#fff', 4);
    game.draw.circle(targetX, barY - 20, 10, '#fff', 0.8);

    // Current color preview
    game.draw.rect(W / 2 - 160, H * 0.72, 320, 120, rgb(currentCol), 1.0);
    game.draw.rect(W / 2 - 160, H * 0.72, 320, 120, C.border, 0.2);
    game.draw.text('現在の色', W / 2, H * 0.7, { size: 38, color: C.ui });

    // Instructions
    game.draw.text('← → でブレンド調整', W / 2, H * 0.87, { size: 36, color: C.ui });
    game.draw.text('↑ or 下タップで確定', W / 2, H * 0.92, { size: 36, color: C.ui });

    // Result feedback
    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.5, { size: 80, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratioT = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratioT, 72, ratioT > 0.3 ? rgb(currentCol) : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
