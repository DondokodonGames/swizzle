// 664-slalom.js
// スラローム — 旗門を旗の色でくぐり抜けろ
// 操作: タップ左半分で左へ、右半分で右へ移動
// 成功: 30門通過  失敗: 6回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a06',
    snow:    '#0d1a10',
    snowHi:  '#1a3320',
    skier:   '#f1f5f9',
    skierHi: '#cbd5e1',
    flagR:   '#ef4444',
    flagB:   '#3b82f6',
    flagY:   '#f59e0b',
    gate:    '#ffffff',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050a07'
  };

  var GATE_COLORS = [C.flagR, C.flagB, C.flagY];
  var LANE_X = [W * 0.25, W * 0.5, W * 0.75]; // left, center, right lanes

  var skierLane = 1; // 0=left, 1=center, 2=right
  var skierX = LANE_X[skierLane];
  var SKIER_Y = H * 0.72;
  var SKIER_R = 52;

  var gates = [];
  var GATE_Y = 0;
  var GATE_SPEED = 700;

  var passed = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 6;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var spawnTimer = 0;
  var SPAWN_RATE = 1.4;

  var lastGateColorIdx = -1;

  function spawnGate() {
    var colorIdx;
    do { colorIdx = Math.floor(Math.random() * GATE_COLORS.length); } while (colorIdx === lastGateColorIdx);
    lastGateColorIdx = colorIdx;
    // Gate spans two poles, player must go through the open lane
    var openLane = Math.floor(Math.random() * 3);
    gates.push({ y: -80, colorIdx: colorIdx, openLane: openLane, scored: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dir = tx < W / 2 ? -1 : 1;
    var newLane = Math.max(0, Math.min(2, skierLane + dir));
    if (newLane !== skierLane) {
      skierLane = newLane;
      game.audio.play('se_tap', 0.1);
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

    // Smooth skier X toward lane
    skierX += (LANE_X[skierLane] - skierX) * Math.min(1, dt * 14);

    // Spawn gates
    spawnTimer += dt;
    var rate = Math.max(0.7, SPAWN_RATE - elapsed * 0.01);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      spawnGate();
    }

    // Move gates down
    var spd = GATE_SPEED * (1 + elapsed * 0.01);
    for (var i = gates.length - 1; i >= 0; i--) {
      var g = gates[i];
      g.y += spd * dt;

      // Check if skier passes through gate
      if (!g.scored && g.y >= SKIER_Y - 60 && g.y <= SKIER_Y + 60) {
        g.scored = true;
        if (skierLane === g.openLane) {
          passed++;
          flashCol = C.correct;
          flashAnim = 0.25;
          resultText = '通過！';
          resultTimer = 0.4;
          game.audio.play('se_success', 0.45);
          for (var p = 0; p < 5; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: skierX, y: SKIER_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: GATE_COLORS[g.colorIdx] });
          }
          if (passed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(passed * 400 + Math.ceil(timeLeft) * 100); }, 700);
          }
        } else {
          misses++;
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultText = 'ミス！';
          resultTimer = 0.5;
          game.audio.play('se_failure', 0.35);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }

      if (g.y > H + 100) gates.splice(i, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.snow, 0.7);

    // Lane markers (speed lines)
    for (var li = 0; li < 3; li++) {
      game.draw.line(LANE_X[li], 0, LANE_X[li], H, '#ffffff', 1);
    }

    // Snow texture lines (scrolling)
    for (var si = 0; si < 12; si++) {
      var sy = ((elapsed * 400 + si * 160) % H);
      game.draw.line(0, sy, W, sy, C.snowHi, 2);
    }

    // Gates
    for (var gi = 0; gi < gates.length; gi++) {
      var gate = gates[gi];
      var col = GATE_COLORS[gate.colorIdx];
      // Draw poles for closed lanes
      for (var lane = 0; lane < 3; lane++) {
        if (lane !== gate.openLane) {
          game.draw.circle(LANE_X[lane], gate.y, 24, col, 0.9);
          game.draw.line(LANE_X[lane], gate.y - 60, LANE_X[lane], gate.y + 60, col, 6);
        } else {
          // Open lane: just small dots
          game.draw.circle(LANE_X[lane], gate.y, 10, '#ffffff', 0.3);
        }
      }
      // Horizontal bar between closed poles
      game.draw.line(0, gate.y, W, gate.y, col, 3);
    }

    // Skier
    game.draw.circle(skierX + 4, SKIER_Y + 4, SKIER_R, '#000', 0.3);
    game.draw.circle(skierX, SKIER_Y, SKIER_R, C.skier, 0.9);
    game.draw.circle(skierX - SKIER_R * 0.35, SKIER_Y - SKIER_R * 0.35, SKIER_R * 0.28, C.skierHi, 0.5);
    // Skis
    game.draw.line(skierX - 40, SKIER_Y + SKIER_R - 10, skierX - 40, SKIER_Y + SKIER_R + 40, C.flagB, 8);
    game.draw.line(skierX + 40, SKIER_Y + SKIER_R - 10, skierX + 40, SKIER_Y + SKIER_R + 40, C.flagB, 8);

    // Direction hints
    game.draw.text('◀', W * 0.18, H * 0.88, { size: 56, color: '#ffffff22' });
    game.draw.text('▶', W * 0.82, H * 0.88, { size: 56, color: '#ffffff22' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnGate();
  });
})(game);
