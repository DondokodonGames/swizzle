// 669-dial-lock.js
// ダイヤル解錠 — 3桁のダイヤルを正しい数字に合わせて解錠せよ
// 操作: タップでダイヤルを回す
// 成功: 10回解錠  失敗: 30回無駄タップ or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030308',
    panel:   '#0a0a14',
    dial:    '#1e293b',
    dialHi:  '#334155',
    active:  '#7c3aed',
    activeHi:'#a78bfa',
    target:  '#f59e0b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05050e'
  };

  var NUM_DIALS = 3;
  var DIAL_R = 120;
  var DIAL_X = [W * 0.22, W * 0.5, W * 0.78];
  var DIAL_Y = H * 0.52;

  var dials = [0, 0, 0]; // current values 0-9
  var targets = [0, 0, 0]; // target values
  var activeDial = 0; // which dial is "selected" for spinning

  var unlocked = 0;
  var NEEDED = 10;
  var taps = 0;
  var MAX_TAPS = 30;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var spinAnim = [0, 0, 0]; // spin animation timers

  function newTargets() {
    for (var i = 0; i < NUM_DIALS; i++) {
      targets[i] = Math.floor(Math.random() * 10);
    }
    taps = 0;
  }

  function checkUnlock() {
    for (var i = 0; i < NUM_DIALS; i++) {
      if (dials[i] !== targets[i]) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Tap on a dial to advance it by 1 (and select it as active)
    var hit = false;
    for (var i = 0; i < NUM_DIALS; i++) {
      var dx = tx - DIAL_X[i], dy = ty - DIAL_Y;
      if (dx * dx + dy * dy < (DIAL_R + 20) * (DIAL_R + 20)) {
        activeDial = i;
        dials[i] = (dials[i] + 1) % 10;
        spinAnim[i] = 0.2;
        taps++;
        game.audio.play('se_tap', 0.12);
        hit = true;
        break;
      }
    }
    if (!hit) return;

    if (checkUnlock()) {
      unlocked++;
      flashCol = C.correct;
      flashAnim = 0.4;
      resultText = '解錠！';
      resultTimer = 0.65;
      game.audio.play('se_success', 0.75);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: DIAL_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.activeHi });
      }
      if (unlocked >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(unlocked * 500 + Math.ceil(timeLeft) * 80); }, 800);
      } else {
        setTimeout(function() {
          newTargets();
          dials = [0, 0, 0];
          activeDial = 0;
        }, 700);
      }
    } else if (taps >= MAX_TAPS) {
      done = true;
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
      setTimeout(function() { game.end.failure(); }, 600);
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
    for (var si = 0; si < NUM_DIALS; si++) {
      if (spinAnim[si] > 0) spinAnim[si] -= dt * 5;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lock body
    game.draw.rect(W * 0.08, DIAL_Y - 180, W * 0.84, 360, C.panel, 0.9);
    game.draw.rect(W * 0.08, DIAL_Y - 180, W * 0.84, 12, C.dialHi, 0.5);

    // Target display at top
    game.draw.rect(W * 0.22, DIAL_Y - 260, W * 0.56, 90, C.dial, 0.8);
    game.draw.text('目標: ' + targets[0] + ' - ' + targets[1] + ' - ' + targets[2], W / 2, DIAL_Y - 210, { size: 48, color: C.target, bold: true });

    // Dials
    for (var di = 0; di < NUM_DIALS; di++) {
      var dx2 = DIAL_X[di];
      var isActive = di === activeDial;
      var spinOffset = spinAnim[di] * 30;
      var col = isActive ? C.active : C.dial;
      var colHi = isActive ? C.activeHi : C.dialHi;
      var isCorrect = dials[di] === targets[di];

      game.draw.circle(dx2 + 5, DIAL_Y + 5, DIAL_R, '#000', 0.35);
      game.draw.circle(dx2, DIAL_Y, DIAL_R, isCorrect ? C.correct : col, 0.85);
      game.draw.circle(dx2, DIAL_Y, DIAL_R * 0.75, C.bg, 0.6);
      game.draw.circle(dx2, DIAL_Y, DIAL_R * 0.75, col, 0.3);

      // Notch marks
      for (var ni = 0; ni < 10; ni++) {
        var na = (ni / 10) * Math.PI * 2 - Math.PI / 2;
        var nx = dx2 + Math.cos(na) * DIAL_R * 0.88;
        var ny = DIAL_Y + Math.sin(na) * DIAL_R * 0.88;
        game.draw.circle(nx, ny, 6, colHi, 0.5);
      }

      // Current value
      var displayY = DIAL_Y - spinOffset;
      game.draw.text(dials[di] + '', dx2, displayY + 14, { size: 72, color: isCorrect ? '#fff' : colHi, bold: true });

      if (isActive) {
        game.draw.circle(dx2, DIAL_Y, DIAL_R + 8, C.activeHi, 0.3);
      }
    }

    // Tap count bar
    var tapRatio = Math.max(0, 1 - taps / MAX_TAPS);
    game.draw.rect(W / 2 - 200, H * 0.74, 400, 18, C.ui, 0.8);
    game.draw.rect(W / 2 - 200, H * 0.74, 400 * tapRatio, 18, tapRatio > 0.3 ? C.active : C.wrong, 0.85);
    game.draw.text('残: ' + (MAX_TAPS - taps) + 'タップ', W / 2, H * 0.74 + 42, { size: 34, color: C.text });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 72, color: flashCol, bold: true });
    }

    game.draw.text(unlocked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.active : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newTargets();
  });
})(game);
