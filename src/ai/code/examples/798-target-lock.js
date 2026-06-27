// 798-target-lock.js
// ターゲットロック — 移動する的にロックオンして正確にタップせよ
// 操作: タップ — 的の中心にロックオンマーカーが重なった瞬間
// 成功: 30回ロックオン  失敗: 10回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030508',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    lock:    '#22c55e',
    lockGlow:'#15803d',
    ring1:   '#38bdf8',
    ring2:   '#0ea5e9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040608'
  };

  var CX = W / 2;
  var CY = H / 2;

  // Target moves in Lissajous pattern
  var targetX = CX;
  var targetY = CY;
  var targetA = 0; // phase
  var TARGET_R = 40;
  var AMP_X = W * 0.3;
  var AMP_Y = H * 0.28;
  var FREQ_X = 0.8;
  var FREQ_Y = 1.2;

  // Lock marker moves independently (orbits center in ellipse)
  var lockAngle = 0;
  var LOCK_ORBIT_R = 160;
  var LOCK_SPEED = 1.5; // rad/sec
  var lockX = CX;
  var lockY = CY;
  var LOCK_R = 44;
  var LOCK_TOL = 55; // how close = locked on

  var onTarget = false;
  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.35;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var lockAnim = 0;

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    var dx = lockX - targetX;
    var dy = lockY - targetY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var locked = dist < LOCK_TOL;

    if (locked) {
      if (!answered) {
        answered = true;
        score++;
        lockAnim = 0.5;
        flashCol = C.correct;
        flashAnim = 0.2;
        resultText = 'ロック！';
        resultTimer = 0.38;
        game.audio.play('se_success', 0.65);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: targetX, y: targetY, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.lock });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 380 + Math.ceil(timeLeft) * 130); }, 700);
          return;
        }
        waitTimer = WAIT_DUR;
      }
    } else {
      if (!answered) {
        answered = true;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = 'ミス！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.3);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
        waitTimer = WAIT_DUR;
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
      if (waitTimer <= 0) answered = false;
    }

    // Target movement (Lissajous)
    var speed = 1 + Math.min(1.5, score * 0.05);
    targetA += dt * speed;
    targetX = CX + Math.sin(targetA * FREQ_X) * AMP_X;
    targetY = CY + Math.sin(targetA * FREQ_Y) * AMP_Y;

    // Lock marker movement (circular orbit, faster)
    LOCK_SPEED = Math.min(4.5, 1.5 + score * 0.1);
    lockAngle += LOCK_SPEED * dt;
    lockX = CX + Math.cos(lockAngle) * LOCK_ORBIT_R;
    lockY = CY + Math.sin(lockAngle) * LOCK_ORBIT_R * 0.65;

    // Check alignment
    var dx = lockX - targetX;
    var dy = lockY - targetY;
    onTarget = Math.sqrt(dx * dx + dy * dy) < LOCK_TOL;

    if (lockAnim > 0) lockAnim -= dt * 2.5;
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

    // Background grid (tactical display)
    for (var gi = 0; gi <= 8; gi++) {
      game.draw.line(gi * W / 8, 0, gi * W / 8, H, '#0a1520', 2);
      game.draw.line(0, gi * H / 8, W, gi * H / 8, '#0a1520', 2);
    }

    // Lock orbit path
    for (var oi = 0; oi < 36; oi++) {
      var oa = oi * Math.PI * 2 / 36;
      var ox = CX + Math.cos(oa) * LOCK_ORBIT_R;
      var oy = CY + Math.sin(oa) * LOCK_ORBIT_R * 0.65;
      game.draw.circle(ox, oy, 3, C.ring2, 0.25);
    }

    // Target
    game.draw.circle(targetX + 3, targetY + 3, TARGET_R + 4, '#000', 0.3);
    game.draw.circle(targetX, targetY, TARGET_R + 4, C.target, 0.15);
    game.draw.circle(targetX, targetY, TARGET_R, C.target, 0.9);
    game.draw.circle(targetX, targetY, TARGET_R * 0.55, C.targetHi, 0.5);
    game.draw.circle(targetX, targetY, TARGET_R * 0.2, '#fff', 0.8);
    // Crosshair
    game.draw.line(targetX - TARGET_R * 1.5, targetY, targetX - TARGET_R * 0.8, targetY, C.target, 2);
    game.draw.line(targetX + TARGET_R * 0.8, targetY, targetX + TARGET_R * 1.5, targetY, C.target, 2);
    game.draw.line(targetX, targetY - TARGET_R * 1.5, targetX, targetY - TARGET_R * 0.8, C.target, 2);
    game.draw.line(targetX, targetY + TARGET_R * 0.8, targetX, targetY + TARGET_R * 1.5, C.target, 2);

    // Lock marker
    var lockCol = onTarget ? C.lock : C.ring1;
    var lockGlowR = onTarget ? LOCK_R + 20 + lockAnim * 30 : LOCK_R + 5;
    game.draw.circle(lockX, lockY, lockGlowR, lockCol, onTarget ? 0.2 : 0.08);
    // Lock reticle (4 corner brackets)
    var lR = LOCK_R;
    var bLen = lR * 0.4;
    game.draw.line(lockX - lR, lockY - lR, lockX - lR + bLen, lockY - lR, lockCol, 4);
    game.draw.line(lockX - lR, lockY - lR, lockX - lR, lockY - lR + bLen, lockCol, 4);
    game.draw.line(lockX + lR - bLen, lockY - lR, lockX + lR, lockY - lR, lockCol, 4);
    game.draw.line(lockX + lR, lockY - lR, lockX + lR, lockY - lR + bLen, lockCol, 4);
    game.draw.line(lockX - lR, lockY + lR - bLen, lockX - lR, lockY + lR, lockCol, 4);
    game.draw.line(lockX - lR, lockY + lR, lockX - lR + bLen, lockY + lR, lockCol, 4);
    game.draw.line(lockX + lR - bLen, lockY + lR, lockX + lR, lockY + lR, lockCol, 4);
    game.draw.line(lockX + lR, lockY + lR - bLen, lockX + lR, lockY + lR, lockCol, 4);
    // Center dot
    game.draw.circle(lockX, lockY, 8, lockCol, onTarget ? 0.9 : 0.5);

    // Lock on indicator
    if (onTarget && !answered) {
      var pulse = 1 + 0.1 * Math.sin(elapsed * 20);
      game.draw.text('LOCK ON！', W / 2, H * 0.16, { size: Math.floor(60 * pulse), color: C.lock, bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (!done && !onTarget) {
      game.draw.text('ロックオンでタップ', W / 2, H * 0.88, { size: 36, color: C.text + '33' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.83, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 44 + ei * 88, H * 0.955, 18, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
