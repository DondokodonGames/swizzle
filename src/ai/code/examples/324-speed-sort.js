// 324-speed-sort.js
// スピードソート — 落下するアイテムを左右の正しいボックスに振り分ける
// 操作: 左スワイプ=左ボックス、右スワイプ=右ボックス
// 成功: 30個正確に分類  失敗: 8個誤分類 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f1117',
    boxL:   '#1d4ed8',
    boxLHi: '#3b82f6',
    boxR:   '#b91c1c',
    boxRHi: '#ef4444',
    itemL:  '#60a5fa',
    itemR:  '#f87171',
    correct:'#22c55e',
    correctHi:'#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Items: type 0=blue(left box), type 1=red(right box)
  var ITEM_SYMBOLS = [['●', '■', '◆', '▲'], ['★', '♥', '♣', '♦']];
  var falling = null; // current falling item
  var sorted = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERRORS = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultGood = true;
  var boxFlashL = 0, boxFlashR = 0;
  var combo = 0;
  var speedMult = 1;

  function nextItem() {
    var type = Math.floor(Math.random() * 2);
    var sym = ITEM_SYMBOLS[type][Math.floor(Math.random() * 4)];
    falling = {
      x: W / 2 + (Math.random() - 0.5) * W * 0.4,
      y: H * 0.18,
      vy: 280 * speedMult,
      type: type,
      sym: sym,
      r: 60,
      deciding: false
    };
  }

  game.onSwipe(function(dir) {
    if (done || !falling || falling.deciding) return;
    var choice = (dir === 'left') ? 0 : 1; // 0=left box, 1=right box
    falling.deciding = true;

    var correct = (choice === falling.type);
    if (correct) {
      sorted++;
      combo++;
      speedMult = 1 + Math.min(1.0, sorted * 0.04);
      resultAnim = 0.5;
      resultGood = true;
      if (choice === 0) boxFlashL = 0.4; else boxFlashR = 0.4;
      game.audio.play('se_success', 0.5);
      var destX = choice === 0 ? W * 0.2 : W * 0.8;
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: falling.x, y: falling.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: falling.type === 0 ? C.itemL : C.itemR });
      }
      if (sorted >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(sorted * 100 + combo * 20 + Math.ceil(timeLeft) * 80); }, 400);
      }
    } else {
      errors++;
      combo = 0;
      resultAnim = 0.5;
      resultGood = false;
      game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERRORS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
    falling = null;
    setTimeout(function() { if (!done) nextItem(); }, 300);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;
    if (boxFlashL > 0) boxFlashL -= dt * 2;
    if (boxFlashR > 0) boxFlashR -= dt * 2;

    // Update falling item
    if (falling && !falling.deciding) {
      falling.y += falling.vy * dt;
      // If it falls too far without decision, count as error
      if (falling.y > H * 0.82) {
        errors++;
        combo = 0;
        game.audio.play('se_failure', 0.3);
        falling = null;
        if (errors >= MAX_ERRORS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        } else if (!done) {
          nextItem();
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Boxes
    var boxW = W * 0.35, boxH = 200;
    var boxY = H * 0.74;
    // Left box
    game.draw.rect(W * 0.05, boxY, boxW, boxH, C.boxL, 0.3 + boxFlashL * 0.5);
    game.draw.rect(W * 0.05, boxY, boxW, 12, C.boxLHi, 0.8);
    game.draw.text('← BLUE', W * 0.05 + boxW / 2, boxY + boxH / 2 + 14, { size: 40, color: C.boxLHi, bold: true });

    // Right box
    game.draw.rect(W * 0.60, boxY, boxW, boxH, C.boxR, 0.3 + boxFlashR * 0.5);
    game.draw.rect(W * 0.60, boxY, boxW, 12, C.boxRHi, 0.8);
    game.draw.text('RED →', W * 0.60 + boxW / 2, boxY + boxH / 2 + 14, { size: 40, color: C.boxRHi, bold: true });

    // Separator line
    game.draw.line(W / 2, H * 0.2, W / 2, boxY + boxH, C.ui, 3);

    // Falling item
    if (falling) {
      var col = falling.type === 0 ? C.itemL : C.itemR;
      game.draw.circle(falling.x, falling.y, falling.r + 10, col, 0.15);
      game.draw.circle(falling.x, falling.y, falling.r, col, 0.9);
      game.draw.text(falling.sym, falling.x, falling.y + 24, { size: 64, color: '#fff', bold: true });
    }

    // Result flash
    if (resultAnim > 0) {
      var rTxt = resultGood ? (combo > 3 ? combo + ' COMBO!' : '✓') : '✗';
      var rCol = resultGood ? C.correctHi : C.wrongHi;
      game.draw.text(rTxt, W / 2, H * 0.66, { size: resultGood && combo > 3 ? 52 : 72, color: rCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERRORS; ei++) {
      game.draw.circle(W / 2 - (MAX_ERRORS - 1) * 22 + ei * 44, H * 0.92, 14, ei < errors ? C.wrong : '#0f1117');
    }

    game.draw.text(sorted + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.boxLHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    nextItem();
  });
})(game);
