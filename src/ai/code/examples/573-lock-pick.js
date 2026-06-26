// 573-lock-pick.js
// ロックピック — 鍵穴の内部構造をスワイプで探って開錠する
// 操作: スワイプで探針を動かし、手触りの違いでピンの位置を感じる
// 成功: 5個の錠前を開ける  失敗: 10回失敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0a0a',
    lock:    '#334444',
    lockHi:  '#446655',
    keyhole: '#001a00',
    pin:     '#888866',
    pinSet:  '#44ff88',
    pinReset:'#ff4444',
    probe:   '#ffcc44',
    probeHi: '#ffee88',
    text:    '#f1f5f9',
    ui:      '#374151',
    win:     '#22c55e',
    lose:    '#ef4444',
    spring:  '#556677'
  };

  var NUM_PINS = 5;
  var PIN_SPACING = 110;
  var PIN_START_X = (W - (NUM_PINS - 1) * PIN_SPACING) / 2;
  var KEYHOLE_Y = H * 0.4;
  var PIN_H = 120;
  var SET_ZONE = 20; // pixels from top where pin can be "set"

  var pins = []; // {x, y, target, set, wobble}
  var probe = { x: W / 2, y: KEYHOLE_Y };
  var openCount = 0;
  var NEEDED = 5;
  var fails = 0;
  var MAX_FAIL = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.win;
  var openAnim = 0;
  var currentLock = 0;
  var tension = 0; // 0-1, higher = more chance of reset

  function initLock() {
    pins = [];
    for (var i = 0; i < NUM_PINS; i++) {
      var target = PIN_H * 0.2 + Math.random() * PIN_H * 0.5;
      pins.push({
        x: PIN_START_X + i * PIN_SPACING,
        y: KEYHOLE_Y + PIN_H * 0.8,
        target: target, // distance from top of keyhole when "set"
        set: false,
        wobble: 0,
        springBack: 0
      });
    }
    probe.x = W / 2;
    probe.y = KEYHOLE_Y + PIN_H * 0.5;
    tension = 0;
  }

  function countSet() {
    var n = 0;
    for (var i = 0; i < pins.length; i++) {
      if (pins[i].set) n++;
    }
    return n;
  }

  function checkAllSet() {
    for (var i = 0; i < pins.length; i++) {
      if (!pins[i].set) return false;
    }
    return true;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || openAnim > 0) return;

    // Move probe up/down and interact with pins
    var dy = y2 - y1;
    probe.y = Math.max(KEYHOLE_Y, Math.min(KEYHOLE_Y + PIN_H, probe.y + dy * 0.5));

    // Interact with nearest pin
    var nearPin = null, nearDist = 80;
    for (var i = 0; i < pins.length; i++) {
      var d = Math.abs(probe.x - pins[i].x);
      if (d < nearDist) { nearDist = d; nearPin = pins[i]; }
    }

    if (nearPin && !nearPin.set) {
      // Push pin upward with probe
      nearPin.y = Math.max(KEYHOLE_Y + nearPin.target - SET_ZONE, Math.min(KEYHOLE_Y + PIN_H, probe.y + 20));
      nearPin.wobble = 0.3;

      // Check if pin is at setting position
      var distFromTarget = Math.abs(nearPin.y - (KEYHOLE_Y + nearPin.target));
      if (distFromTarget < SET_ZONE && dir === 'right') {
        nearPin.set = true;
        nearPin.wobble = 0.5;
        game.audio.play('se_success', 0.5);

        if (checkAllSet()) {
          openAnim = 1.0;
          openCount++;
          game.audio.play('se_success', 0.9);
          flashCol = C.win;
          flashAnim = 0.5;
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: KEYHOLE_Y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5, col: C.pinSet });
          }
          if (openCount >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(openCount * 800 + Math.ceil(timeLeft) * 80); }, 800);
          } else {
            setTimeout(function() { if (!done) initLock(); openAnim = 0; }, 1200);
          }
        }
      }
    }

    // Horizontal move changes which pin we're at
    probe.x = Math.max(PIN_START_X - 60, Math.min(PIN_START_X + (NUM_PINS - 1) * PIN_SPACING + 60, probe.x + (x2 - x1) * 0.6));

    // Too much tension causes reset
    tension += 0.05;
    if (tension > 0.8 && Math.random() < 0.2) {
      // Reset unset pins
      for (var ri = 0; ri < pins.length; ri++) {
        if (!pins[ri].set) {
          pins[ri].y = KEYHOLE_Y + PIN_H * 0.8;
          pins[ri].springBack = 0.4;
          pins[ri].set = false;
        }
      }
      fails++;
      flashCol = C.lose;
      flashAnim = 0.3;
      tension = 0;
      game.audio.play('se_failure', 0.3);
      if (fails >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap to test a pin (without swipe)
    for (var i = 0; i < pins.length; i++) {
      if (Math.abs(tx - pins[i].x) < 40 && !pins[i].set) {
        pins[i].y = Math.max(KEYHOLE_Y, pins[i].y - 30);
        pins[i].wobble = 0.2;
        game.audio.play('se_tap', 0.1);
        return;
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
    tension = Math.max(0, tension - dt * 0.1);

    // Spring unset pins back down
    for (var i = 0; i < pins.length; i++) {
      if (!pins[i].set) {
        var restY = KEYHOLE_Y + PIN_H * 0.8;
        pins[i].y += (restY - pins[i].y) * dt * 3;
      }
      if (pins[i].wobble > 0) pins[i].wobble -= dt * 4;
      if (pins[i].springBack > 0) pins[i].springBack -= dt * 3;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lock body
    game.draw.rect(W / 2 - 280, KEYHOLE_Y - 60, 560, PIN_H + 120, C.lock, 0.9);
    game.draw.rect(W / 2 - 280, KEYHOLE_Y - 60, 560, 16, C.lockHi, 0.6);

    // Keyhole cutout
    game.draw.rect(PIN_START_X - 70, KEYHOLE_Y - 4, (NUM_PINS - 1) * PIN_SPACING + 140, PIN_H + 8, C.keyhole, 0.95);
    game.draw.rect(PIN_START_X - 70, KEYHOLE_Y - 4, 6, PIN_H + 8, C.lockHi, 0.3);
    game.draw.rect(PIN_START_X - 70 + (NUM_PINS - 1) * PIN_SPACING + 134, KEYHOLE_Y - 4, 6, PIN_H + 8, C.lockHi, 0.3);

    // Pins
    for (var i2 = 0; i2 < pins.length; i2++) {
      var pin = pins[i2];
      var px = pin.x;
      var py = pin.y;
      var wobAmt = Math.sin(elapsed * 20 + i2) * pin.wobble * 8;
      var col = pin.set ? C.pinSet : (pin.springBack > 0 ? C.pinReset : C.pin);
      var alpha = pin.set ? 0.9 : 0.8;

      // Pin body
      game.draw.rect(px - 18 + wobAmt, KEYHOLE_Y, 36, py - KEYHOLE_Y, col, alpha);
      game.draw.rect(px - 18 + wobAmt, py - 8, 36, 24, col, alpha * 1.1);

      // Target zone marker
      game.draw.rect(px - 24, KEYHOLE_Y + pin.target - SET_ZONE, 48, SET_ZONE * 2, pin.set ? C.pinSet : '#334', 0.3);
      game.draw.line(px - 24, KEYHOLE_Y + pin.target, px + 24, KEYHOLE_Y + pin.target, pin.set ? C.pinSet : '#556', 3);

      // Spring below
      for (var si = 0; si < 4; si++) {
        var sy1 = KEYHOLE_Y + PIN_H - 30 + si * 10;
        var sy2 = sy1 + 8;
        game.draw.line(px - 12 + (si % 2) * 24, sy1, px + 12 - (si % 2) * 24, sy2, C.spring, 3);
      }
    }

    // Probe
    var probePulse = 1 + Math.sin(elapsed * 8) * 0.1;
    game.draw.circle(probe.x, probe.y, 20 * probePulse, C.probeHi, 0.3);
    game.draw.circle(probe.x, probe.y, 14 * probePulse, C.probe, 0.9);
    game.draw.line(probe.x, probe.y, probe.x, probe.y + 40, C.probe, 6);

    // Tension bar
    var tensionW = W * 0.6;
    var tensionX = (W - tensionW) / 2;
    var tensionY = KEYHOLE_Y + PIN_H + 60;
    game.draw.rect(tensionX, tensionY, tensionW, 20, C.ui, 0.4);
    game.draw.rect(tensionX, tensionY, tensionW * tension, 20, tension > 0.6 ? C.lose : C.probeHi, 0.8);
    game.draw.text('テンション', W / 2, tensionY + 52, { size: 30, color: tension > 0.6 ? C.lose : C.ui });

    // Set count
    var setCount = countSet();
    for (var si2 = 0; si2 < NUM_PINS; si2++) {
      game.draw.circle(W / 2 - (NUM_PINS - 1) * 40 + si2 * 80, tensionY + 110, 22, si2 < setCount ? C.pinSet : C.ui, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (openAnim > 0) {
      game.draw.rect(0, 0, W, H, C.win, openAnim * 0.12);
      game.draw.text('開錠!', W / 2, H / 2, { size: 100, color: C.win, bold: true });
    }

    if (flashAnim > 0 && openAnim <= 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 44 + fi * 88, H * 0.955, 18, fi < fails ? C.lose : C.ui, 0.9);
    }

    game.draw.text(openCount + ' / ' + NEEDED + ' 開錠', W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.lockHi : C.lose);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    initLock();
  });
})(game);
