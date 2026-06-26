// 345-stamp-rush.js
// スタンプラッシュ — 押されてくるスタンプから素早く手を引け
// 操作: タップで手を出す、判定直前に離す（ロングタップ）
// 成功: 20回スタンプ成功  失敗: 5回スタンプされる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#fef9c3',
    desk:   '#92400e',
    deskHi: '#b45309',
    stamp:  '#7c3aed',
    stampHi:'#a78bfa',
    ink:    '#4c1d95',
    hand:   '#fde68a',
    handHi: '#fef3c7',
    success:'#22c55e',
    successHi:'#86efac',
    fail:   '#ef4444',
    failHi: '#fca5a5',
    ui:     '#78716c',
    text:   '#1c1917'
  };

  var stampY = H * 0.2;
  var stampTargetY = H * 0.55;
  var stampCurrentY = stampY;
  var stampState = 'wait'; // wait, falling, rising, rest
  var stampTimer = 0;
  var FALL_TIME = 0.6;
  var HOLD_TIME = 0.25;
  var WAIT_MIN = 0.8;
  var WAIT_MAX = 2.0;

  var handY = H * 0.65;
  var handOut = false;
  var handTimer = 0;
  var MAX_HAND_TIME = 1.5;

  var stamped = 0;
  var NEEDED = 20;
  var smashed = 0;
  var MAX_SMASH = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.success;
  var resultAnim = 0;
  var inkMarks = [];
  var holding = false;

  function startNextStamp() {
    stampState = 'wait';
    stampCurrentY = stampY;
    stampTimer = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
  }

  game.onTap(function() {
    if (done) return;
    if (!handOut) {
      handOut = true;
      handTimer = 0;
      holding = true;
      game.audio.play('se_tap', 0.2);
    } else {
      // Withdraw hand
      handOut = false;
      holding = false;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    // Hand timer — auto withdraw after max time
    if (handOut) {
      handTimer += dt;
      if (handTimer > MAX_HAND_TIME) {
        handOut = false;
        holding = false;
      }
    }

    // Stamp state machine
    if (stampState === 'wait') {
      stampTimer -= dt;
      if (stampTimer <= 0) {
        stampState = 'falling';
        stampTimer = 0;
      }
    } else if (stampState === 'falling') {
      stampTimer += dt;
      var t = stampTimer / FALL_TIME;
      stampCurrentY = stampY + (stampTargetY - stampY) * Math.min(1, t * t * 2);
      if (stampTimer >= FALL_TIME) {
        stampState = 'hold';
        stampTimer = 0;
        stampCurrentY = stampTargetY;

        // Did hand get stamped?
        if (handOut) {
          smashed++;
          handOut = false;
          resultText = 'スタンプされた！';
          resultCol = C.failHi;
          resultAnim = 0.8;
          game.audio.play('se_failure', 0.6);
          inkMarks.push({ x: W / 2 + (Math.random()-0.5)*100, y: handY, life: 5.0 });
          if (smashed >= MAX_SMASH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
            return;
          }
        } else {
          // Hand already withdrawn before stamp — success!
          stamped++;
          resultText = 'セーフ！';
          resultCol = C.successHi;
          resultAnim = 0.7;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: handY, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life:0.6, col: C.successHi });
          }
          if (stamped >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(stamped * 200 + Math.ceil(timeLeft) * 80); }, 400);
            return;
          }
        }
      }
    } else if (stampState === 'hold') {
      stampTimer += dt;
      if (stampTimer >= HOLD_TIME) {
        stampState = 'rising';
        stampTimer = 0;
      }
    } else if (stampState === 'rising') {
      stampTimer += dt;
      var t2 = stampTimer / FALL_TIME;
      stampCurrentY = stampTargetY + (stampY - stampTargetY) * Math.min(1, t2);
      if (stampTimer >= FALL_TIME) {
        startNextStamp();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Desk surface
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.desk, 0.9);
    game.draw.rect(0, H * 0.62, W, 16, C.deskHi, 0.8);

    // Ink marks on desk
    for (var im = 0; im < inkMarks.length; im++) {
      var m = inkMarks[im];
      game.draw.circle(m.x, m.y, 60, C.ink, 0.5);
      game.draw.text('♦', m.x, m.y + 20, { size: 60, color: C.stampHi });
    }

    // Hand
    if (handOut) {
      game.draw.rect(W * 0.3, handY - 30, W * 0.4, 60, C.hand, 0.9);
      game.draw.rect(W * 0.3, handY - 30, W * 0.4, 60, C.handHi, 0.2);
      // Fingers
      for (var fi = 0; fi < 4; fi++) {
        game.draw.rect(W * 0.33 + fi * 90, handY - 60, 60, 40, C.hand, 0.9);
      }
    } else {
      // Hand withdrawn — show at bottom
      game.draw.rect(W * 0.3, H * 0.82, W * 0.4, 50, C.hand, 0.6);
    }

    // Stamp tool
    game.draw.rect(W * 0.35, stampCurrentY - 120, W * 0.3, 120, C.stamp, 0.9);
    game.draw.rect(W * 0.3, stampCurrentY, W * 0.4, 40, C.ink, 0.9);
    game.draw.text('★', W / 2, stampCurrentY + 24, { size: 36, color: C.stampHi });

    // Arrow showing timing
    if (stampState === 'wait') {
      var blink = Math.sin(elapsed * 6) > 0;
      if (blink) game.draw.text('▼', W / 2, H * 0.15, { size: 48, color: C.stamp });
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.75, { size: 60, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Smash dots
    for (var si = 0; si < MAX_SMASH; si++) {
      game.draw.circle(W / 2 - (MAX_SMASH - 1) * 28 + si * 56, H * 0.91, 16, si < smashed ? C.fail : C.bg);
    }

    game.draw.text(stamped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.stamp : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    startNextStamp();
  });
})(game);
