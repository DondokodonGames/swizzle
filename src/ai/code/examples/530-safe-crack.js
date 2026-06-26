// 530-safe-crack.js
// 金庫破り — ダイヤルを回して正しい数字で止める、3桁合わせて解錠
// 操作: 左スワイプで反時計回り、右スワイプで時計回り、タップで確定
// 成功: 3個の金庫を解錠  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0800',
    safe:    '#1c1a12',
    safeHi:  '#2e2b1a',
    dial:    '#8b7a3a',
    dialHi:  '#c9a84c',
    notch:   '#f5e09a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    digit:   '#fbbf24',
    text:    '#f1f5f9',
    ui:      '#4b3e1a',
    lock:    '#1a1208'
  };

  var DIAL_R = 220;
  var DIAL_X = W / 2;
  var DIAL_Y = H * 0.42;
  var NOTCH_COUNT = 40;
  var TARGET_DIGITS = [0, 0, 0]; // set in newSafe
  var currentDigit = 0; // which digit we're setting (0, 1, 2)
  var dialAngle = 0;    // current dial angle (0-360)
  var dialVel = 0;
  var locked = false;
  var safesOpened = 0;
  var NEEDED = 3;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var confirmedDigits = [];
  var openAnim = 0;
  var dialSpin = 0; // continuous spin tracking

  function angleToDigit(angle) {
    return Math.floor(((360 - (angle % 360 + 360) % 360) / 360) * 40) % 40;
  }

  function newSafe() {
    for (var i = 0; i < 3; i++) TARGET_DIGITS[i] = Math.floor(Math.random() * 40);
    currentDigit = 0;
    confirmedDigits = [];
    dialAngle = 0;
    dialVel = 0;
    openAnim = 0;
  }

  game.onSwipe(function(dir) {
    if (done || locked) return;
    if (dir === 'right') {
      dialVel += 60;
      game.audio.play('se_tap', 0.2);
    } else if (dir === 'left') {
      dialVel -= 60;
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (locked) return;

    // Confirm current digit
    var d = angleToDigit(dialAngle);
    var target = TARGET_DIGITS[currentDigit];

    // Allow ±1 tolerance
    var diff = Math.abs(d - target);
    var match = diff <= 1 || diff >= 39;

    if (match) {
      confirmedDigits.push({ digit: d, target: target });
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: DIAL_X, y: DIAL_Y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.correct });
      }
      currentDigit++;
      if (currentDigit >= 3) {
        // Unlocked!
        locked = true;
        openAnim = 1.0;
        flashCol = C.correct;
        flashAnim = 0.6;
        game.audio.play('se_success', 0.9);
        safesOpened++;
        if (safesOpened >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(safesOpened * 800 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) newSafe(); }, 1200);
        }
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (openAnim > 0) openAnim -= dt * 1.5;

    // Dial physics
    if (!locked) {
      dialAngle += dialVel * dt;
      dialVel *= 0.88;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Safe body
    game.draw.rect(W / 2 - 340, H * 0.1, 680, H * 0.78, C.safe, 0.95);
    game.draw.rect(W / 2 - 340, H * 0.1, 680, H * 0.78, C.safeHi, 0.05);
    // Safe door panel
    game.draw.rect(W / 2 - 300, H * 0.13, 600, H * 0.72, C.lock, 0.9);

    // Dial background
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 16, C.ui, 0.9);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 8, '#5a4a20', 0.9);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.dial, 0.9);

    // Notches on dial
    for (var ni = 0; ni < NOTCH_COUNT; ni++) {
      var na = (dialAngle + ni * 360 / NOTCH_COUNT) * Math.PI / 180;
      var nr = DIAL_R - 18;
      var nLen = ni % 8 === 0 ? 28 : 14;
      var nx1 = DIAL_X + Math.cos(na) * nr;
      var ny1 = DIAL_Y + Math.sin(na) * nr;
      var nx2 = DIAL_X + Math.cos(na) * (nr - nLen);
      var ny2 = DIAL_Y + Math.sin(na) * (nr - nLen);
      game.draw.line(nx1, ny1, nx2, ny2, ni % 8 === 0 ? C.notch : C.dialHi, ni % 8 === 0 ? 4 : 2);
      if (ni % 8 === 0) {
        game.draw.text(ni + '', DIAL_X + Math.cos(na) * (nr - 48), DIAL_Y + Math.sin(na) * (nr - 48) + 12, { size: 28, color: C.notch });
      }
    }

    // Center knob
    game.draw.circle(DIAL_X, DIAL_Y, 40, '#3a3020', 0.9);
    game.draw.circle(DIAL_X, DIAL_Y, 28, C.dialHi, 0.9);

    // Marker at top
    game.draw.rect(DIAL_X - 6, DIAL_Y - DIAL_R - 30, 12, 30, C.notch, 0.9);

    // Current digit readout
    var curD = angleToDigit(dialAngle);
    var nearTarget = Math.abs(curD - TARGET_DIGITS[currentDigit]) <= 1 || Math.abs(curD - TARGET_DIGITS[currentDigit]) >= 39;
    game.draw.text(curD + '', DIAL_X, DIAL_Y + 16, { size: 64, color: nearTarget ? C.correct : C.digit, bold: true });

    // Digit slots
    for (var di = 0; di < 3; di++) {
      var slotX = W / 2 - 120 + di * 120;
      var slotY = H * 0.75;
      var isConfirmed = di < confirmedDigits.length;
      var isCurrent = di === currentDigit;
      game.draw.rect(slotX - 44, slotY - 44, 88, 88, isConfirmed ? '#052010' : '#0a0800', 0.9);
      if (isConfirmed) {
        game.draw.text('✓', slotX, slotY + 16, { size: 52, color: C.correct, bold: true });
      } else if (isCurrent) {
        var pulse = 0.5 + Math.sin(elapsed * 5) * 0.3;
        game.draw.rect(slotX - 44, slotY - 44, 88, 88, C.digit, pulse * 0.15);
        game.draw.text(currentDigit + 1 + '', slotX, slotY + 16, { size: 40, color: C.digit });
      } else {
        game.draw.text('?', slotX, slotY + 16, { size: 48, color: C.ui });
      }
    }

    // Instruction
    game.draw.text('スワイプで回す · タップで確定', W / 2, H * 0.85, { size: 36, color: C.ui });

    // Open animation
    if (openAnim > 0) {
      game.draw.rect(W / 2 - 340, H * 0.1, 680 * openAnim, H * 0.78, C.correct, openAnim * 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + mi * 112, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(safesOpened + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dial : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    newSafe();
  });
})(game);
