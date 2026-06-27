// 622-echo-catch.js
// エコーキャッチ — 音波の反響を見て見えない的を当てろ
// 操作: タップで音波発射、反響パターンから的の位置を推定してタップ
// 成功: 12的命中  失敗: 10回外れ or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    wave:    '#0ea5e9',
    waveHi:  '#7dd3fc',
    echo:    '#f59e0b',
    echoHi:  '#fde68a',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    hit:     '#22c55e',
    hitHi:   '#86efac',
    text:    '#f1f5f9',
    ui:      '#0a1020',
    miss:    '#ef4444'
  };

  var target = null;
  var echoes = [];
  var hits = 0;
  var NEEDED = 12;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var resultText = '';
  var resultTimer = 0;
  var pulseTimer = 0;
  var PULSE_INTERVAL = 2.0;
  var showTarget = false;
  var showTargetTimer = 0;
  var guessMode = false; // after echo, tap to guess location

  function spawnTarget() {
    target = {
      x: 100 + Math.random() * (W - 200),
      y: H * 0.15 + Math.random() * (H * 0.65),
      r: 40,
      phase: Math.random() * Math.PI * 2
    };
    echoes = [];
    showTarget = false;
    guessMode = false;
    pulseTimer = 0;
  }

  function shootEcho() {
    // Emit waves from bottom
    var srcX = W / 2;
    var srcY = H * 0.9;
    // The echo reflects off the (invisible) target
    var dist = Math.sqrt((target.x - srcX) * (target.x - srcX) + (target.y - srcY) * (target.y - srcY));
    var travelTime = dist / 400; // wave speed 400px/s

    echoes.push({
      srcX: srcX, srcY: srcY,
      x: srcX, y: srcY,
      vx: (target.x - srcX) / dist * 400,
      vy: (target.y - srcY) / dist * 400,
      r: 10, maxR: 80,
      life: travelTime + 0.6,
      travelTime: travelTime,
      echoTime: travelTime, // when echo comes back
      echoDone: false,
      echoR: 10,
      echoX: 0, echoY: 0,
      phase: 0
    });
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!guessMode) {
      // Shoot echo
      shootEcho();
      guessMode = true;
      game.audio.play('se_tap', 0.25);
    } else {
      // Guess target location
      var dx = tx - target.x, dy = ty - target.y;
      var r = target.r + 30;
      if (dx * dx + dy * dy < r * r) {
        // Hit!
        hits++;
        showTarget = true;
        showTargetTimer = 0.8;
        flashCol = C.hit;
        flashAnim = 0.3;
        resultText = '命中!';
        resultTimer = 0.8;
        game.audio.play('se_success', 0.8);
        for (var p = 0; p < 12; p++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: target.x, y: target.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.hitHi });
        }
        if (hits >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(hits * 500 + Math.ceil(timeLeft) * 100); }, 800);
        } else {
          setTimeout(function() { if (!done) spawnTarget(); }, 1000);
        }
      } else {
        misses++;
        flashCol = C.miss;
        flashAnim = 0.25;
        resultText = 'はずれ...';
        resultTimer = 0.6;
        game.audio.play('se_failure', 0.3);
        // Show brief target flash
        showTarget = true;
        showTargetTimer = 0.4;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          setTimeout(function() { if (!done) spawnTarget(); }, 1000);
        }
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
    if (resultTimer > 0) resultTimer -= dt;
    if (showTargetTimer > 0) { showTargetTimer -= dt; if (showTargetTimer <= 0) showTarget = false; }
    if (target) target.phase += dt * 2;

    // Auto-pulse every interval
    if (!guessMode) {
      pulseTimer += dt;
      if (pulseTimer > PULSE_INTERVAL) {
        pulseTimer = 0;
        shootEcho();
      }
    }

    // Update echoes
    for (var ei = echoes.length - 1; ei >= 0; ei--) {
      var e = echoes[ei];
      e.phase += dt * 8;
      e.life -= dt;

      if (!e.echoDone) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.r = 10 + (1 - e.life / (e.travelTime + 0.6)) * 70;
        // When reaching target
        if (e.life <= 0.6 && !e.echoDone) {
          e.echoDone = true;
          e.echoX = target.x + (Math.random() - 0.5) * 20;
          e.echoY = target.y + (Math.random() - 0.5) * 20;
        }
      } else {
        // Echo ripples at target position
        e.echoR += dt * 150;
      }

      if (e.life <= 0) echoes.splice(ei, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Scan lines (subtle background effect)
    for (var sl = 0; sl < 20; sl++) {
      game.draw.line(0, sl * (H / 20), W, sl * (H / 20), C.wave, 0.5);
    }

    // Echoes
    for (var ei2 = 0; ei2 < echoes.length; ei2++) {
      var e2 = echoes[ei2];
      var alpha = e2.life / (e2.travelTime + 0.6);
      if (!e2.echoDone) {
        game.draw.circle(e2.x, e2.y, e2.r, C.wave, alpha * 0.25);
        game.draw.circle(e2.x, e2.y, e2.r * 0.3, C.waveHi, alpha * 0.7);
      } else {
        // Echo pulse at target area
        var ea = Math.max(0, (0.6 - (0.6 - e2.life)) / 0.6);
        game.draw.circle(e2.echoX, e2.echoY, e2.echoR, C.echo, ea * 0.3);
        game.draw.circle(e2.echoX, e2.echoY, Math.min(e2.echoR, 30), C.echoHi, ea * 0.5);
      }
    }

    // Emitter at bottom
    var ew = 3 + Math.sin(elapsed * 8) * 1;
    game.draw.circle(W / 2, H * 0.9, 24, C.wave, 0.6);
    game.draw.circle(W / 2, H * 0.9, 14, C.waveHi, 0.8);

    // Target (only visible briefly)
    if (showTarget && target) {
      game.draw.circle(target.x, target.y, target.r + 12, C.targetHi, 0.3);
      game.draw.circle(target.x, target.y, target.r, C.target, 0.85);
      game.draw.circle(target.x - 12, target.y - 12, target.r * 0.3, C.targetHi, 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    } else if (guessMode) {
      game.draw.text('位置を推定してタップ!', W / 2, H * 0.88, { size: 38, color: C.echo, bold: true });
    } else {
      game.draw.text('音波発射→反響確認', W / 2, H * 0.88, { size: 36, color: C.ui });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.wave : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnTarget();
  });
})(game);
