// 683-spinner.js
// ルーレット — 高速回転するホイールを狙った色で止めろ
// 操作: タップでホイールを止める
// 成功: 15回正確に止める  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var N = 6;
  var SLICE = Math.PI * 2 / N;
  var SEG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
  var SEG_NAMES = ['赤', 'オレンジ', '黄', '緑', '青', '紫'];
  var CX = W / 2;
  var CY = H * 0.46;
  var RADIUS = 360;

  var C = {
    bg:      '#030208',
    rim:     '#1e1b4b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#06050f'
  };

  var rot = 0;
  var angVel = 3.0;
  var spinning = true;
  var braking = false;
  var brakeTimer = 0;
  var BRAKE_DUR = 0.6;
  var brakeStart = 0;
  var target = 0;

  var successes = 0;
  var NEEDED = 15;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function getSegAtPointer(r) {
    // Pointer at top (-π/2). Segment i starts at rot + i*SLICE from 0.
    // At pointer: angle = -π/2. Segment containing pointer: idx where rot + idx*SLICE <= -π/2 < rot + (idx+1)*SLICE
    var idx = Math.floor((-Math.PI / 2 - r) / SLICE);
    return ((idx % N) + N) % N;
  }

  function nextRound() {
    target = Math.floor(Math.random() * N);
    spinning = true;
    braking = false;
    angVel = 3.0 + successes * 0.4;
    // Randomize starting rotation
    rot += 0.5 + Math.random() * 2;
  }

  function evaluate() {
    var seg = getSegAtPointer(rot);
    if (seg === target) {
      successes++;
      flashCol = C.correct;
      flashAnim = 0.35;
      resultText = SEG_NAMES[target] + ' 正解！';
      resultTimer = 0.7;
      game.audio.play('se_success', 0.7);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY - RADIUS * 0.85, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: SEG_COLORS[target] });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(successes * 400 + Math.ceil(timeLeft) * 60); }, 700);
      } else {
        setTimeout(nextRound, 900);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = SEG_NAMES[seg] + '！ハズレ！';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.5);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        setTimeout(nextRound, 900);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || !spinning || braking) return;
    braking = true;
    brakeStart = angVel;
    brakeTimer = BRAKE_DUR;
    spinning = false;
    game.audio.play('se_tap', 0.15);
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

    if (spinning) {
      rot += angVel * dt;
    } else if (braking) {
      brakeTimer -= dt;
      var t = 1 - Math.max(0, brakeTimer / BRAKE_DUR);
      angVel = brakeStart * (1 - t * t);
      rot += Math.max(0, angVel) * dt;
      if (brakeTimer <= 0) {
        braking = false;
        angVel = 0;
        evaluate();
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

    // Wheel outer shadow
    game.draw.circle(CX + 8, CY + 8, RADIUS + 20, '#000', 0.4);
    game.draw.circle(CX, CY, RADIUS + 20, C.rim, 0.9);

    // Draw wheel segments (approximate with lines)
    for (var si = 0; si < N; si++) {
      var startA = rot + si * SLICE;
      var endA = rot + (si + 1) * SLICE;
      var col = SEG_COLORS[si];
      // Fill segment by drawing many thin lines from center
      var steps = 24;
      for (var s = 0; s <= steps; s++) {
        var a = startA + (endA - startA) * s / steps;
        game.draw.line(CX, CY, CX + Math.cos(a) * RADIUS, CY + Math.sin(a) * RADIUS, col, RADIUS / steps * 2 + 4);
      }
      // Segment divider
      game.draw.line(CX, CY, CX + Math.cos(startA) * RADIUS, CY + Math.sin(startA) * RADIUS, '#000', 4);
      // Segment label
      var midA = rot + (si + 0.5) * SLICE;
      var lx = CX + Math.cos(midA) * RADIUS * 0.62;
      var ly = CY + Math.sin(midA) * RADIUS * 0.62;
      game.draw.text(SEG_NAMES[si], lx, ly + 14, { size: 34, color: '#fff', bold: true });
    }

    // Center cap
    game.draw.circle(CX, CY, 50, '#0f0f1a', 0.95);
    game.draw.circle(CX, CY, 30, '#1e293b', 0.9);

    // Pointer at top
    var px1 = CX, py1 = CY - RADIUS - 8;
    game.draw.circle(CX, CY - RADIUS - 10, 28, '#fff', 0.9);
    game.draw.line(CX - 28, CY - RADIUS - 10, CX + 28, CY - RADIUS - 10, '#fff', 6);
    game.draw.line(CX, CY - RADIUS - 10, CX, CY - RADIUS + 20, '#fff', 10);

    // Target display
    var targetY = H * 0.82;
    game.draw.text('狙う色：', W / 2, targetY - 60, { size: 36, color: '#ffffff66' });
    game.draw.circle(W / 2, targetY, 56, SEG_COLORS[target], 0.9);
    game.draw.text(SEG_NAMES[target], W / 2, targetY + 16, { size: 32, color: '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.92, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 52 + ei * 104, H * 0.965, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    target = Math.floor(Math.random() * N);
    rot = Math.random() * Math.PI * 2;
  });
})(game);
