// 459-number-sprint.js
// 数字スプリント — 画面に散らばる数字を1から順に素早くタップ
// 操作: タップで数字を順番に消す（1→2→3→…）
// 成功: 1-25を3秒以内に完走  失敗: 時間オーバー3回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020812',
    numBg:  '#0f2040',
    numBgHi:'#1a3060',
    numNext:'#1e4080',
    numOk:  '#0d3020',
    numTxt: '#e2e8f0',
    numHi:  '#fbbf24',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    trail:  '#3b82f6'
  };

  var N = 25;
  var NUM_R = 60;
  var positions = [];
  var states = [];  // 0=waiting, 1=found, 2=done
  var nextNum = 1;
  var roundTime = 0;
  var ROUND_LIMIT = 5;
  var particles = [];
  var rounds = 0;
  var NEEDED = 3;
  var failures = 0;
  var MAX_FAIL = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var bestTime = 999;

  function scramble() {
    positions = [];
    states = [];
    // Place numbers avoiding overlap
    var margin = NUM_R + 20;
    for (var i = 0; i < N; i++) {
      var tries = 0;
      var x, y, ok;
      do {
        x = margin + Math.random() * (W - margin * 2);
        y = 160 + margin + Math.random() * (H * 0.78 - margin * 2);
        ok = true;
        for (var j = 0; j < positions.length; j++) {
          var dx = x - positions[j].x;
          var dy = y - positions[j].y;
          if (Math.sqrt(dx*dx + dy*dy) < NUM_R * 2.2) { ok = false; break; }
        }
        tries++;
      } while (!ok && tries < 40);
      positions.push({ x: x, y: y });
      states.push(0);
    }
    nextNum = 1;
    roundTime = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped number
    for (var i = 0; i < N; i++) {
      if (states[i] !== 0) continue;
      var dx = tx - positions[i].x;
      var dy = ty - positions[i].y;
      if (Math.sqrt(dx*dx + dy*dy) < NUM_R + 15) {
        if (i + 1 === nextNum) {
          // Correct!
          states[i] = 1;
          nextNum++;
          game.audio.play('se_tap', 0.3);
          for (var pi = 0; pi < 5; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: positions[i].x, y: positions[i].y, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life: 0.4, col: C.numHi });
          }
          if (nextNum > N) {
            // Round complete!
            rounds++;
            if (roundTime < bestTime) bestTime = roundTime;
            game.audio.play('se_success', 0.7);
            flashCol = C.correct;
            flashAnim = 0.8;
            for (var pi2 = 0; pi2 < 16; pi2++) {
              var ang2 = Math.random() * Math.PI * 2;
              particles.push({ x: W/2, y: H/2, vx: Math.cos(ang2)*220, vy: Math.sin(ang2)*220, life: 0.7, col: C.numHi });
            }
            if (rounds >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(rounds * 500 + Math.ceil(bestTime * 100) + Math.ceil(timeLeft) * 80); }, 700);
              return;
            }
            setTimeout(function() { scramble(); }, 1000);
          }
        } else {
          // Wrong number
          game.audio.play('se_failure', 0.3);
          flashCol = C.wrong;
          flashAnim = 0.3;
        }
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
    roundTime += dt;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Numbers
    for (var i2 = 0; i2 < N; i2++) {
      var p2 = positions[i2];
      var st = states[i2];
      if (st === 1) {
        // Completed - fade
        game.draw.circle(p2.x, p2.y, NUM_R, C.numOk, 0.4);
        game.draw.text((i2+1) + '', p2.x, p2.y + 20, { size: 48, color: C.ui });
        continue;
      }
      var isNext = (i2 + 1 === nextNum);
      var bgCol = isNext ? C.numNext : C.numBg;
      var txtCol = isNext ? C.numHi : C.numTxt;
      // Pulse for next
      var pulse = isNext ? (Math.sin(elapsed * 8) * 0.2 + 1.0) : 1.0;
      game.draw.circle(p2.x, p2.y, NUM_R * pulse * 1.1, isNext ? C.numHi : C.numBgHi, 0.1);
      game.draw.circle(p2.x, p2.y, NUM_R * pulse, bgCol, 0.9);
      game.draw.text((i2+1) + '', p2.x, p2.y + 20, { size: 56, color: txtCol, bold: isNext });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Progress
    game.draw.text(nextNum + ' / ' + N, W/2, H * 0.89, { size: 42, color: C.text });
    // Round timer
    var tCol = roundTime > ROUND_LIMIT * 0.8 ? C.wrong : C.ui;
    game.draw.text(roundTime.toFixed(1) + 's', W/2, H * 0.93, { size: 40, color: tCol });
    if (bestTime < 999) {
      game.draw.text('ベスト: ' + bestTime.toFixed(1) + 's', W * 0.8, H * 0.93, { size: 30, color: C.numHi });
    }

    game.draw.text(rounds + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.trail : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    scramble();
  });
})(game);
