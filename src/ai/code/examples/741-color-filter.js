// 741-color-filter.js
// カラーフィルター — 浮かぶ泡の中から指定色だけを弾け。色は8回ごとに変わる
// 操作: タップで泡を弾く（指定色以外はミス）
// 成功: 40個成功  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060412',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0d0820'
  };

  var COLORS = [
    { name: 'あか', hex: '#ef4444', dark: '#7f1d1d' },
    { name: 'あお', hex: '#3b82f6', dark: '#1e3a8a' },
    { name: 'きいろ', hex: '#fbbf24', dark: '#78350f' },
    { name: 'みどり', hex: '#22c55e', dark: '#14532d' },
    { name: 'むらさき', hex: '#a855f7', dark: '#3b0764' }
  ];

  var targetIdx = 0;
  var bubbles = [];
  var spawnTimer = 0.5;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBubble() {
    var ci = Math.floor(Math.random() * COLORS.length);
    var r = 40 + Math.random() * 28;
    var bx = r + Math.random() * (W - r * 2);
    bubbles.push({
      x: bx, y: H + r + 20, r: r, ci: ci,
      vx: (Math.random() - 0.5) * 60,
      vy: -(80 + Math.random() * 70),
      wobble: Math.random() * Math.PI * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < (b.r + 12) * (b.r + 12)) {
        hit = true;
        if (b.ci === targetIdx) {
          bubbles.splice(i, 1);
          score++;
          flashCol = C.correct;
          flashAnim = 0.2;
          resultText = COLORS[targetIdx].name + '！';
          resultTimer = 0.3;
          game.audio.play('se_tap', 0.1);
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: COLORS[targetIdx].hex });
          }
          if (score % 8 === 0) {
            targetIdx = (targetIdx + 1) % COLORS.length;
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 100); }, 700);
          }
        } else {
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          resultText = 'ちがう！';
          resultTimer = 0.35;
          game.audio.play('se_failure', 0.25);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
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

    spawnTimer -= dt;
    var rate = Math.max(0.38, 0.55 - score * 0.003);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = rate;
      if (bubbles.length < 9) spawnBubble();
    }

    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      var b = bubbles[bi];
      b.wobble += dt * 2.5;
      b.x += (b.vx + Math.sin(b.wobble) * 18) * dt;
      b.y += b.vy * dt;
      if (b.y < -b.r - 40) bubbles.splice(bi, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var tgt = COLORS[targetIdx];

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target display
    var txb = W / 2, tyi = 280;
    game.draw.rect(txb - 200, tyi - 80, 400, 160, tgt.dark, 0.7);
    game.draw.circle(txb - 50, tyi, 52, tgt.hex, 0.9);
    game.draw.text(tgt.name, txb + 60, tyi + 18, { size: 56, color: tgt.hex, bold: true });
    game.draw.text('これを弾け！', txb, tyi - 48, { size: 30, color: C.text + '88' });

    // Remaining until color change
    var remain = 8 - (score % 8);
    game.draw.text('あと' + remain + '個で色チェンジ', W / 2, 480, { size: 32, color: C.text + '55' });

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b2 = bubbles[bi2];
      var col = COLORS[b2.ci];
      game.draw.circle(b2.x + 4, b2.y + 4, b2.r, '#000', 0.2);
      game.draw.circle(b2.x, b2.y, b2.r, col.hex, 0.85);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.35, b2.r * 0.25, '#fff', 0.4);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBubble();
    spawnBubble();
  });
})(game);
