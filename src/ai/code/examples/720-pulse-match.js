// 720-pulse-match.js
// パルスマッチ — 脈動する光輪が目標サイズになった瞬間にタップせよ
// 操作: タップ — 光輪が目標ラインと重なったとき命中
// 成功: 15回命中  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020210',
    ring:     '#0ea5e9',
    ringGlow: '#7dd3fc',
    target:   '#f59e0b',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#040418'
  };

  var CX = W / 2;
  var CY = H * 0.40;
  var MIN_R = 80;
  var MAX_R = 310;
  var RANGE = MAX_R - MIN_R;
  var TOLERANCE = 24;

  var phase = 0;
  var SPEED = 2.0;
  var targetR = 200;

  var score = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var hitRing = 0;

  function curR() {
    return MIN_R + RANGE * (0.5 + 0.5 * Math.sin(phase));
  }

  function pickTarget() {
    var newR;
    var tries = 0;
    do {
      newR = MIN_R + 20 + Math.floor(Math.random() * (RANGE - 40));
      tries++;
    } while (Math.abs(newR - targetR) < 60 && tries < 20);
    targetR = newR;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var cr = curR();
    if (Math.abs(cr - targetR) <= TOLERANCE) {
      score++;
      hitRing = 0.45;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '命中！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.5);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX + Math.cos(pa) * cr, y: CY + Math.sin(pa) * cr,
          vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.5, col: C.target });
      }
      pickTarget();
      SPEED = Math.min(5.0, 2.0 + score * 0.18);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = cr > targetR ? '大きすぎ！' : '小さすぎ！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
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

    phase += SPEED * dt;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (hitRing > 0) hitRing -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var cr = curR();
    var diff = Math.abs(cr - targetR);
    var closeness = Math.max(0, 1 - diff / TOLERANCE);

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Progress bar
    var BAR_X0 = 100;
    var BAR_W = W - 200;
    var BAR_Y = H * 0.75;
    game.draw.rect(BAR_X0, BAR_Y - 8, BAR_W, 16, C.ui, 0.9);

    // Tolerance zone highlight on bar
    var targetBarX = BAR_X0 + (targetR - MIN_R) / RANGE * BAR_W;
    var tolBarW = TOLERANCE / RANGE * BAR_W;
    game.draw.rect(targetBarX - tolBarW, BAR_Y - 8, tolBarW * 2, 16, C.correct, 0.28);

    // Target marker
    game.draw.circle(targetBarX, BAR_Y, 22, C.target, 0.95);
    game.draw.text('目標', targetBarX, BAR_Y - 44, { size: 30, color: C.target });

    // Current marker
    var curBarX = BAR_X0 + (cr - MIN_R) / RANGE * BAR_W;
    game.draw.circle(curBarX, BAR_Y, 18, C.ring, 0.95);

    // Bar edge labels
    game.draw.text('小', BAR_X0, BAR_Y + 38, { size: 32, color: '#ffffff44' });
    game.draw.text('大', BAR_X0 + BAR_W, BAR_Y + 38, { size: 32, color: '#ffffff44' });

    // Target circle (amber boundary marker)
    game.draw.circle(CX, CY, targetR, C.target, 0.22);
    game.draw.circle(CX, CY, targetR + 6, C.target, 0.1);

    // Close glow
    if (closeness > 0) {
      game.draw.circle(CX, CY, cr, C.correct, closeness * 0.30);
    }

    // Hit expand ring
    if (hitRing > 0) {
      game.draw.circle(CX, CY, cr + (1 - hitRing) * 80, C.correct, hitRing * 0.35);
    }

    // Main pulsing ring (blue)
    game.draw.circle(CX, CY, cr + 10, C.ring, 0.13);
    game.draw.circle(CX, CY, cr, C.ringGlow, 0.80);
    game.draw.circle(CX, CY, cr - 10, C.ring, 0.13);

    // Center dot
    game.draw.circle(CX, CY, 10, C.ring, 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 56, color: flashCol, bold: true });
    }

    // Diff display (how far off)
    var diffRound = Math.round(diff);
    var diffCol = diffRound <= TOLERANCE ? C.correct : (diffRound <= TOLERANCE * 2 ? '#fbbf24' : C.wrong);
    game.draw.text(diffRound + '', W * 0.12, CY - 16, { size: 56, color: diffCol, bold: true });
    game.draw.text('px', W * 0.12, CY + 36, { size: 30, color: diffCol });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 48 + mi * 96, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    pickTarget();
  });
})(game);
