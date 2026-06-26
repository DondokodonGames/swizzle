// 514-time-bomb.js
// タイムボム — カウントダウン中の爆弾をタップで解除せよ（ワイヤーは毎回ランダム）
// 操作: 表示された順番でボタンをタップして爆弾を解除
// 成功: 5つの爆弾を解除  失敗: 1回でも爆発 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0000',
    bomb:     '#1a0000',
    bombRim:  '#7f1d1d',
    wire0:    '#ef4444',
    wire1:    '#3b82f6',
    wire2:    '#22c55e',
    wire3:    '#f59e0b',
    wire4:    '#a855f7',
    cutWire:  '#374151',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#374151',
    display:  '#22c55e',
    digit:    '#00ff41'
  };

  var WIRE_COLORS = [C.wire0, C.wire1, C.wire2, C.wire3, C.wire4];
  var WIRE_NAMES = ['赤', '青', '緑', '黄', '紫'];
  var WIRE_COUNT = 4;

  var bombs = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;

  var countdown = 10; // seconds per bomb
  var sequence = [];  // order to cut
  var cutIdx = 0;
  var cutWires = []; // which wires are cut already
  var bombTimer = 0;
  var wireOrder = []; // display order

  var BTN_W = 380, BTN_H = 100;
  var BTN_OX = (W - BTN_W) / 2;
  var BTN_OY = H * 0.52;
  var BTN_GAP = 24;

  function newBomb() {
    // Generate random wire order
    wireOrder = [0, 1, 2, 3].sort(function() { return Math.random() - 0.5; });
    // Random cut sequence (subset of wires)
    var seqLen = 2 + Math.floor(Math.random() * 3);
    sequence = [];
    var available = wireOrder.slice();
    for (var i = 0; i < seqLen && available.length > 0; i++) {
      var pick = Math.floor(Math.random() * available.length);
      sequence.push(available[pick]);
      available.splice(pick, 1);
    }
    cutIdx = 0;
    cutWires = [false, false, false, false];
    bombTimer = 10 + (5 - bombs);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which button was tapped
    for (var bi = 0; bi < WIRE_COUNT; bi++) {
      var bx = BTN_OX;
      var by = BTN_OY + bi * (BTN_H + BTN_GAP);
      if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) {
        var wireIdx = wireOrder[bi];
        if (cutWires[wireIdx]) return; // already cut

        if (wireIdx === sequence[cutIdx]) {
          // Correct!
          cutWires[wireIdx] = true;
          cutIdx++;
          game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: bx + BTN_W / 2, y: by + BTN_H / 2, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.35, col: WIRE_COLORS[wireIdx] });
          }
          if (cutIdx >= sequence.length) {
            // Bomb defused!
            bombs++;
            flashCol = C.correct;
            flashAnim = 0.5;
            game.audio.play('se_success', 0.8);
            if (bombs >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(bombs * 800 + Math.ceil(timeLeft) * 100); }, 700);
            } else {
              setTimeout(function() { if (!done) newBomb(); }, 600);
            }
          }
        } else {
          // Wrong wire — BOOM!
          flashCol = C.wrong;
          flashAnim = 0.8;
          game.audio.play('se_failure', 0.9);
          done = true;
          for (var pi2 = 0; pi2 < 20; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: H * 0.35, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300, life: 0.7, col: C.wrong });
          }
          setTimeout(function() { game.end.failure(); }, 700);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      bombTimer -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
      if (bombTimer <= 0) {
        // Timed out — BOOM!
        flashCol = C.wrong;
        flashAnim = 0.8;
        game.audio.play('se_failure', 0.9);
        done = true;
        for (var pi3 = 0; pi3 < 20; pi3++) {
          var ang3 = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.35, vx: Math.cos(ang3) * 300, vy: Math.sin(ang3) * 300, life: 0.7, col: C.wrong });
        }
        setTimeout(function() { game.end.failure(); }, 700);
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Bomb body
    game.draw.circle(W / 2, H * 0.29, 160, C.bombRim, 0.3);
    game.draw.circle(W / 2, H * 0.29, 148, C.bomb, 0.95);
    // Countdown display on bomb
    var secsLeft = Math.ceil(bombTimer);
    var urgency = bombTimer < 5 ? Math.sin(elapsed * 10) * 0.3 + 0.7 : 1.0;
    var timerCol = bombTimer < 5 ? C.wrong : C.digit;
    game.draw.rect(W / 2 - 100, H * 0.24, 200, 70, '#001a00', 0.95);
    game.draw.text(secsLeft + '', W / 2, H * 0.275, { size: 68, color: timerCol, bold: true });

    // Sequence display
    game.draw.text('切る順番:', W / 2, H * 0.45, { size: 36, color: C.ui });
    var seqStr = '';
    for (var si = 0; si < sequence.length; si++) {
      seqStr += (si < cutIdx ? '✓' : WIRE_NAMES[sequence[si]]);
      if (si < sequence.length - 1) seqStr += ' → ';
    }
    game.draw.text(seqStr, W / 2, H * 0.49, { size: 40, color: C.display, bold: true });

    // Wire buttons
    for (var bi2 = 0; bi2 < WIRE_COUNT; bi2++) {
      var bx2 = BTN_OX;
      var by2 = BTN_OY + bi2 * (BTN_H + BTN_GAP);
      var wireIdx2 = wireOrder[bi2];
      var isCut = cutWires[wireIdx2];
      var wCol = isCut ? C.cutWire : WIRE_COLORS[wireIdx2];
      game.draw.rect(bx2 + 4, by2 + 4, BTN_W - 8, BTN_H - 8, wCol, isCut ? 0.4 : 0.85);
      game.draw.rect(bx2 + 4, by2 + 4, BTN_W - 8, 10, '#fff', isCut ? 0.05 : 0.2);
      var label = isCut ? ('✓ ' + WIRE_NAMES[wireIdx2] + 'ワイヤー') : (WIRE_NAMES[wireIdx2] + 'ワイヤーを切る');
      game.draw.text(label, bx2 + BTN_W / 2, by2 + BTN_H / 2 + 16, { size: 40, color: isCut ? '#555' : '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.2);

    // Bomb counter
    for (var bci = 0; bci < NEEDED; bci++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 60 + bci * 120, H * 0.955, 22, bci < bombs ? C.correct : C.ui, 0.9);
    }

    game.draw.text(bombs + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wire0 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    newBomb();
  });
})(game);
