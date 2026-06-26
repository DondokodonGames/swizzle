// 351-wire-tap.js
// ワイヤータップ — 電流が流れる前に正しい順番でスイッチを切る
// 操作: タップでスイッチをOFF（順番を間違えると爆発）
// 成功: 5回回路を切断  失敗: 3回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    wire:   '#1e3a5f',
    wireHi: '#2563eb',
    wireHot:'#ef4444',
    wireOff:'#374151',
    switch: '#22c55e',
    switchHi:'#86efac',
    switchOff:'#1f2937',
    sparks: '#fbbf24',
    current:'#60a5fa',
    bomb:   '#ef4444',
    bombHi: '#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var NUM_SWITCHES = 4;
  var switches = [];
  var correctOrder = [];
  var playerOrder = [];
  var currentProgress = 0; // which switch the current flows through

  var phase = 'show'; // show, play, explode, success
  var showTimer = 2.0;
  var currentX = -60;
  var CURRENT_SPEED = 300;
  var attempts = 0;
  var NEEDED = 5;
  var fails = 0;
  var MAX_FAILS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.switchHi;

  function setupRound() {
    switches = [];
    correctOrder = [];
    playerOrder = [];
    currentProgress = 0;

    var sw_y = [H * 0.35, H * 0.45, H * 0.55, H * 0.65];
    var indices = [0, 1, 2, 3];
    // Shuffle correct order
    for (var i = indices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }
    correctOrder = indices.slice();

    for (var s = 0; s < NUM_SWITCHES; s++) {
      switches.push({
        x: W * 0.5,
        y: sw_y[s],
        on: true,
        num: correctOrder.indexOf(s) + 1 // display order number
      });
    }

    phase = 'show';
    showTimer = 2.5;
    currentX = -60;
  }

  function startPlay() {
    phase = 'play';
    currentX = -60;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase !== 'play') return;

    // Find tapped switch
    for (var i = 0; i < switches.length; i++) {
      var sw = switches[i];
      if (!sw.on) continue;
      if (Math.hypot(tx - sw.x, ty - sw.y) < 70) {
        // Is this the correct next switch?
        var expectedSwIdx = correctOrder[playerOrder.length];
        if (i === expectedSwIdx) {
          // Correct!
          sw.on = false;
          playerOrder.push(i);
          game.audio.play('se_tap', 0.4);
          if (playerOrder.length === NUM_SWITCHES) {
            // All done!
            phase = 'success';
            attempts++;
            resultText = '切断成功！';
            resultCol = C.switchHi;
            resultAnim = 0.8;
            game.audio.play('se_success', 0.7);
            for (var pi = 0; pi < 10; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang)*220, vy: Math.sin(ang)*220, life:0.7, col: C.switchHi });
            }
            if (attempts >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(attempts * 400 + Math.ceil(timeLeft) * 80); }, 600);
              return;
            }
            setTimeout(function() { if (!done) setupRound(); }, 1000);
          }
        } else {
          // Wrong switch!
          fails++;
          phase = 'explode';
          resultText = '爆発！';
          resultCol = C.bombHi;
          resultAnim = 0.8;
          game.audio.play('se_failure', 0.7);
          for (var pi2 = 0; pi2 < 15; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: sw.x, y: sw.y, vx: Math.cos(ang2)*300, vy: Math.sin(ang2)*300, life:0.8, col: C.bomb });
          }
          if (fails >= MAX_FAILS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
          setTimeout(function() { if (!done) setupRound(); }, 1200);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 1.5;

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) startPlay();
    }

    if (phase === 'play' || phase === 'explode') {
      currentX += CURRENT_SPEED * dt;
      if (currentX > W + 60) currentX = -60;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Wire backbone
    game.draw.line(0, H * 0.5, W, H * 0.5, C.wire, 12);

    // Switches
    for (var i2 = 0; i2 < switches.length; i2++) {
      var sw2 = switches[i2];
      var swCol = sw2.on ? C.switch : C.switchOff;
      var wireCol = sw2.on ? C.wireHi : C.wireOff;

      // Branch wire from backbone to switch
      game.draw.line(W * 0.3 + i2 * W * 0.12, H * 0.5, sw2.x - 80, sw2.y, wireCol, 6);
      game.draw.line(sw2.x + 80, sw2.y, W * 0.3 + (i2 + 1) * W * 0.12, H * 0.5, wireCol, 6);

      // Switch body
      game.draw.rect(sw2.x - 80, sw2.y - 30, 160, 60, swCol, 0.3);
      game.draw.rect(sw2.x - 80, sw2.y - 30, 160, 60, sw2.on ? C.switchHi : '#374151', 0.8);
      game.draw.text(sw2.on ? '⬛' : 'OFF', sw2.x, sw2.y + 12, { size: 32, color: sw2.on ? swCol : '#6b7280' });

      // Order number during show phase
      if (phase === 'show') {
        game.draw.circle(sw2.x, sw2.y - 60, 30, C.sparks, 0.9);
        game.draw.text(sw2.num + '', sw2.x, sw2.y - 48, { size: 36, color: '#000', bold: true });
      }
    }

    // Current ball
    if (phase === 'play') {
      game.draw.circle(currentX, H * 0.5, 20, C.current, 0.9);
      game.draw.circle(currentX, H * 0.5, 32, C.current, 0.3);
      // Spark trail
      for (var ti = 0; ti < 5; ti++) {
        game.draw.circle(currentX - ti * 12, H * 0.5, 12 - ti * 2, C.current, (0.6 - ti * 0.1));
      }
    }

    // Show instruction
    if (phase === 'show') {
      game.draw.text('この順番でOFF！', W / 2, H * 0.25, { size: 52, color: C.sparks, bold: true });
    } else if (phase === 'play') {
      var nextIdx = correctOrder[playerOrder.length];
      if (nextIdx !== undefined) {
        var nextSw = switches[nextIdx];
        game.draw.circle(nextSw.x, nextSw.y, 90, C.switch, 0.1 + Math.sin(elapsed * 4) * 0.05);
        game.draw.text('次はここ！', nextSw.x, nextSw.y - 100, { size: 32, color: C.switchHi });
      }
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 64, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAILS; fi++) {
      game.draw.circle(W / 2 - (MAX_FAILS - 1) * 28 + fi * 56, H * 0.91, 16, fi < fails ? C.bomb : '#0a0a10');
    }

    game.draw.text(attempts + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wireHi : C.wireHot);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    setupRound();
  });
})(game);
