// 341-ramen-cook.js
// ラーメンクック — 沸騰したお湯に麺を投入して3分間ちょうどで引き上げる
// 操作: タップでアクションを実行（投入→待つ→引き上げ）
// 成功: 5杯完璧調理  失敗: 3杯失敗 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0400',
    pot:    '#1c1008',
    potHi:  '#2d1a0e',
    steam:  '#e2e8f0',
    water:  '#1d4ed8',
    waterHi:'#3b82f6',
    noodle: '#fde68a',
    noodleHi:'#fff',
    perfect:'#22c55e',
    perfectHi:'#86efac',
    over:   '#ef4444',
    overHi: '#fca5a5',
    under:  '#f59e0b',
    bowl:   '#92400e',
    bowlHi: '#b45309',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  var COOK_TIME = 3.0; // target cook time in seconds (simplified from 3 min)
  var COOK_TOLERANCE = 0.5; // ±0.5s is perfect

  var phase = 'idle'; // idle, cooking, done
  var cookTimer = 0;
  var steamAnim = 0;
  var servings = 0;
  var NEEDED = 5;
  var failures = 0;
  var MAX_FAILURES = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var steams = [];
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.perfect;
  var noodleYList = [];
  var bubbles = [];

  function startCooking() {
    phase = 'cooking';
    cookTimer = 0;
    noodleYList = [];
    for (var i = 0; i < 6; i++) {
      noodleYList.push(H * 0.58 + Math.random() * 40);
    }
    game.audio.play('se_tap', 0.3);
  }

  function liftNoodles() {
    if (phase !== 'cooking') return;
    phase = 'done';
    var diff = Math.abs(cookTimer - COOK_TIME);
    if (diff <= COOK_TOLERANCE) {
      servings++;
      resultText = diff < 0.15 ? '完璧！' : '上手い！';
      resultCol = C.perfectHi;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.7, col: C.noodleHi });
      }
      if (servings >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(servings * 400 + Math.ceil(timeLeft) * 100); }, 600);
        return;
      }
    } else if (cookTimer < COOK_TIME - COOK_TOLERANCE) {
      failures++;
      resultText = '生煮え！';
      resultCol = C.under;
      game.audio.play('se_failure', 0.5);
    } else {
      failures++;
      resultText = '茹でスギ！';
      resultCol = C.overHi;
      game.audio.play('se_failure', 0.5);
    }
    resultAnim = 1.0;
    if (failures >= MAX_FAILURES && !done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }
    setTimeout(function() { if (!done) { phase = 'idle'; } }, 800);
  }

  game.onTap(function() {
    if (done) return;
    if (phase === 'idle') startCooking();
    else if (phase === 'cooking') liftNoodles();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 1.5;
    steamAnim += dt;

    if (phase === 'cooking') {
      cookTimer += dt;
      // Over time - auto fail at 2x target
      if (cookTimer > COOK_TIME * 2.2) {
        liftNoodles();
        return;
      }
    }

    // Bubbles
    if (Math.random() < dt * 8) {
      bubbles.push({ x: W * 0.3 + Math.random() * W * 0.4, y: H * 0.65, vy: -60 - Math.random() * 40, r: 8 + Math.random() * 10, life: 0.8 });
    }
    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      bubbles[bi].y += bubbles[bi].vy * dt;
      bubbles[bi].x += Math.sin(elapsed * 3 + bi) * 20 * dt;
      bubbles[bi].life -= dt;
      if (bubbles[bi].life <= 0) bubbles.splice(bi, 1);
    }

    // Steam
    if (Math.random() < dt * 3) {
      steams.push({ x: W * 0.25 + Math.random() * W * 0.5, y: H * 0.52, vy: -50, vx: (Math.random() - 0.5) * 30, r: 20, life: 1.2 });
    }
    for (var si = steams.length - 1; si >= 0; si--) {
      steams[si].y += steams[si].vy * dt;
      steams[si].x += steams[si].vx * dt;
      steams[si].r += 30 * dt;
      steams[si].life -= dt;
      if (steams[si].life <= 0) steams.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stove
    game.draw.rect(W * 0.1, H * 0.7, W * 0.8, H * 0.22, C.pot, 0.9);
    game.draw.rect(W * 0.1, H * 0.7, W * 0.8, 16, C.potHi, 0.8);

    // Pot
    game.draw.rect(W * 0.2, H * 0.5, W * 0.6, H * 0.22, C.pot, 0.9);
    game.draw.rect(W * 0.18, H * 0.5, W * 0.64, 16, C.potHi, 0.9);

    // Boiling water
    var waterY = H * 0.52;
    game.draw.rect(W * 0.2, waterY, W * 0.6, H * 0.2, C.water, 0.8);
    // Wave surface
    for (var wx = W * 0.2; wx < W * 0.8; wx += 60) {
      var wh = 10 + 6 * Math.sin(elapsed * 5 + wx * 0.02);
      game.draw.circle(wx + 30, waterY, 30, C.waterHi, 0.5);
    }

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var bb = bubbles[bi2];
      game.draw.circle(bb.x, bb.y, bb.r, C.waterHi, bb.life * 0.5);
    }

    // Noodles in water
    if (phase === 'cooking' || phase === 'done') {
      for (var ni = 0; ni < noodleYList.length; ni++) {
        var ny = noodleYList[ni];
        var nx = W * 0.25 + ni * W * 0.09;
        // Noodle squiggle
        for (var ns = 0; ns < 3; ns++) {
          var nsX = nx + ns * 24;
          game.draw.line(nsX, ny, nsX + 16 * Math.sin(elapsed * 4 + ns), ny + 40, C.noodle, 6);
        }
      }
    }

    // Steam
    for (var si2 = 0; si2 < steams.length; si2++) {
      var st = steams[si2];
      game.draw.circle(st.x, st.y, st.r, C.steam, st.life * 0.15);
    }

    // Timer display during cooking
    if (phase === 'cooking') {
      var ct = cookTimer;
      var pct = Math.min(1, ct / COOK_TIME);
      var timerCol = Math.abs(ct - COOK_TIME) < COOK_TOLERANCE ? C.perfectHi : (ct > COOK_TIME ? C.overHi : C.noodle);
      // Big timer
      game.draw.text(ct.toFixed(1) + 's', W / 2, H * 0.35, { size: 80, color: timerCol, bold: true });
      // Target indicator
      game.draw.text('目標: ' + COOK_TIME + 's', W / 2, H * 0.43, { size: 40, color: C.ui });
      // Cook gauge
      game.draw.rect(W * 0.1, H * 0.46, W * 0.8, 24, '#1c1008', 0.9);
      game.draw.rect(W * 0.1, H * 0.46, W * 0.8 * Math.min(1, pct), 24, timerCol, 0.9);
      // Perfect zone marker
      var perfectLeft = W * 0.1 + W * 0.8 * (COOK_TIME - COOK_TOLERANCE) / (COOK_TIME * 2.2);
      var perfectRight = W * 0.1 + W * 0.8 * (COOK_TIME + COOK_TOLERANCE) / (COOK_TIME * 2.2);
      game.draw.rect(perfectLeft, H * 0.46 - 4, perfectRight - perfectLeft, 32, C.perfect, 0.4);
    } else if (phase === 'idle') {
      game.draw.text('タップで麺を投入！', W / 2, H * 0.38, { size: 46, color: C.ui });
    } else {
      game.draw.text('タップで引き上げ！', W / 2, H * 0.38, { size: 46, color: C.noodleHi, bold: true });
    }

    // Result anim
    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 72, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAILURES; fi++) {
      game.draw.circle(W / 2 - (MAX_FAILURES - 1) * 28 + fi * 56, H * 0.91, 16, fi < failures ? C.over : '#0a0400');
    }

    game.draw.text(servings + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.water : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
