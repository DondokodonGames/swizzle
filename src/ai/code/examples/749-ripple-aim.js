// 749-ripple-aim.js
// リップルエイム — タップした場所から広がる波紋で浮かぶターゲットを打て
// 操作: タップで波紋を発生（ターゲットに当てると成功）
// 成功: 30個ヒット  失敗: 15回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020a12',
    ripple:  '#38bdf8',
    ripHi:   '#7dd3fc',
    target:  '#f97316',
    targetHi:'#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040d18'
  };

  var targets = [];
  var ripples = [];
  var spawnTimer = 0.8;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 15;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnTarget() {
    var margin = 100;
    targets.push({
      x: margin + Math.random() * (W - margin * 2),
      y: H * 0.18 + Math.random() * (H * 0.65),
      r: 30 + Math.random() * 18,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90,
      phase: Math.random() * Math.PI * 2,
      hit: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Create ripple at tap point
    ripples.push({ x: tx, y: ty, r: 0, maxR: 420, life: 1.0, hit: [] });
    game.audio.play('se_tap', 0.08);

    // Check immediate hit (small burst at tap point)
    var anyHit = false;
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      if (t.hit) continue;
      var dx = tx - t.x, dy = ty - t.y;
      if (dx * dx + dy * dy < (t.r + 20) * (t.r + 20)) {
        t.hit = true;
        score++;
        anyHit = true;
        flashCol = C.correct;
        flashAnim = 0.22;
        resultText = 'ヒット！';
        resultTimer = 0.35;
        game.audio.play('se_success', 0.5);
        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: t.x, y: t.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.targetHi });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
      }
    }
    if (!anyHit) {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.18;
      resultText = 'ミス';
      resultTimer = 0.28;
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

    spawnTimer -= dt;
    var rate = Math.max(0.5, 0.82 - score * 0.007);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = rate;
      if (targets.length < 7) spawnTarget();
    }

    // Update ripples
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var rp = ripples[ri];
      rp.r += 700 * dt;
      rp.life -= dt * 1.0;

      // Ripple hitting targets
      for (var ti = targets.length - 1; ti >= 0; ti--) {
        var t2 = targets[ti];
        if (t2.hit) continue;
        var inHit = rp.hit.indexOf(ti) >= 0;
        if (inHit) continue;
        var dx = rp.x - t2.x, dy = rp.y - t2.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - rp.r) < t2.r + 12) {
          rp.hit.push(ti);
          t2.hit = true;
          score++;
          flashCol = C.correct;
          flashAnim = 0.22;
          resultText = '波紋ヒット！';
          resultTimer = 0.38;
          game.audio.play('se_success', 0.45);
          for (var p2 = 0; p2 < 6; p2++) {
            var pa2 = Math.random() * Math.PI * 2;
            particles.push({ x: t2.x, y: t2.y, vx: Math.cos(pa2) * 180, vy: Math.sin(pa2) * 180, life: 0.4, col: C.ripHi });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
          }
        }
      }

      if (rp.life <= 0 || rp.r > rp.maxR) ripples.splice(ri, 1);
    }

    // Update targets
    for (var ti2 = targets.length - 1; ti2 >= 0; ti2--) {
      var t3 = targets[ti2];
      if (t3.hit) { targets.splice(ti2, 1); continue; }
      t3.phase += dt * 2;
      t3.x += t3.vx * dt;
      t3.y += t3.vy * dt;
      if (t3.x < 60 || t3.x > W - 60) { t3.vx = -t3.vx; t3.x = Math.max(60, Math.min(W - 60, t3.x)); }
      if (t3.y < H * 0.15 || t3.y > H * 0.85) { t3.vy = -t3.vy; t3.y = Math.max(H * 0.15, Math.min(H * 0.85, t3.y)); }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ripples
    for (var ri2 = 0; ri2 < ripples.length; ri2++) {
      var rp2 = ripples[ri2];
      var la = rp2.life;
      game.draw.circle(rp2.x, rp2.y, rp2.r, C.ripple, la * 0.25);
      game.draw.circle(rp2.x, rp2.y, rp2.r - 12, C.ripple, la * 0.12);
      game.draw.circle(rp2.x, rp2.y, rp2.r + 12, C.ripple, la * 0.08);
    }

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t4 = targets[ti3];
      var pulse = 0.9 + 0.1 * Math.sin(t4.phase * 3);
      game.draw.circle(t4.x + 4, t4.y + 4, t4.r, '#000', 0.3);
      game.draw.circle(t4.x, t4.y, t4.r * pulse, C.target, 0.9);
      game.draw.circle(t4.x - t4.r * 0.3, t4.y - t4.r * 0.3, t4.r * 0.28, C.targetHi, 0.45);
      game.draw.circle(t4.x, t4.y, t4.r + 10, C.target, 0.12);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 33 + ei * 66, H * 0.955, 14, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    spawnTarget();
    spawnTarget();
  });
})(game);
