// 738-comet-hunt.js
// コメットハント — 画面を横切る彗星をタップして撃墜しろ
// 操作: タップで撃墜
// 成功: 40個撃墜  失敗: 10個逃がす or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010108',
    comet:   '#60a5fa',
    cometHi: '#ffffff',
    tail:    '#1e3a8a',
    star:    '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030310'
  };

  var comets = [];
  var bgStars = [];
  for (var bsi = 0; bsi < 60; bsi++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.5 });
  }

  var spawnTimer = 0.6;
  var score = 0;
  var NEEDED = 40;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnComet() {
    var fromLeft = Math.random() < 0.5;
    var cx, cy, vx, vy;
    var spd = 480 + Math.random() * 280 + score * 7;
    var side = Math.random();
    if (side < 0.35) {
      cx = Math.random() * W;
      cy = -70;
      var ang = Math.PI * 0.35 + Math.random() * Math.PI * 0.3;
      vx = Math.cos(ang) * spd * (fromLeft ? 1 : -1);
      vy = Math.abs(Math.sin(ang) * spd);
    } else if (fromLeft) {
      cx = -80;
      cy = 200 + Math.random() * (H * 0.6);
      vx = (0.7 + Math.random() * 0.5) * spd;
      vy = (Math.random() - 0.4) * spd * 0.4;
    } else {
      cx = W + 80;
      cy = 200 + Math.random() * (H * 0.6);
      vx = -(0.7 + Math.random() * 0.5) * spd;
      vy = (Math.random() - 0.4) * spd * 0.4;
    }
    comets.push({ x: cx, y: cy, vx: vx, vy: vy, r: 22 + Math.random() * 14, tail: [] });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = comets.length - 1; i >= 0; i--) {
      var c = comets[i];
      var dx = tx - c.x, dy = ty - c.y;
      if (dx * dx + dy * dy < (c.r + 32) * (c.r + 32)) {
        comets.splice(i, 1);
        score++;
        flashCol = C.correct;
        flashAnim = 0.2;
        resultText = '撃墜！';
        resultTimer = 0.35;
        game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 260, vy: Math.sin(pa) * 260, life: 0.4, col: C.cometHi });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
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

    spawnTimer -= dt;
    var rate = Math.max(0.4, 0.85 - score * 0.009);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = rate;
      if (comets.length < 7) spawnComet();
    }

    for (var ci = comets.length - 1; ci >= 0; ci--) {
      var cm = comets[ci];
      cm.tail.unshift({ x: cm.x, y: cm.y });
      if (cm.tail.length > 14) cm.tail.pop();
      cm.x += cm.vx * dt;
      cm.y += cm.vy * dt;

      if (cm.x < -160 || cm.x > W + 160 || cm.y > H + 160) {
        comets.splice(ci, 1);
        escaped++;
        flashCol = C.wrong;
        flashAnim = 0.22;
        resultText = '逃がした！';
        resultTimer = 0.35;
        game.audio.play('se_failure', 0.2);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
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

    for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) {
      game.draw.circle(bgStars[bsi2].x, bgStars[bsi2].y, bgStars[bsi2].r, C.star, 0.35);
    }

    for (var ci2 = 0; ci2 < comets.length; ci2++) {
      var cm2 = comets[ci2];
      for (var ti = 0; ti < cm2.tail.length; ti++) {
        var tf = 1 - ti / cm2.tail.length;
        game.draw.circle(cm2.tail[ti].x, cm2.tail[ti].y, cm2.r * tf * 0.65, C.tail, tf * 0.55);
      }
      game.draw.circle(cm2.x + 4, cm2.y + 4, cm2.r, '#000', 0.3);
      game.draw.circle(cm2.x, cm2.y, cm2.r, C.comet, 0.9);
      game.draw.circle(cm2.x - cm2.r * 0.28, cm2.y - cm2.r * 0.28, cm2.r * 0.28, C.cometHi, 0.55);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 48 + ei * 96, H * 0.955, 20, ei < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    spawnComet();
  });
})(game);
