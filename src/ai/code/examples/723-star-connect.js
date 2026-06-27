// 723-star-connect.js
// 星座つなぎ — 光る星を順番通りにタップして星座を描け
// 操作: タップで星を番号順にタップ
// 成功: 15星座完成  失敗: 6回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#01020a',
    star:    '#e2e8f0',
    starHi:  '#fde68a',
    starDone:'#22c55e',
    line:    '#7c3aed',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#03040f'
  };

  var STAR_COUNT = 5;
  var STAR_R = 36;
  var PLAY_X0 = 80, PLAY_Y0 = 280;
  var PLAY_W = W - 160, PLAY_H = H * 0.55;

  var stars = [];
  var nextIdx = 0;
  var connectedLines = [];
  var revealTimer = 0;
  var REVEAL_DUR = 1.2;  // show numbers at start of each round
  var revealing = true;

  var round = 0;
  var NEEDED = 15;
  var errors = 0;
  var MAX_ERR = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;

  // Background star field (decorative)
  var bgStars = [];
  for (var bs = 0; bs < 60; bs++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 3 + 1, ph: Math.random() * Math.PI * 2 });
  }

  function newConstellation() {
    round++;
    var count = Math.min(7, 3 + Math.floor(round / 3));
    stars = [];
    connectedLines = [];
    nextIdx = 0;
    revealing = true;
    revealTimer = REVEAL_DUR;

    var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, sx, sy, tries = 0;
      while (!ok && tries < 200) {
        tries++;
        sx = PLAY_X0 + STAR_R + Math.random() * (PLAY_W - STAR_R * 2);
        sy = PLAY_Y0 + STAR_R + Math.random() * (PLAY_H - STAR_R * 2);
        ok = true;
        for (var j = 0; j < placed.length; j++) {
          var dx2 = sx - placed[j].x, dy2 = sy - placed[j].y;
          if (dx2 * dx2 + dy2 * dy2 < (STAR_R * 3) * (STAR_R * 3)) { ok = false; break; }
        }
      }
      placed.push({ x: sx, y: sy, num: i + 1, tapped: false, phase: Math.random() * Math.PI * 2 });
    }
    stars = placed;
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || revealing || waitTimer > 0) return;
    var hit = -1;
    for (var i = 0; i < stars.length; i++) {
      if (stars[i].tapped) continue;
      var dx = tx - stars[i].x, dy = ty - stars[i].y;
      if (dx * dx + dy * dy < (STAR_R + 20) * (STAR_R + 20)) { hit = i; break; }
    }
    if (hit < 0) return;

    if (stars[hit].num === nextIdx + 1) {
      // Correct
      if (nextIdx > 0) {
        connectedLines.push({ x1: stars[hit - 0].x, y1: stars[hit - 0].y,
          x2: stars[nextIdx - 1] >= 0 ? stars[nextIdx].x : stars[hit].x,
          y2: stars[nextIdx - 1] >= 0 ? stars[nextIdx].y : stars[hit].y });
        // Find previous tapped star for line
        var prev = null;
        for (var pi = 0; pi < stars.length; pi++) {
          if (stars[pi].num === nextIdx) { prev = stars[pi]; break; }
        }
        if (prev) connectedLines.push({ x1: prev.x, y1: prev.y, x2: stars[hit].x, y2: stars[hit].y });
      }
      stars[hit].tapped = true;
      nextIdx++;
      game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 4; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: stars[hit].x, y: stars[hit].y, vx: Math.cos(pa)*150, vy: Math.sin(pa)*150, life: 0.4, col: C.starHi });
      }

      if (nextIdx >= stars.length) {
        // Constellation complete!
        flashCol = C.correct;
        flashAnim = 0.4;
        resultText = '星座完成！';
        resultTimer = 0.7;
        game.audio.play('se_success', 0.65);
        // Burst
        for (var p2 = 0; p2 < 12; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.50, vx: Math.cos(pa2)*260, vy: Math.sin(pa2)*260, life: 0.6, col: C.starHi });
        }
        if (round >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(round * 600 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          waitTimer = 1.0;
        }
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '順番が違う！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
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

    if (revealing) {
      revealTimer -= dt;
      if (revealTimer <= 0) revealing = false;
    }

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newConstellation();
    }

    for (var si = 0; si < stars.length; si++) {
      if (!stars[si].tapped) stars[si].phase += dt * 1.5;
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

    // Background star field
    for (var bsi = 0; bsi < bgStars.length; bsi++) {
      bgStars[bsi].ph += dt * 0.8;
      var bAlpha = 0.3 + 0.2 * Math.sin(bgStars[bsi].ph);
      game.draw.circle(bgStars[bsi].x, bgStars[bsi].y, bgStars[bsi].r, C.star, bAlpha);
    }

    // Connection lines
    for (var li = 0; li < connectedLines.length; li++) {
      var ln = connectedLines[li];
      game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, C.line, 4);
    }

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var st = stars[si2];
      var pulse = 0.88 + 0.12 * Math.sin(st.phase * 2);
      var sCol = st.tapped ? C.starDone : C.star;
      game.draw.circle(st.x + 3, st.y + 3, STAR_R, '#000', 0.25);
      game.draw.circle(st.x, st.y, STAR_R * pulse, sCol, st.tapped ? 0.9 : 0.75);
      if (revealing || st.tapped || st.num === nextIdx + 1) {
        game.draw.text(st.num + '', st.x, st.y + 14, { size: 44, color: st.tapped ? '#fff' : C.starHi, bold: true });
      }
      if (st.num === nextIdx + 1 && !revealing) {
        game.draw.circle(st.x, st.y, STAR_R + 18, C.starHi, 0.2 + 0.1 * Math.sin(elapsed * 5));
      }
    }

    // Phase label
    var phStr = revealing ? '記憶せよ！' : ('次: ' + (nextIdx + 1) + ' 番');
    game.draw.text(phStr, W / 2, PLAY_Y0 - 60, { size: 44, color: revealing ? C.starHi : C.starDone, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    newConstellation();
  });
})(game);
