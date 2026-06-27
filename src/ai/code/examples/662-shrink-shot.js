// 662-shrink-shot.js
// 縮小的 — 的が縮む前にタップせよ、小さいほど高得点
// 操作: タップで的を射る
// 成功: 300点以上かつ20ヒット  失敗: 8回外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#02030a',
    ring3:   '#ef4444',
    ring2:   '#f97316',
    ring1:   '#eab308',
    bull:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05060e'
  };

  var targets = [];
  var MAX_R = 160;
  var MIN_R = 20;
  var SHRINK_SPEED = 90; // px per second

  var score = 0;
  var SCORE_NEEDED = 300;
  var hits = 0;
  var HITS_NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var spawnTimer = 0;
  var SPAWN_RATE = 1.2;

  function spawnTarget() {
    targets.push({
      x: 120 + Math.random() * (W - 240),
      y: 200 + Math.random() * (H * 0.55),
      r: MAX_R,
      alive: true
    });
  }

  function getScore(r) {
    if (r < 40) return 30;
    if (r < 70) return 20;
    if (r < 100) return 10;
    return 3;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      if (!t.alive) continue;
      var dx = tx - t.x, dy = ty - t.y;
      if (dx * dx + dy * dy < t.r * t.r) {
        var pts = getScore(t.r);
        score += pts;
        hits++;
        t.alive = false;

        var label = pts >= 30 ? 'PERFECT +' + pts : pts >= 20 ? 'GREAT +' + pts : 'HIT +' + pts;
        flashCol = pts >= 20 ? C.bull : C.ring2;
        flashAnim = 0.3;
        resultText = label;
        resultTimer = 0.55;
        game.audio.play('se_success', pts >= 20 ? 0.7 : 0.4);

        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: t.x, y: t.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: pts >= 20 ? C.bull : C.ring2 });
        }

        if (hits >= HITS_NEEDED && score >= SCORE_NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 10 + Math.ceil(timeLeft) * 80); }, 700);
        }
        hit = true;
        break;
      }
    }
    if (!hit) {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '外れ！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Spawn targets
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_RATE && targets.filter(function(t) { return t.alive; }).length < 3) {
      spawnTimer = 0;
      spawnTarget();
    }

    // Shrink targets, auto-miss if gone
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      if (!t.alive) { targets.splice(i, 1); continue; }
      t.r -= SHRINK_SPEED * dt;
      if (t.r <= 0) {
        t.alive = false;
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.25;
        resultText = '消えた！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.2);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var ti = 0; ti < targets.length; ti++) {
      var tg = targets[ti];
      if (!tg.alive) continue;
      var ratio2 = tg.r / MAX_R;
      game.draw.circle(tg.x + 5, tg.y + 5, tg.r, '#000', 0.3);
      game.draw.circle(tg.x, tg.y, tg.r, C.ring3, 0.8);
      if (tg.r > 70) game.draw.circle(tg.x, tg.y, tg.r * 0.65, C.ring2, 0.85);
      if (tg.r > 40) game.draw.circle(tg.x, tg.y, tg.r * 0.42, C.ring1, 0.9);
      game.draw.circle(tg.x, tg.y, Math.min(tg.r * 0.22, 30), C.bull, 0.95);
      // Shrink indicator ring
      game.draw.circle(tg.x, tg.y, tg.r + 6, '#ffffff', ratio2 * 0.25);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.76, { size: 64, color: flashCol, bold: true });
    }

    // Score display
    game.draw.text('スコア: ' + score, W / 2, H * 0.82, { size: 40, color: score >= SCORE_NEEDED ? C.bull : C.text });
    game.draw.text('ヒット: ' + hits + '/' + HITS_NEEDED, W / 2, H * 0.87, { size: 36, color: C.text });

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    var ratio3 = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio3, 12, ratio3 > 0.3 ? C.bull : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('ヒット ' + hits + ' / スコア ' + score, W / 2, 80, { size: 28, color: '#ffffff55' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnTarget();
  });
})(game);
