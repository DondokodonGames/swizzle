// 656-bubble-sort.js
// バブルソート — バブルを昇順に並べ替えろ
// 操作: タップで隣接するバブルを交換
// 成功: 5セット完了  失敗: 20手超過 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020d18',
    bubble:  '#1e40af',
    bubbleHi:'#93c5fd',
    bubbleGl:'#bfdbfe',
    sel:     '#f59e0b',
    selHi:   '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05101e'
  };

  var NUM = 6;
  var BUBBLE_R = 76;
  var SPACING = W / (NUM + 1);
  var BUBBLE_Y = H * 0.5;

  var values = [];
  var bubbleX = [];
  var selected = -1;
  var swaps = 0;
  var MAX_SWAPS = 20;
  var sets = 0;
  var NEEDED_SETS = 5;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function BUBBLE_COLORS(n) {
    var colors = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'];
    return colors[(n - 1) % colors.length];
  }

  function genValues() {
    values = [];
    for (var i = 1; i <= NUM; i++) values.push(i);
    // Shuffle
    for (var j = values.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = values[j]; values[j] = values[k]; values[k] = tmp;
    }
    for (var b = 0; b < NUM; b++) {
      bubbleX[b] = (b + 1) * SPACING;
    }
    selected = -1;
    swaps = 0;
  }

  function checkSorted() {
    for (var i = 0; i < NUM - 1; i++) {
      if (values[i] > values[i + 1]) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which bubble was tapped
    var hitIdx = -1;
    for (var i = 0; i < NUM; i++) {
      var bx = bubbleX[i];
      var dx = tx - bx, dy = ty - BUBBLE_Y;
      if (Math.sqrt(dx * dx + dy * dy) < BUBBLE_R + 20) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) { selected = -1; return; }

    if (selected < 0) {
      selected = hitIdx;
      game.audio.play('se_tap', 0.1);
    } else if (selected === hitIdx) {
      selected = -1;
    } else if (Math.abs(selected - hitIdx) === 1) {
      // Swap adjacent
      var tmp2 = values[selected]; values[selected] = values[hitIdx]; values[hitIdx] = tmp2;
      swaps++;
      game.audio.play('se_tap', 0.2);
      for (var p = 0; p < 4; p++) {
        var pa = Math.random() * Math.PI * 2;
        var mx = (bubbleX[selected] + bubbleX[hitIdx]) / 2;
        particles.push({ x: mx, y: BUBBLE_Y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.35, col: C.bubbleHi });
      }
      selected = -1;

      if (checkSorted()) {
        sets++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = 'ソート完了！';
        resultTimer = 0.8;
        game.audio.play('se_success', 0.7);
        if (sets >= NEEDED_SETS && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(sets * 500 + Math.ceil(timeLeft) * 80); }, 800);
          return;
        }
        setTimeout(genValues, 700);
      } else if (swaps >= MAX_SWAPS) {
        done = true;
        flashCol = C.wrong;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.5);
        setTimeout(function() { game.end.failure(); }, 600);
      }
    } else {
      // Select new bubble
      selected = hitIdx;
      game.audio.play('se_tap', 0.1);
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
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target order display (top)
    game.draw.text('小 → 大', W / 2, H * 0.28, { size: 36, color: '#ffffff55' });
    for (var i = 0; i < NUM; i++) {
      var tx2 = (i + 1) * SPACING;
      game.draw.circle(tx2, H * 0.34, 28, BUBBLE_COLORS(i + 1), 0.4);
      game.draw.text((i + 1) + '', tx2, H * 0.34 + 10, { size: 28, color: '#ffffff88' });
    }

    // Connection lines
    for (var i2 = 0; i2 < NUM - 1; i2++) {
      game.draw.line(bubbleX[i2], BUBBLE_Y, bubbleX[i2 + 1], BUBBLE_Y, '#ffffff11', 2);
    }

    // Bubbles
    for (var bi = 0; bi < NUM; bi++) {
      var bx = bubbleX[bi];
      var val = values[bi];
      var isSel = bi === selected;
      var col = BUBBLE_COLORS(val);
      var sz = isSel ? BUBBLE_R + 12 : BUBBLE_R;
      var alpha = isSel ? 0.95 : 0.8;

      // Glow
      if (isSel) game.draw.circle(bx, BUBBLE_Y, sz + 20, col, 0.2);
      game.draw.circle(bx + 5, BUBBLE_Y + 5, sz, '#000', 0.3);
      game.draw.circle(bx, BUBBLE_Y, sz, col, alpha);
      game.draw.circle(bx - sz * 0.3, BUBBLE_Y - sz * 0.3, sz * 0.35, '#ffffff', alpha * 0.25);
      game.draw.text(val + '', bx, BUBBLE_Y + 14, { size: 60, color: '#fff', bold: true });

      // Selected border
      if (isSel) {
        game.draw.circle(bx, BUBBLE_Y, sz + 8, C.sel, 0.6);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.75, { size: 64, color: flashCol, bold: true });
    }
    game.draw.text('選択してタップで交換', W / 2, H * 0.65, { size: 32, color: '#ffffff55' });

    // Swap bar
    var swapRatio = Math.max(0, 1 - swaps / MAX_SWAPS);
    game.draw.rect(W / 2 - 200, H * 0.85, 400, 20, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.85, 400 * swapRatio, 20, swapRatio > 0.3 ? C.bubbleHi : C.wrong, 0.8);
    game.draw.text('残: ' + (MAX_SWAPS - swaps) + '手', W / 2, H * 0.85 + 40, { size: 32, color: C.text });

    game.draw.text(sets + ' / ' + NEEDED_SETS, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.bubbleHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    for (var b = 0; b < NUM; b++) bubbleX[b] = 0;
    genValues();
  });
})(game);
