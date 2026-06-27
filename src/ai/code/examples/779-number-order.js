// 779-number-order.js
// ナンバーオーダー — 画面に散らばる数字を1から順にタップせよ
// 操作: タップ — 数字を昇順にタップ（1→2→3...）
// 成功: 20ラウンド完走  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06060e',
    numBg:   '#1e1b4b',
    numHi:   '#4f46e5',
    numNext: '#818cf8',
    numDone: '#334155',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0910'
  };

  var NUM_COUNT = 6;
  var NUM_R = 68;
  var numbers = [];
  var nextTarget = 1;
  var waitTimer = 0;
  var WAIT_DUR = 0.4;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newRound() {
    numbers = [];
    nextTarget = 1;
    NUM_COUNT = Math.min(9, 6 + Math.floor(score / 5));
    var attempts = 0;
    while (numbers.length < NUM_COUNT && attempts < 400) {
      attempts++;
      var nx = NUM_R * 1.4 + Math.random() * (W - NUM_R * 2.8);
      var ny = H * 0.22 + Math.random() * (H * 0.62);
      var ok = true;
      for (var i = 0; i < numbers.length; i++) {
        var dx = nx - numbers[i].x;
        var dy = ny - numbers[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < NUM_R * 2.2) { ok = false; break; }
      }
      if (ok) {
        numbers.push({ x: nx, y: ny, num: numbers.length + 1, tapped: false, bounce: 0, twinkle: Math.random() * Math.PI * 2 });
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0 || nextTarget > NUM_COUNT) return;
    var hitIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < numbers.length; i++) {
      if (numbers[i].tapped) continue;
      var dx = tx - numbers[i].x;
      var dy = ty - numbers[i].y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < NUM_R + 20 && dist < bestDist) {
        bestDist = dist;
        hitIdx = i;
      }
    }
    if (hitIdx < 0) return;

    var n = numbers[hitIdx];
    if (n.num === nextTarget) {
      n.tapped = true;
      n.bounce = 0.5;
      nextTarget++;
      game.audio.play('se_tap', 0.08);
      for (var p = 0; p < 4; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: n.x, y: n.y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.3, col: C.numNext });
      }
      if (nextTarget > NUM_COUNT) {
        // Round complete!
        score++;
        flashCol = C.correct;
        flashAnim = 0.22;
        resultText = '完了！';
        resultTimer = 0.42;
        game.audio.play('se_success', 0.65);
        waitTimer = WAIT_DUR;
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 120); }, 700);
        }
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = n.num + 'じゃない！' + nextTarget + 'を先に';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    }

    for (var i = 0; i < numbers.length; i++) {
      if (numbers[i].bounce > 0) numbers[i].bounce -= dt * 4;
      numbers[i].twinkle += dt * 2.5;
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Guide
    if (!waitTimer && !done) {
      game.draw.text('次: ' + nextTarget, W / 2, H * 0.20, { size: 52, color: C.numNext, bold: true });
    }

    // Numbers
    for (var i2 = 0; i2 < numbers.length; i2++) {
      var n2 = numbers[i2];
      var isNext = n2.num === nextTarget && !n2.tapped;
      var isTapped = n2.tapped;
      var sc2 = 1.0 + n2.bounce * 0.2;
      var r2 = NUM_R * sc2;

      if (isNext) {
        game.draw.circle(n2.x, n2.y, r2 + 20, C.numNext, 0.12 + 0.08 * Math.sin(elapsed * 6));
      }
      game.draw.circle(n2.x + 4, n2.y + 4, r2, '#000', 0.25);
      game.draw.circle(n2.x, n2.y, r2, isTapped ? C.numDone : (isNext ? C.numHi : C.numBg), 0.9);
      if (!isTapped) {
        game.draw.circle(n2.x, n2.y, r2 * 0.85, isNext ? C.numHi : C.numBg, 0.5);
      }
      var numSz = isTapped ? 48 : (isNext ? 68 : 60);
      game.draw.text('' + n2.num, n2.x, n2.y + 12, { size: numSz, color: isTapped ? '#4a5568' : C.text, bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 44, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
