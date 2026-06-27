// 761-bubble-pop.js
// バブルポップ — 浮かび上がる泡を消える前にタップして割れ
// 操作: タップで泡を割る（タップ位置に泡があれば割れる）
// 成功: 50個割る  失敗: 12個逃がす or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a18',
    bubble:  '#7dd3fc',
    bubHi:   '#e0f2fe',
    bubDk:   '#0369a1',
    bubBorder:'#38bdf8',
    pop:     '#f0f9ff',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060e1c'
  };

  var bubbles = [];
  var spawnTimer = 0;
  var spawnRate = 0.55;

  var score = 0;
  var NEEDED = 50;
  var escaped = 0;
  var MAX_ESCAPE = 12;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var popParticles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBubble() {
    var r = 40 + Math.random() * 50;
    var x = r + Math.random() * (W - r * 2);
    var vy = -(90 + Math.random() * 120 + score * 1.5);
    var vx = (Math.random() - 0.5) * 60;
    bubbles.push({ x: x, y: H + r, r: r, vx: vx, vy: vy, wobble: Math.random() * Math.PI * 2, wobbleSpd: 1.5 + Math.random() });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var dx = tx - b.x;
      var dy = ty - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.r && dist < bestDist) {
        bestDist = dist;
        hitIdx = i;
      }
    }

    if (hitIdx >= 0) {
      var b2 = bubbles[hitIdx];
      score++;
      flashCol = C.correct;
      flashAnim = 0.14;
      resultText = 'ポン！';
      resultTimer = 0.28;
      game.audio.play('se_tap', 0.1);
      // Pop particles
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        var sp = 60 + Math.random() * 120;
        popParticles.push({ x: b2.x, y: b2.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 40, life: 0.4, r: 4 + Math.random() * 6, col: C.bubHi });
      }
      bubbles.splice(hitIdx, 1);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 100); }, 700);
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
    spawnRate = Math.max(0.3, 0.55 - score * 0.003);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = spawnRate;
      spawnBubble();
      if (score > 25) spawnBubble();
    }

    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      var b = bubbles[bi];
      b.wobble += b.wobbleSpd * dt;
      b.x += b.vx * dt + Math.sin(b.wobble) * 0.8;
      b.y += b.vy * dt;
      if (b.y + b.r < 0) {
        escaped++;
        bubbles.splice(bi, 1);
        flashCol = C.wrong;
        flashAnim = 0.25;
        resultText = '逃がした！';
        resultTimer = 0.35;
        game.audio.play('se_failure', 0.2);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    for (var pp = popParticles.length - 1; pp >= 0; pp--) {
      popParticles[pp].x += popParticles[pp].vx * dt;
      popParticles[pp].y += popParticles[pp].vy * dt;
      popParticles[pp].vy += 200 * dt;
      popParticles[pp].life -= dt * 2.5;
      if (popParticles[pp].life <= 0) popParticles.splice(pp, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b3 = bubbles[bi2];
      var cx = b3.x;
      var cy = b3.y;
      // Shadow
      game.draw.circle(cx + 5, cy + 5, b3.r, '#000', 0.2);
      // Body (translucent)
      game.draw.circle(cx, cy, b3.r, C.bubble, 0.18);
      // Border ring
      var bsteps = Math.max(16, Math.floor(b3.r * 0.8));
      for (var ri = 0; ri < bsteps; ri++) {
        if (ri % 4 === 3) continue;
        var ra = ri * Math.PI * 2 / bsteps;
        game.draw.circle(cx + Math.cos(ra) * b3.r, cy + Math.sin(ra) * b3.r, 4, C.bubBorder, 0.7);
      }
      // Shine
      game.draw.circle(cx - b3.r * 0.32, cy - b3.r * 0.32, b3.r * 0.22, C.bubHi, 0.6);
      game.draw.circle(cx - b3.r * 0.18, cy - b3.r * 0.18, b3.r * 0.1, '#fff', 0.85);
      // Inner sheen
      game.draw.circle(cx + b3.r * 0.25, cy + b3.r * 0.2, b3.r * 0.12, C.bubBorder, 0.25);
    }

    // Pop particles
    for (var pp2 = 0; pp2 < popParticles.length; pp2++) {
      var p2 = popParticles[pp2];
      game.draw.circle(p2.x, p2.y, p2.r * p2.life, p2.col, p2.life);
    }

    if (!done && bubbles.length === 0) {
      game.draw.text('泡をタップして割れ！', W / 2, H * 0.5, { size: 44, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 40 + ei * 80, H * 0.955, 18, ei < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBubble();
    spawnBubble();
    spawnBubble();
  });
})(game);
