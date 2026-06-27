// 794-signal-sort.js
// シグナルソート — 流れる信号を種類ごとに正しいレーンへ振り分けろ
// 操作: タップ左/右 — 中央に来た信号を左レーン(△)か右レーン(○)へ振り分ける
// 成功: 40個正解  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    lane:    '#0a1520',
    laneHi:  '#1e2d40',
    triangle:'#f97316',
    circle:  '#38bdf8',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050a10'
  };

  var signals = []; // { x, y, type: 'triangle'|'circle', speed }
  var spawnTimer = 0;
  var SPAWN_RATE = 1.4;
  var SIGNAL_SPEED = 420;
  var CENTER_X = W / 2;
  var CENTER_ZONE = 80; // within this x distance = in center

  var leftLane = H * 0.6;
  var rightLane = H * 0.6;
  var LANE_Y = H * 0.6;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var pendingSignal = null; // signal waiting for input in center

  function spawnSignal() {
    var type = Math.random() < 0.5 ? 'triangle' : 'circle';
    signals.push({ x: -80, y: LANE_Y, type: type, speed: SIGNAL_SPEED, answered: false, resultFlash: 0, correct: false });
  }

  function drawSignalShape(cx, cy, r, type, col, alpha) {
    if (type === 'circle') {
      game.draw.circle(cx, cy, r, col, alpha);
    } else {
      // Triangle approximation
      game.draw.circle(cx, cy - r * 0.5, r * 0.55, col, alpha);
      game.draw.circle(cx - r * 0.7, cy + r * 0.4, r * 0.5, col, alpha);
      game.draw.circle(cx + r * 0.7, cy + r * 0.4, r * 0.5, col, alpha);
      game.draw.circle(cx, cy + r * 0.1, r * 0.48, col, alpha);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find the signal currently in center zone
    var hitSignal = null;
    for (var i = 0; i < signals.length; i++) {
      var s = signals[i];
      if (s.answered) continue;
      if (Math.abs(s.x - CENTER_X) < CENTER_ZONE) {
        hitSignal = s;
        break;
      }
    }
    if (!hitSignal) return;

    hitSignal.answered = true;
    var tappedLeft = tx < W / 2;
    // Left = triangle, Right = circle
    var correct = (tappedLeft && hitSignal.type === 'triangle') || (!tappedLeft && hitSignal.type === 'circle');
    hitSignal.correct = correct;
    hitSignal.resultFlash = 0.5;

    if (correct) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.16;
      resultText = '正解！';
      resultTimer = 0.3;
      game.audio.play('se_tap', 0.07);
      // Particles in correct lane direction
      var destX = tappedLeft ? W * 0.2 : W * 0.8;
      for (var p = 0; p < 5; p++) {
        var pa = Math.atan2(LANE_Y - hitSignal.y, destX - hitSignal.x) + (Math.random() - 0.5) * 0.8;
        particles.push({ x: hitSignal.x, y: hitSignal.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.35, col: hitSignal.type === 'circle' ? C.circle : C.triangle });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 130); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = 'ミス！';
      resultTimer = 0.38;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    // Spawn
    spawnTimer -= dt;
    SPAWN_RATE = Math.max(0.7, 1.4 - score * 0.018);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = SPAWN_RATE;
      spawnSignal();
    }

    // Move signals left to right
    SIGNAL_SPEED = Math.min(700, 420 + score * 6);
    for (var si = signals.length - 1; si >= 0; si--) {
      var s = signals[si];
      s.x += s.speed * dt;
      if (s.resultFlash > 0) s.resultFlash -= dt * 3;

      // Check if signal passed center without answer
      if (!s.answered && s.x > CENTER_X + CENTER_ZONE + 20) {
        s.answered = true;
        s.correct = false;
        s.resultFlash = 0.4;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '逃した！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.28);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }

      // Remove if off screen
      if (s.x > W + 100) signals.splice(si, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lanes
    game.draw.rect(0, LANE_Y - 60, W, 120, C.lane, 0.9);
    game.draw.rect(0, LANE_Y - 60, W, 4, C.laneHi, 0.5);
    game.draw.rect(0, LANE_Y + 56, W, 4, C.laneHi, 0.3);

    // Center zone marker
    game.draw.rect(CENTER_X - CENTER_ZONE, LANE_Y - 64, CENTER_ZONE * 2, 128, '#0f2030', 0.6);
    game.draw.line(CENTER_X - CENTER_ZONE, LANE_Y - 64, CENTER_X - CENTER_ZONE, LANE_Y + 64, '#1e3d5a', 2);
    game.draw.line(CENTER_X + CENTER_ZONE, LANE_Y - 64, CENTER_X + CENTER_ZONE, LANE_Y + 64, '#1e3d5a', 2);

    // Left (triangle) label
    game.draw.rect(0, LANE_Y - 160, W * 0.45, 90, '#0a0e14', 0.9);
    drawSignalShape(W * 0.22, LANE_Y - 116, 32, 'triangle', C.triangle, 0.8);
    game.draw.text('さんかく', W * 0.22, LANE_Y - 55, { size: 30, color: C.triangle });
    game.draw.text('←', W * 0.12, LANE_Y - 110, { size: 52, color: C.triangle + 'aa', bold: true });

    // Right (circle) label
    game.draw.rect(W * 0.55, LANE_Y - 160, W * 0.45, 90, '#0a0e14', 0.9);
    drawSignalShape(W * 0.78, LANE_Y - 116, 32, 'circle', C.circle, 0.8);
    game.draw.text('まる', W * 0.78, LANE_Y - 55, { size: 30, color: C.circle });
    game.draw.text('→', W * 0.88, LANE_Y - 110, { size: 52, color: C.circle + 'aa', bold: true });

    // Signals
    for (var si2 = 0; si2 < signals.length; si2++) {
      var sig = signals[si2];
      var col2 = sig.type === 'circle' ? C.circle : C.triangle;
      var alpha = 0.9;
      if (sig.answered) {
        alpha = sig.resultFlash * 0.7;
        col2 = sig.correct ? C.correct : C.wrong;
      }
      if (alpha <= 0) continue;
      drawSignalShape(sig.x, sig.y, 44, sig.type, col2, alpha);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    // Tap hint
    game.draw.text('← △', W * 0.2, H * 0.85, { size: 44, color: C.triangle + '66', bold: true });
    game.draw.text('○ →', W * 0.8, H * 0.85, { size: 44, color: C.circle + '66', bold: true });
    game.draw.line(W / 2, H * 0.82, W / 2, H * 0.91, C.ui, 2);

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.25, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 44 + ei * 88, H * 0.955, 18, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnSignal();
  });
})(game);
