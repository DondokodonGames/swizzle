// 361-lock-pick.js
// ロックピック — ゆっくり回転する鍵穴の感触を掴んで鍵を開ける
// 操作: タップで「引っかかり」を感じた瞬間に止める
// 成功: 5つの鍵を開ける  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a08',
    lock:   '#44403c',
    lockHi: '#78716c',
    hole:   '#0f0f0a',
    pin:    '#d97706',
    pinHi:  '#fbbf24',
    pick:   '#e2e8f0',
    pickHi: '#f1f5f9',
    open:   '#22c55e',
    openHi: '#86efac',
    fail:   '#ef4444',
    tension:'#3b82f6',
    ui:     '#57534e',
    text:   '#fef3c7'
  };

  var lockAngle = 0;
  var pickAngle = 0;
  var ROTATE_SPEED = 1.2; // rad/sec
  var direction = 1;
  var pins = [];
  var NUM_PINS = 4;
  var currentPin = 0;
  var pinSet = false;
  var lockOpened = false;
  var openAnim = 0;

  var locks = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];
  var vibrate = 0;
  var feedbackText = '';
  var feedbackAnim = 0;
  var feedbackCol = C.open;

  function setupLock() {
    pins = [];
    for (var i = 0; i < NUM_PINS; i++) {
      var targetAngle = (Math.PI * 0.3 + i * 0.15) * (Math.random() < 0.5 ? 1 : -1);
      pins.push({
        target: targetAngle,
        window: 0.15 + Math.random() * 0.1,
        set: false
      });
    }
    currentPin = 0;
    lockAngle = -Math.PI;
    direction = 1;
    lockOpened = false;
    pinSet = false;
  }

  game.onTap(function() {
    if (done) return;
    if (lockOpened) return;

    var pin = pins[currentPin];
    var diff = Math.abs(lockAngle - pin.target);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

    if (diff < pin.window) {
      // Set pin!
      pin.set = true;
      currentPin++;
      vibrate = 0.2;
      game.audio.play('se_tap', 0.5);

      // Small particles
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life:0.4, col: C.pinHi });
      }

      if (currentPin >= NUM_PINS) {
        // Lock opened!
        lockOpened = true;
        openAnim = 1.0;
        locks++;
        game.audio.play('se_success', 0.8);
        for (var pi2 = 0; pi2 < 15; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(ang2)*250, vy: Math.sin(ang2)*250, life:0.7, col: C.openHi });
        }
        if (locks >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(locks * 600 + Math.ceil(timeLeft) * 100); }, 700);
          return;
        }
        setTimeout(function() { if (!done) setupLock(); }, 1200);
      }
    } else {
      // Missed — reset current pin progress
      feedbackText = 'ズレた！';
      feedbackCol = C.fail;
      feedbackAnim = 0.6;
      vibrate = 0.4;
      game.audio.play('se_failure', 0.3);
      // Partial reset - go back one pin
      if (currentPin > 0) {
        currentPin = Math.max(0, currentPin - 1);
        pins[currentPin].set = false;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackAnim > 0) feedbackAnim -= dt * 2;
    if (openAnim > 0) openAnim -= dt * 1.5;
    if (vibrate > 0) vibrate -= dt;

    if (!lockOpened) {
      // Oscillate lock
      lockAngle += direction * ROTATE_SPEED * dt;
      if (lockAngle > Math.PI * 1.2) direction = -1;
      if (lockAngle < -Math.PI * 1.2) direction = 1;

      // Near current pin target?
      if (currentPin < NUM_PINS) {
        var pin2 = pins[currentPin];
        var diff2 = Math.abs(lockAngle - pin2.target);
        while (diff2 > Math.PI) diff2 = Math.abs(diff2 - Math.PI * 2);
        if (diff2 < pin2.window * 1.5) {
          vibrate = Math.max(vibrate, 0.05);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    var vx = vibrate > 0 ? (Math.random() - 0.5) * 10 : 0;
    game.draw.rect(0, 0, W, H, C.bg);

    // Lock body
    var lx = W / 2 + vx;
    var ly = H * 0.45;
    game.draw.rect(lx - 140, ly - 120, 280, 240, C.lock, 0.9);
    game.draw.rect(lx - 140, ly - 120, 280, 240, C.lockHi, 0.15);
    // Lock shackle
    game.draw.line(lx - 60, ly - 120, lx - 60, ly - 220, C.lock, 24);
    game.draw.line(lx + 60, ly - 120, lx + 60, ly - 220, C.lock, 24);
    game.draw.circle(lx, ly - 220, 68, C.lock, 0.9);
    game.draw.circle(lx, ly - 220, 44, lockOpened ? C.open : C.hole, 0.9);

    // Keyhole
    game.draw.circle(lx, ly, 60, C.hole, 0.95);
    // Keyhole marker showing rotation
    var kx = lx + Math.cos(lockAngle) * 40;
    var ky = ly + Math.sin(lockAngle) * 40;
    game.draw.circle(kx, ky, 12, C.pick, 0.8);

    // Pins display
    for (var pi3 = 0; pi3 < NUM_PINS; pi3++) {
      var px2 = lx - (NUM_PINS - 1) * 24 + pi3 * 48;
      var py2 = ly + 80;
      var pset = pins[pi3] && pins[pi3].set;
      var isCurrent = pi3 === currentPin;
      game.draw.circle(px2, py2, 18, pset ? C.open : (isCurrent ? C.pin : C.lock), 0.9);
      if (isCurrent && !pset) {
        game.draw.circle(px2, py2, 24, C.pinHi, 0.2 + Math.sin(elapsed * 6) * 0.1);
      }
    }

    // Current pin window indicator (abstract)
    if (!lockOpened && currentPin < NUM_PINS) {
      var pin3 = pins[currentPin];
      // Show a tension gauge
      var nearTarget = 1 - Math.min(1, Math.abs(lockAngle - pin3.target) / (Math.PI * 0.5));
      var gaugeCol = nearTarget > 0.7 ? C.open : (nearTarget > 0.4 ? C.pin : C.tension);
      game.draw.text('テンション', lx, ly - 160, { size: 32, color: C.ui });
      game.draw.rect(lx - 100, ly - 140, 200, 20, '#1a1a1a', 0.9);
      game.draw.rect(lx - 100, ly - 140, 200 * nearTarget, 20, gaugeCol, 0.9);
      if (nearTarget > 0.75) {
        game.draw.text('今だ！', lx, ly - 180, { size: 44, color: C.pinHi, bold: true });
      }
    }

    if (openAnim > 0) {
      game.draw.text('解錠！', lx, ly + 160, { size: 72, color: C.openHi, bold: true });
    }

    if (feedbackAnim > 0) {
      game.draw.text(feedbackText, lx, ly + 160, { size: 52, color: feedbackCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(locks + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tension : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    setupLock();
  });
})(game);
