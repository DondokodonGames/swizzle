// 708-word-flash.js
// 一瞬読み — 一瞬表示された数字の合計を当てろ
// 操作: タップで正しい答えを選ぶ
// 成功: 20問正解  失敗: 6回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080f',
    flash:   '#f1f5f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    optA:    '#0f172a',
    optB:    '#1e293b',
    ui:      '#070c14',
    gold:    '#fbbf24'
  };

  var phase = 'show'; // 'show' | 'choose'
  var showTimer = 0;
  var SHOW_DUR = 0.9;
  var numbers = [];
  var sumAnswer = 0;
  var options = [];
  var correctOptIdx = 0;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var selectedIdx = -1;
  var waitTimer = 0;
  var choosing = false;

  function newRound() {
    // Generate 2-4 numbers to flash
    var count = 2 + Math.min(2, Math.floor(score / 5));
    var maxVal = 9 + Math.min(6, Math.floor(score / 3)) * 3; // increases over time
    numbers = [];
    sumAnswer = 0;
    for (var i = 0; i < count; i++) {
      var n = 1 + Math.floor(Math.random() * maxVal);
      numbers.push(n);
      sumAnswer += n;
    }

    // Generate 4 options: 1 correct, 3 wrong
    options = [sumAnswer];
    var offsets = [-2, -1, 1, 2, 3, -3, 4, -4, 5, -5];
    // Shuffle offsets
    for (var j = offsets.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = offsets[j]; offsets[j] = offsets[k]; offsets[k] = tmp;
    }
    for (var m = 0; m < 3; m++) {
      var wrong = sumAnswer + offsets[m];
      if (wrong <= 0) wrong = sumAnswer + Math.abs(offsets[m]) + 1;
      options.push(wrong);
    }
    // Shuffle options
    for (var n2 = options.length - 1; n2 > 0; n2--) {
      var p2 = Math.floor(Math.random() * (n2 + 1));
      var tmp2 = options[n2]; options[n2] = options[p2]; options[p2] = tmp2;
    }
    correctOptIdx = options.indexOf(sumAnswer);

    phase = 'show';
    showTimer = SHOW_DUR;
    selectedIdx = -1;
    choosing = false;
    waitTimer = 0;
  }

  var OPT_W = 440;
  var OPT_H = 200;
  var OPT_GAP = 24;
  var OPT_X0 = (W - OPT_W * 2 - OPT_GAP) / 2;
  var OPT_Y0 = H * 0.52;

  function optX(i) { return OPT_X0 + (i % 2) * (OPT_W + OPT_GAP); }
  function optY(i) { return OPT_Y0 + Math.floor(i / 2) * (OPT_H + OPT_GAP); }

  game.onTap(function(tx, ty) {
    if (done || !choosing || waitTimer > 0) return;
    for (var i = 0; i < options.length; i++) {
      if (tx >= optX(i) && tx <= optX(i) + OPT_W && ty >= optY(i) && ty <= optY(i) + OPT_H) {
        selectedIdx = i;
        choosing = false;
        if (i === correctOptIdx) {
          score++;
          flashCol = C.correct;
          flashAnim = 0.3;
          resultText = '正解！ (' + sumAnswer + ')';
          resultTimer = 0.6;
          game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: optX(i) + OPT_W / 2, y: optY(i) + OPT_H / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.correct });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
          } else {
            waitTimer = 0.7;
          }
        } else {
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.35;
          resultText = '不正解 (' + sumAnswer + ')';
          resultTimer = 0.7;
          game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            waitTimer = 0.8;
          }
        }
        break;
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
    if (resultTimer > 0) resultTimer -= dt;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        phase = 'choose';
        choosing = true;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    if (phase === 'show') {
      // Show numbers rapidly fading
      var ratio2 = showTimer / SHOW_DUR;
      // Display numbers spread across screen
      var cnt = numbers.length;
      for (var ni = 0; ni < cnt; ni++) {
        var nx = W * (ni + 1) / (cnt + 1);
        var ny = H * 0.3 + (Math.random() > 0.5 ? 1 : -1) * 40;
        game.draw.text(numbers[ni] + '', nx, ny, { size: 120 + ni * 20, color: C.flash, bold: true });
      }
      // Show "合計は？" fading in at end
      if (ratio2 < 0.4) {
        game.draw.text('合計は？', W / 2, H * 0.44, { size: 52, color: C.gold, bold: true });
      }
    } else {
      // Choose phase
      game.draw.text('合計は？', W / 2, H * 0.46, { size: 52, color: '#ffffff44', bold: true });

      for (var oi = 0; oi < options.length; oi++) {
        var ox = optX(oi);
        var oy = optY(oi);
        var isSelected = selectedIdx === oi;
        var isCorrect = oi === correctOptIdx;
        var bgCol;
        if (isSelected) {
          bgCol = isCorrect ? C.correct : C.wrong;
        } else if (!choosing && isCorrect && selectedIdx >= 0) {
          bgCol = C.correct;
        } else {
          bgCol = oi % 2 === 0 ? C.optA : C.optB;
        }
        game.draw.rect(ox + 3, oy + 3, OPT_W, OPT_H, '#000', 0.2);
        game.draw.rect(ox, oy, OPT_W, OPT_H, bgCol, 0.85);
        game.draw.text(options[oi] + '', ox + OPT_W / 2, oy + OPT_H / 2 + 22, { size: 80, color: C.text, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.92, { size: 52, color: flashCol, bold: true });
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 50 + ei * 100, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratioT = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratioT, 12, ratioT > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
