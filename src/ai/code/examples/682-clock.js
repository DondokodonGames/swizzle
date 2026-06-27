// 682-clock.js
// 時計止め — 加速する秒針がちょうど12時を指した瞬間にタップせよ
// 操作: タップで秒針を止める
// 成功: 10回成功（誤差10度以内）  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060a',
    face:    '#0d1117',
    faceRim: '#1e293b',
    hand:    '#f1f5f9',
    target:  '#22c55e',
    targetBg:'#052e16',
    zone:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0d14'
  };

  var CX = W / 2;
  var CY = H * 0.46;
  var RADIUS = 340;
  var TOLERANCE = 10; // degrees

  var angle = -Math.PI / 2; // start at 12
  var speed = 1.5; // radians per second
  var frozen = false;
  var frozenTimer = 0;
  var FREEZE_DUR = 0.9;

  var successes = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function normalizeAngle(a) {
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }

  function checkResult() {
    var target = -Math.PI / 2; // 12 o'clock
    var diff = Math.abs(normalizeAngle(angle - target)) * (180 / Math.PI);
    if (diff <= TOLERANCE) {
      successes++;
      flashCol = C.correct;
      flashAnim = 0.35;
      resultText = '正確！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.7);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY - RADIUS * 0.8, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.5, col: C.target });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(successes * 400 + Math.ceil(timeLeft) * 60); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      var offBy = Math.round(diff);
      resultText = offBy + '度ズレ！';
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.45);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || frozen) return;
    frozen = true;
    frozenTimer = FREEZE_DUR;
    checkResult();
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

    if (frozen) {
      frozenTimer -= dt;
      if (frozenTimer <= 0) {
        frozen = false;
        // Reset to random position away from 12
        var offset = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.5);
        angle = -Math.PI / 2 + offset;
        // Speed up after each success
        speed = 1.5 + successes * 0.3;
      }
    } else {
      angle += speed * dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Clock outer ring
    game.draw.circle(CX + 6, CY + 6, RADIUS + 24, '#000', 0.35);
    game.draw.circle(CX, CY, RADIUS + 24, C.faceRim, 0.9);
    game.draw.circle(CX, CY, RADIUS + 14, C.face, 0.95);

    // Target zone arc (green zone around 12)
    var tolRad = TOLERANCE * Math.PI / 180;
    for (var a = -tolRad; a <= tolRad; a += 0.06) {
      var ax = CX + Math.cos(-Math.PI / 2 + a) * (RADIUS + 4);
      var ay = CY + Math.sin(-Math.PI / 2 + a) * (RADIUS + 4);
      game.draw.circle(ax, ay, 18, C.target, 0.35);
    }

    // Tick marks
    for (var ti = 0; ti < 12; ti++) {
      var ta = -Math.PI / 2 + ti * (Math.PI / 6);
      var isHour = true;
      var tlen = 50;
      var x1 = CX + Math.cos(ta) * (RADIUS - tlen);
      var y1 = CY + Math.sin(ta) * (RADIUS - tlen);
      var x2 = CX + Math.cos(ta) * RADIUS;
      var y2 = CY + Math.sin(ta) * RADIUS;
      game.draw.line(x1, y1, x2, y2, '#334155', 10);
    }
    for (var ti2 = 0; ti2 < 60; ti2++) {
      if (ti2 % 5 === 0) continue;
      var ta2 = -Math.PI / 2 + ti2 * (Math.PI / 30);
      var x1b = CX + Math.cos(ta2) * (RADIUS - 20);
      var y1b = CY + Math.sin(ta2) * (RADIUS - 20);
      var x2b = CX + Math.cos(ta2) * RADIUS;
      var y2b = CY + Math.sin(ta2) * RADIUS;
      game.draw.line(x1b, y1b, x2b, y2b, '#1e293b', 4);
    }

    // 12 label
    game.draw.text('12', CX, CY - RADIUS + 80, { size: 56, color: C.target, bold: true });

    // Hour and minute indicators (static)
    // Hour hand (pointing at 3 for visual interest)
    var hx = CX + Math.cos(0) * RADIUS * 0.5;
    var hy = CY + Math.sin(0) * RADIUS * 0.5;
    game.draw.line(CX, CY, hx, hy, '#475569', 16);

    // Sweeping second hand
    var handAlpha = frozen ? 0.5 : 0.9;
    var hndX = CX + Math.cos(angle) * (RADIUS - 30);
    var hndY = CY + Math.sin(angle) * (RADIUS - 30);
    game.draw.line(CX, CY, hndX, hndY, frozen ? C.target : C.hand, 8);
    game.draw.circle(hndX, hndY, 22, frozen ? C.target : C.hand, handAlpha);
    game.draw.circle(CX, CY, 20, '#64748b', 0.9);

    // Frozen flash
    if (frozen && frozenTimer > FREEZE_DUR * 0.6) {
      game.draw.circle(CX, CY, RADIUS + 28, C.target, (frozenTimer / FREEZE_DUR) * 0.2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.86, { size: 60, color: flashCol, bold: true });
    }

    // Speed indicator
    var speedLabel = Math.round(speed * 10) / 10;
    game.draw.text('速度 ×' + speedLabel.toFixed(1), W / 2, H * 0.78, { size: 36, color: '#ffffff44' });
    game.draw.text('12時でタップ！', W / 2, H * 0.74, { size: 40, color: '#ffffff55' });

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 52 + ei * 104, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    var offset = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.5);
    angle = -Math.PI / 2 + offset;
  });
})(game);
