// 593-mirror-tap.js
// ミラータップ — 鏡像に映った位置を予測してタップする空間認識ゲーム
// 操作: 画面下半分に映った鏡像を見て、上半分の正しい位置をタップ
// 成功: 15回正解  失敗: 8回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020510',
    mirror:  '#001a2e',
    mirrorLine:'#0066aa',
    target:  '#44aaff',
    targetHi:'#88ccff',
    ghost:   '#44aaff44',
    hit:     '#22c55e',
    hitHi:   '#86efac',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#1a2a3a',
    ripple:  '#00aaff'
  };

  var MIRROR_Y = H / 2;
  var TARGET_R = 44;
  var targets = []; // multiple targets shown at once
  var score = 0;
  var NEEDED = 15;
  var fails = 0;
  var MAX_FAIL = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var resultText = '';
  var resultTimer = 0;
  var ripples = [];

  function spawnTarget() {
    var margin = 100;
    var x = margin + Math.random() * (W - margin * 2);
    var y = margin + Math.random() * (MIRROR_Y - margin * 1.5);
    targets.push({
      x: x, y: y,
      life: 3.5 - Math.min(2, score * 0.1),
      maxLife: 3.5 - Math.min(2, score * 0.1),
      r: TARGET_R,
      phase: Math.random() * Math.PI * 2,
      hit: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (ty >= MIRROR_Y) {
      // Tapped mirror area — invalid
      game.audio.play('se_failure', 0.15);
      return;
    }

    // Check if tapped position matches any target (in upper half)
    var hit = false;
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var t = targets[ti];
      if (t.hit) continue;
      var dx = tx - t.x, dy = ty - t.y;
      if (dx * dx + dy * dy < (TARGET_R + 30) * (TARGET_R + 30)) {
        // Hit!
        t.hit = true;
        score++;
        flashCol = C.hit;
        flashAnim = 0.2;
        resultText = 'せいかい!';
        resultTimer = 0.5;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: t.x, y: t.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.hitHi });
        }
        // Ripple at mirror position
        ripples.push({ x: t.x, y: MIRROR_Y * 2 - t.y, r: 0, maxR: 80, alpha: 0.6 });
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
        hit = true;
        break;
      }
    }

    if (!hit) {
      fails++;
      flashCol = C.miss;
      flashAnim = 0.25;
      resultText = 'はずれ';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      // Miss ripple
      ripples.push({ x: tx, y: ty, r: 0, maxR: 60, alpha: 0.4 });
      if (fails >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (resultTimer > 0) resultTimer -= dt;

    // Manage targets
    var activeTargets = targets.filter(function(t) { return !t.hit; });
    if (activeTargets.length < 1 + Math.floor(score / 5)) {
      spawnTarget();
    }

    // Update targets
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var t = targets[ti];
      t.phase += dt * 2;
      if (t.hit) {
        t.life -= dt * 4;
      } else {
        t.life -= dt;
      }
      if (t.life <= 0) {
        if (!t.hit) {
          // Timed out = miss
          fails++;
          flashCol = C.miss;
          flashAnim = 0.2;
          resultText = 'まにあわず';
          resultTimer = 0.5;
          game.audio.play('se_failure', 0.2);
          if (fails >= MAX_FAIL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        targets.splice(ti, 1);
      }
    }

    // Update ripples
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      ripples[ri].r += 150 * dt;
      ripples[ri].alpha -= dt * 2;
      if (ripples[ri].alpha <= 0) ripples.splice(ri, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Upper half (real world)
    game.draw.rect(0, 0, W, MIRROR_Y, C.mirror, 0.3);

    // Targets in upper half
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var t2 = targets[ti2];
      if (t2.hit) {
        game.draw.circle(t2.x, t2.y, t2.r * 2 * (1 - t2.life / 0.25 * 0.25), C.hitHi, t2.life * 0.8);
        continue;
      }
      var lifeRatio = t2.life / t2.maxLife;
      var pulse = 1 + Math.sin(t2.phase) * 0.08;
      // Timer ring
      game.draw.circle(t2.x, t2.y, TARGET_R + 16, C.ui, 0.4);
      game.draw.circle(t2.x, t2.y, TARGET_R + 10, C.target, lifeRatio * 0.3);
      game.draw.circle(t2.x, t2.y, t2.r * pulse, C.target, 0.85);
      game.draw.circle(t2.x - 12, t2.y - 12, t2.r * 0.3, C.targetHi, 0.5);
    }

    // Mirror line
    game.draw.rect(0, MIRROR_Y - 4, W, 8, C.mirrorLine, 0.8);
    game.draw.rect(0, MIRROR_Y - 1, W, 2, '#aaddff', 0.6);

    // Lower half (mirror)
    game.draw.rect(0, MIRROR_Y, W, H - MIRROR_Y, C.mirror, 0.5);

    // Mirror ripples
    for (var ri2 = 0; ri2 < ripples.length; ri2++) {
      var rip = ripples[ri2];
      game.draw.circle(rip.x, rip.y, rip.r, C.ripple, rip.alpha * 0.5);
    }

    // Ghost targets in mirror (flipped Y)
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3];
      if (t3.hit) continue;
      var mirY = MIRROR_Y * 2 - t3.y;
      var lifeRatio2 = t3.life / t3.maxLife;
      game.draw.circle(t3.x, mirY, t3.r, C.target, lifeRatio2 * 0.5);
      game.draw.circle(t3.x - 12, mirY + 12, t3.r * 0.3, C.targetHi, 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Label
    game.draw.text('上をタップ', W / 2, MIRROR_Y - 30, { size: 28, color: C.ui });

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 44 + fi * 88, H * 0.955, 18, fi < fails ? C.miss : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.target : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnTarget();
  });
})(game);
