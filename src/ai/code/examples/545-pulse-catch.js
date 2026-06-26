// 545-pulse-catch.js
// パルスキャッチ — 拡大するリングがターゲット円と重なった瞬間にタップ
// 操作: タップで拡大中のリングをターゲットサイズで止める
// 成功: 20回キャッチ  失敗: 10回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050014',
    target:  '#ffffff',
    ring:    '#ff6600',
    ringHit: '#ffcc00',
    perfect: '#00ffcc',
    good:    '#44ff44',
    miss:    '#ff2244',
    text:    '#f1f5f9',
    ui:      '#334466',
    glow:    '#ff660033'
  };

  var CX = W / 2;
  var BASE_Y = H * 0.42;
  var TARGET_R_MIN = 80;
  var TARGET_R_MAX = 240;
  var RING_SPEED_MIN = 200; // px/sec
  var RING_SPEED_MAX = 600;
  var TOLERANCE_PERFECT = 18;
  var TOLERANCE_GOOD = 40;

  var targetR = 160;
  var ringR = 0;
  var ringSpeed = 280;
  var phase = 'expanding'; // 'expanding' | 'wait'
  var caught = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var resultText = '';
  var resultTimer = 0;
  var resultCol = C.good;
  var particles = [];
  var flashAnim = 0;
  var waitTimer = 0;
  var cx = CX;
  var cy = BASE_Y;

  function nextRound() {
    targetR = TARGET_R_MIN + Math.random() * (TARGET_R_MAX - TARGET_R_MIN);
    cx = W * 0.2 + Math.random() * W * 0.6;
    cy = H * 0.25 + Math.random() * H * 0.3;
    ringR = 0;
    ringSpeed = RING_SPEED_MIN + Math.random() * (RING_SPEED_MAX - RING_SPEED_MIN) + caught * 6;
    ringSpeed = Math.min(ringSpeed, RING_SPEED_MAX * 1.5);
    phase = 'expanding';
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase !== 'expanding') return;
    var diff = Math.abs(ringR - targetR);
    if (diff <= TOLERANCE_PERFECT) {
      // Perfect
      caught++;
      resultText = 'PERFECT!';
      resultCol = C.perfect;
      resultTimer = 0.7;
      flashAnim = 0.3;
      game.audio.play('se_success', 0.9);
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.perfect });
      }
    } else if (diff <= TOLERANCE_GOOD) {
      // Good
      caught++;
      resultText = 'GOOD!';
      resultCol = C.good;
      resultTimer = 0.6;
      flashAnim = 0.15;
      game.audio.play('se_success', 0.6);
      for (var pi2 = 0; pi2 < 8; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: cy, vx: Math.cos(ang2) * 160, vy: Math.sin(ang2) * 160, life: 0.4, col: C.good });
      }
    } else {
      // Miss
      misses++;
      resultText = 'MISS';
      resultCol = C.miss;
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    if (caught >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 100); }, 700);
      return;
    }
    phase = 'wait';
    waitTimer = 0.4;
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
    if (resultTimer > 0) resultTimer -= dt;

    if (phase === 'expanding') {
      ringR += ringSpeed * dt;
      if (ringR > targetR + TOLERANCE_GOOD * 2) {
        // Overshot — auto miss
        misses++;
        resultText = 'MISS';
        resultCol = C.miss;
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        phase = 'wait';
        waitTimer = 0.3;
      }
    } else if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0) nextRound();
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target ring
    game.draw.circle(cx, cy, targetR + 6, C.target, 0.08);
    game.draw.circle(cx, cy, targetR, C.target, 0.5);
    game.draw.circle(cx, cy, targetR - 6, C.target, 0.08);

    // Tolerance zones (visual hints)
    game.draw.circle(cx, cy, targetR + TOLERANCE_GOOD, C.good, 0.06);
    game.draw.circle(cx, cy, targetR + TOLERANCE_PERFECT, C.perfect, 0.1);
    game.draw.circle(cx, cy, Math.max(0, targetR - TOLERANCE_PERFECT), C.perfect, 0.08);

    // Center dot
    game.draw.circle(cx, cy, 12, C.target, 0.6);

    // Expanding ring
    if (phase === 'expanding' && ringR > 0) {
      var diff2 = Math.abs(ringR - targetR);
      var ringCol = diff2 <= TOLERANCE_PERFECT ? C.perfect : diff2 <= TOLERANCE_GOOD ? C.good : C.ring;
      game.draw.circle(cx, cy, ringR + 8, ringCol, 0.08);
      game.draw.circle(cx, cy, ringR, ringCol, 0.9);
      game.draw.circle(cx, cy, ringR - 6, ringCol, 0.08);
      if (diff2 <= TOLERANCE_PERFECT) {
        game.draw.circle(cx, cy, ringR + 18 + Math.sin(elapsed * 12) * 4, ringCol, 0.2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, resultCol, flashAnim * 0.1);

    // Result text
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, cy + targetR + 100, { size: 64, color: resultCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ring : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    nextRound();
  });
})(game);
