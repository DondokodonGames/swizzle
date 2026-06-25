// 034-safe-crack.js
// 金庫破り — コチコチ回る回転式ダイヤルを耳で感じる緊張感
// 操作: スワイプ右で時計回り、左で反時計回りに回す
// 成功: 3つの秘密の数字に順番に合わせる  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0804',
    safe:    '#1c1a14',
    safeHi:  '#292520',
    dial:    '#44403c',
    dialHi:  '#78716c',
    marker:  '#fbbf24',
    click:   '#22c55e',
    notch:   '#292524',
    ui:      '#78716c',
    locked:  '#ef4444',
    unlocked:'#22c55e'
  };

  var TOTAL_NOTCHES = 40;
  var dialPosition = 0;  // current notch (0..39)
  var rotating = false;
  var COMBO_COUNT = 3;
  var combo = [];         // target notch positions
  var solved = [];        // which combo positions are solved (in order)
  var currentTarget = 0;  // index into combo we're solving
  var timeLeft = 30;
  var done = false;
  var clickFlash = 0;
  var solvedFlash = 0;

  // Pendulum feedback when rotating
  var lastRotDir = 0;
  var rotInertia = 0;

  function generateCombo() {
    combo = [];
    while (combo.length < COMBO_COUNT) {
      var n = Math.floor(Math.random() * TOTAL_NOTCHES);
      if (combo.indexOf(n) === -1) combo.push(n);
    }
    solved = [];
    currentTarget = 0;
  }

  function tryRotate(dir) {
    // dir: +1 = clockwise, -1 = counter-clockwise
    var prev = dialPosition;
    dialPosition = (dialPosition + dir + TOTAL_NOTCHES) % TOTAL_NOTCHES;
    lastRotDir = dir;
    rotInertia = 0.15;
    game.audio.play('se_tap', 0.3);

    // Check if we hit the current target
    var target = combo[currentTarget];
    if (dialPosition === target) {
      // Also must approach from correct direction
      // R1: must approach clockwise (increasing), R2: counter, R3: clockwise
      var requiredDir = (currentTarget % 2 === 0) ? 1 : -1;
      if (dir === requiredDir) {
        clickFlash = 0.4;
        solved.push(dialPosition);
        currentTarget++;
        game.audio.play('se_tap', 0.9);
        if (currentTarget >= COMBO_COUNT) {
          solvedFlash = 1.0;
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(300 + Math.ceil(timeLeft) * 8);
          }, 600);
        }
      }
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'right') {
      for (var i = 0; i < 3; i++) tryRotate(1);
    } else if (dir === 'left') {
      for (var j = 0; j < 3; j++) tryRotate(-1);
    }
  });

  game.onTap(function(x, y) {
    // Single tap = advance 1 notch clockwise
    if (done) return;
    tryRotate(1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }
    if (clickFlash > 0) clickFlash -= dt;
    if (solvedFlash > 0) solvedFlash -= dt;
    if (rotInertia > 0) rotInertia -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Safe body
    var sw = 720, sh = 820;
    var sx = (W - sw) / 2, sy = H * 0.22;
    game.draw.rect(sx - 16, sy - 16, sw + 32, sh + 32, '#111009');
    game.draw.rect(sx, sy, sw, sh, C.safe);
    game.draw.rect(sx + 20, sy + 20, sw - 40, sh - 40, C.safeHi, 0.3);

    // Lock LED indicators
    for (var i = 0; i < COMBO_COUNT; i++) {
      var ledX = sx + 120 + i * 200;
      var ledY = sy + 60;
      var isSolved = i < solved.length;
      game.draw.circle(ledX, ledY, 32, isSolved ? C.unlocked : C.locked, 0.9);
      game.draw.circle(ledX, ledY, 20, isSolved ? '#86efac' : '#fca5a5', 0.5);
    }

    // Dial body (centered in safe)
    var dcx = W / 2, dcy = sy + sh * 0.5;
    var dialR = 220;

    // Outer ring
    game.draw.circle(dcx, dcy, dialR + 20, '#111009');
    game.draw.circle(dcx, dcy, dialR + 12, '#1c1a14');
    // Dial
    game.draw.circle(dcx, dcy, dialR, C.dial);
    game.draw.circle(dcx, dcy, dialR - 8, '#3d3a36');

    // Notches around dial
    for (var n = 0; n < TOTAL_NOTCHES; n++) {
      var angle = (n / TOTAL_NOTCHES) * Math.PI * 2 - Math.PI / 2;
      var rotated = (n - dialPosition + TOTAL_NOTCHES) % TOTAL_NOTCHES;
      // Actual screen angle
      var scrAngle = (rotated / TOTAL_NOTCHES) * Math.PI * 2 - Math.PI / 2;
      var nx = dcx + Math.cos(scrAngle) * (dialR - 24);
      var ny = dcy + Math.sin(scrAngle) * (dialR - 24);
      var isMajor = n % 5 === 0;
      var notchLen = isMajor ? 28 : 16;
      var ni = dcx + Math.cos(scrAngle) * (dialR - 24 - notchLen);
      var nj = dcy + Math.sin(scrAngle) * (dialR - 24 - notchLen);
      game.draw.line(ni, nj, nx, ny, isMajor ? C.dialHi : C.notch, isMajor ? 4 : 2);
      if (isMajor) {
        var numX = dcx + Math.cos(scrAngle) * (dialR - 60);
        var numY = dcy + Math.sin(scrAngle) * (dialR - 60);
        game.draw.text('' + n, numX, numY, { size: 28, color: '#57534e' });
      }
    }

    // Target marker (fixed at top = 12 o'clock)
    game.draw.rect(dcx - 6, dcy - dialR - 30, 12, 36, C.marker);
    // Marker arrow
    game.draw.rect(dcx - 16, dcy - dialR - 14, 32, 20, C.marker);

    // Dial center knob
    game.draw.circle(dcx, dcy, 60, '#111009');
    game.draw.circle(dcx, dcy, 48, C.dial);
    game.draw.circle(dcx, dcy, 30, C.dialHi, 0.6);

    // Current position display
    game.draw.text('' + dialPosition, dcx, dcy, { size: 64, color: '#fef3c7', bold: true });

    // Click flash (green glow)
    if (clickFlash > 0) {
      game.draw.circle(dcx, dcy, dialR + 30, C.click, clickFlash / 0.4 * 0.4);
    }
    // Solved flash
    if (solvedFlash > 0) {
      game.draw.rect(0, 0, W, H, C.unlocked, solvedFlash * 0.3);
    }

    // Target hint (for current step)
    if (!done) {
      var step = currentTarget;
      var tTarget = combo[step];
      var dirHint = (step % 2 === 0) ? '→ 時計回り' : '← 反時計回り';
      game.draw.text('目標: ' + tTarget + '  ' + dirHint, W / 2, sy - 40, {
        size: 44, color: C.marker, bold: true
      });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#0a0804');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#b45309' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('スワイプで回す！', W / 2, H - 220, { size: 52, color: C.ui });
    game.draw.text('目標の数字に合わせろ', W / 2, H - 155, { size: 40, color: '#44403c' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    generateCombo();
  });
})(game);
