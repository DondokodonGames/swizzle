// 734-shadow-dodge.js
// 影よけ — 画面を横切る影の中心を避けてタップせよ
// 操作: タップ — 影の外側の明るいゾーンに当てると成功
// 成功: 30回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#f1f5f9',
    shadow:  '#1e293b',
    light:   '#fde68a',
    safe:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#0f172a',
    ui:      '#cbd5e1'
  };

  // Shadow: a vertical band sweeping across
  var shadowX = -200;   // center of shadow
  var shadowW = 280;    // half-width of shadow
  var SHADOW_SPEED = 400;
  var shadowDir = 1;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  game.onTap(function(tx, ty) {
    if (done) return;
    var distFromShadow = Math.abs(tx - shadowX);
    var inShadow = distFromShadow < shadowW;
    if (!inShadow) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = '光の中！';
      resultTimer = 0.4;
      game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: tx, y: ty, vx: Math.cos(pa)*150, vy: Math.sin(pa)*150, life: 0.4, col: C.light });
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
      resultText = '影の中！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
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

    // Move shadow
    var spd = Math.min(700, SHADOW_SPEED + score * 8);
    shadowX += spd * shadowDir * dt;
    if (shadowX > W + shadowW) { shadowX = W + shadowW; shadowDir = -1; }
    if (shadowX < -shadowW)    { shadowX = -shadowW;    shadowDir =  1; }

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

    // Light rays (decorative lines)
    for (var lr = 0; lr < 8; lr++) {
      var lx = lr * (W / 7);
      game.draw.line(lx, 0, lx, H, C.light, 2);
    }

    // Shadow band (gradient approximated with multiple rects)
    for (var s = 0; s < 12; s++) {
      var sw = shadowW / 6;
      var sx = shadowX - shadowW + s * sw;
      var sAlpha = (s < 6) ? (s / 6) * 0.7 : ((12 - s) / 6) * 0.7;
      game.draw.rect(sx, 0, sw, H, C.shadow, sAlpha);
    }
    // Dark core
    game.draw.rect(shadowX - shadowW * 0.3, 0, shadowW * 0.6, H, C.shadow, 0.85);

    // "SAFE" zones hint
    var leftSafe = shadowX - shadowW > 80;
    var rightSafe = shadowX + shadowW < W - 80;
    if (leftSafe) {
      game.draw.rect(0, H * 0.42, shadowX - shadowW, H * 0.16, C.safe, 0.1);
    }
    if (rightSafe) {
      game.draw.rect(shadowX + shadowW, H * 0.42, W - (shadowX + shadowW), H * 0.16, C.safe, 0.1);
    }

    // Center instruction
    game.draw.text('影の外をタップ', W / 2, H * 0.20, { size: 44, color: C.text + 'aa', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 60, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, '#e2e8f0');
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: C.text, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    shadowX = W / 2;
  });
})(game);
