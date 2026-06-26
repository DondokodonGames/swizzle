// 502-balance-scale.js
// バランス天秤 — 左右の天秤に重りを置いて釣り合わせる
// 操作: スワイプ左右で重りを左皿か右皿に投げ入れる
// 成功: 10回釣り合わせる  失敗: 5回傾きすぎ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050508',
    beam:   '#b45309',
    beamHi: '#d97706',
    plate:  '#1e293b',
    plateHi:'#334155',
    weight: '#f59e0b',
    weightHi:'#fde68a',
    pivot:  '#94a3b8',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    fall:   '#fbbf24'
  };

  var BEAM_W = 700;
  var BEAM_Y = H * 0.44;
  var PIVOT_X = W / 2;
  var PLATE_W = 220;
  var PLATE_H = 16;

  var tilt = 0;       // -1 = left heavy, +1 = right heavy
  var tiltAngle = 0;  // radians
  var leftSum = 0;
  var rightSum = 0;
  var fallingWeight = null; // {val, x, y, vy, side}
  var leftWeights = [];
  var rightWeights = [];
  var balanced = 0;
  var NEEDED = 10;
  var fails = 0;
  var MAX_FAIL = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.correct;
  var resultLife = 0;
  var nextWeight = 1;
  var maxWeight = 5;

  function genWeight() {
    return 1 + Math.floor(Math.random() * maxWeight);
  }

  function spawnWeight() {
    nextWeight = genWeight();
    fallingWeight = null;
  }

  function checkBalance() {
    var diff = Math.abs(leftSum - rightSum);
    if (diff === 0) return true;
    if (diff <= 1) return true; // within 1 unit is balanced
    return false;
  }

  function checkTilt() {
    // If tiltAngle exceeds threshold, fail
    return Math.abs(tiltAngle) > 0.45;
  }

  game.onSwipe(function(dir) {
    if (done || fallingWeight) return;
    var side = (dir === 'left') ? 'left' : (dir === 'right' ? 'right' : null);
    if (!side) return;
    // Launch weight
    var startX = W / 2;
    var startY = H * 0.2;
    fallingWeight = { val: nextWeight, x: startX, y: startY, vy: 200, side: side };
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (done || fallingWeight) return;
    var side = tx < W / 2 ? 'left' : 'right';
    var startX = W / 2;
    fallingWeight = { val: nextWeight, x: startX, y: H * 0.2, vy: 200, side: side };
    game.audio.play('se_tap', 0.3);
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

    if (resultLife > 0) resultLife -= dt * 2;

    // Update tilt
    var targetTilt = (leftSum - rightSum) * 0.05;
    targetTilt = Math.max(-0.5, Math.min(0.5, targetTilt));
    tiltAngle += (targetTilt - tiltAngle) * dt * 4;

    // Update falling weight
    if (fallingWeight) {
      fallingWeight.vy += 500 * dt;
      fallingWeight.y += fallingWeight.vy * dt;
      // Target plate Y
      var plateY = BEAM_Y + Math.sin(tiltAngle) * (fallingWeight.side === 'left' ? -BEAM_W / 2 : BEAM_W / 2) + 30;
      if (fallingWeight.y >= plateY) {
        // Landed
        fallingWeight.y = plateY;
        if (fallingWeight.side === 'left') {
          leftSum += fallingWeight.val;
          leftWeights.push({ val: fallingWeight.val, x: -100 + leftWeights.length * 30 });
        } else {
          rightSum += fallingWeight.val;
          rightWeights.push({ val: fallingWeight.val, x: 60 + rightWeights.length * 30 });
        }
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: PIVOT_X + (fallingWeight.side === 'left' ? -200 : 200), y: plateY, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100 - 80, life: 0.4, col: C.weightHi });
        }
        fallingWeight = null;

        if (checkBalance()) {
          balanced++;
          resultText = '釣り合った！';
          resultCol = C.correct;
          resultLife = 0.8;
          game.audio.play('se_success', 0.7);
          leftSum = 0; rightSum = 0;
          leftWeights = []; rightWeights = [];
          if (balanced >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(balanced * 400 + Math.ceil(timeLeft) * 100); }, 700);
          } else {
            if (balanced % 3 === 0 && maxWeight < 9) maxWeight++;
            setTimeout(function() { if (!done) spawnWeight(); }, 600);
          }
        } else if (checkTilt()) {
          fails++;
          resultText = '傾きすぎ！';
          resultCol = C.wrong;
          resultLife = 0.8;
          game.audio.play('se_failure', 0.5);
          leftSum = 0; rightSum = 0;
          leftWeights = []; rightWeights = [];
          tiltAngle = 0;
          if (fails >= MAX_FAIL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(function() { if (!done) spawnWeight(); }, 700);
          }
        } else {
          spawnWeight();
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Pivot post
    game.draw.rect(PIVOT_X - 10, BEAM_Y, 20, H * 0.35, C.pivot, 0.9);
    game.draw.circle(PIVOT_X, BEAM_Y, 22, C.pivot, 0.9);

    // Beam (tilted)
    var cosT = Math.cos(tiltAngle), sinT = Math.sin(tiltAngle);
    var lx = PIVOT_X - BEAM_W / 2 * cosT, ly = BEAM_Y - BEAM_W / 2 * sinT;
    var rx = PIVOT_X + BEAM_W / 2 * cosT, ry = BEAM_Y + BEAM_W / 2 * sinT;
    game.draw.line(lx, ly, rx, ry, C.beam, 18);
    game.draw.line(lx, ly, rx, ry, C.beamHi, 6);

    // Plates
    var plateLY = ly + 30;
    var plateRY = ry + 30;
    game.draw.rect(lx - PLATE_W / 2, plateLY, PLATE_W, PLATE_H, C.plate, 0.9);
    game.draw.rect(lx - PLATE_W / 2, plateLY, PLATE_W, 4, C.plateHi, 0.5);
    game.draw.rect(rx - PLATE_W / 2, plateRY, PLATE_W, PLATE_H, C.plate, 0.9);
    game.draw.rect(rx - PLATE_W / 2, plateRY, PLATE_W, 4, C.plateHi, 0.5);

    // Weights on plates
    for (var wi = 0; wi < leftWeights.length; wi++) {
      var w = leftWeights[wi];
      var wx2 = lx + w.x;
      var wy2 = plateLY - 36 - wi * 12;
      game.draw.circle(wx2, wy2, 22, C.weight, 0.9);
      game.draw.text(w.val + '', wx2, wy2 + 10, { size: 28, color: '#fff', bold: true });
    }
    for (var wi2 = 0; wi2 < rightWeights.length; wi2++) {
      var w2 = rightWeights[wi2];
      var wx3 = rx + w2.x - 60;
      var wy3 = plateRY - 36 - wi2 * 12;
      game.draw.circle(wx3, wy3, 22, C.weight, 0.9);
      game.draw.text(w2.val + '', wx3, wy3 + 10, { size: 28, color: '#fff', bold: true });
    }

    // Sum display on plates
    if (leftSum > 0) game.draw.text(leftSum + '', lx, plateLY + 60, { size: 44, color: C.fall, bold: true });
    if (rightSum > 0) game.draw.text(rightSum + '', rx, plateRY + 60, { size: 44, color: C.fall, bold: true });

    // Falling weight
    if (fallingWeight) {
      game.draw.circle(fallingWeight.x + (fallingWeight.side === 'left' ? -60 : 60), fallingWeight.y, 36, C.weight, 0.9);
      game.draw.text(fallingWeight.val + '', fallingWeight.x + (fallingWeight.side === 'left' ? -60 : 60), fallingWeight.y + 14, { size: 44, color: '#fff', bold: true });
    }

    // Next weight display
    if (!fallingWeight && !done) {
      game.draw.circle(W / 2, H * 0.2, 48, C.weight, 0.3);
      game.draw.circle(W / 2, H * 0.2, 38, C.weight, 0.8);
      game.draw.text(nextWeight + '', W / 2, H * 0.2 + 16, { size: 48, color: '#fff', bold: true });
      game.draw.text('← スワイプ →', W / 2, H * 0.27, { size: 36, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.86, { size: 60, color: resultCol, bold: true });
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 56 + fi * 112, H * 0.955, 20, fi < fails ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(balanced + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beamHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnWeight();
  });
})(game);
