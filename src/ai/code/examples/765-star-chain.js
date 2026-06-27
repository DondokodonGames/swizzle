// 765-star-chain.js
// スターチェーン — 数字の順番通りに星をタップして繋げ
// 操作: 1→2→3→4→5の順にタップ
// 成功: 25回完成  失敗: 10回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020410',
    star:    '#fbbf24',
    starHi:  '#fef3c7',
    starDk:  '#78350f',
    starDone:'#22c55e',
    line:    '#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    num:     '#fff',
    ui:      '#060820'
  };

  var STAR_COUNT = 5;
  var STAR_R = 50;
  var AREA_TOP = H * 0.28;
  var AREA_BOT = H * 0.82;
  var AREA_LEFT = W * 0.1;
  var AREA_RIGHT = W * 0.9;

  var stars = [];
  var nextIdx = 0; // which star to tap next (0-4)
  var completed = [];
  var waitTimer = 0;
  var WAIT_DUR = 0.4;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var connLines = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var completionAnim = 0;

  function newRound() {
    stars = [];
    nextIdx = 0;
    completed = [];
    connLines = [];
    completionAnim = 0;
    // Random positions with minimum distance
    var attempts = 0;
    while (stars.length < STAR_COUNT && attempts < 200) {
      attempts++;
      var sx = AREA_LEFT + Math.random() * (AREA_RIGHT - AREA_LEFT);
      var sy = AREA_TOP + Math.random() * (AREA_BOT - AREA_TOP);
      var ok = true;
      for (var i = 0; i < stars.length; i++) {
        var dx = sx - stars[i].x;
        var dy = sy - stars[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 200) { ok = false; break; }
      }
      if (ok) {
        stars.push({ x: sx, y: sy, num: stars.length + 1, twinkle: Math.random() * Math.PI * 2 });
      }
    }
  }

  function drawStar5(cx, cy, r, color, alpha) {
    var pts = [];
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      var a2 = a + Math.PI / 5;
      pts.push({ x: cx + Math.cos(a2) * r * 0.42, y: cy + Math.sin(a2) * r * 0.42 });
    }
    // Draw as triangle fan (approximate with lines)
    for (var j = 0; j < pts.length; j++) {
      var p1 = pts[j];
      var p2 = pts[(j + 1) % pts.length];
      game.draw.line(p1.x, p1.y, p2.x, p2.y, color, 8);
    }
    game.draw.circle(cx, cy, r * 0.3, color, alpha);
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0 || nextIdx >= STAR_COUNT) return;
    // Check which star was tapped
    var hitIdx = -1;
    var bestDist = Infinity;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var dx = tx - s.x;
      var dy = ty - s.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < STAR_R + 30 && dist < bestDist) {
        bestDist = dist;
        hitIdx = i;
      }
    }
    if (hitIdx < 0) return;

    if (hitIdx === nextIdx) {
      // Correct!
      if (nextIdx > 0) {
        connLines.push({ x1: stars[nextIdx - 1].x, y1: stars[nextIdx - 1].y, x2: stars[nextIdx].x, y2: stars[nextIdx].y, life: 1.0 });
      }
      completed.push(nextIdx);
      nextIdx++;
      game.audio.play('se_tap', 0.09);

      if (nextIdx >= STAR_COUNT) {
        // Chain complete!
        score++;
        completionAnim = 0.8;
        flashCol = C.correct;
        flashAnim = 0.25;
        resultText = 'チェーン完成！';
        resultTimer = 0.5;
        game.audio.play('se_success', 0.7);
        waitTimer = WAIT_DUR;
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 120); }, 700);
        }
      }
    } else {
      // Wrong order
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = hitIdx + 1 < stars[nextIdx].num ? (hitIdx + 1) + '番！' + stars[nextIdx].num + 'が先だ' : '順番が違う！';
      resultTimer = 0.42;
      game.audio.play('se_failure', 0.28);
      // Reset to start
      nextIdx = 0;
      completed = [];
      connLines = [];
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    }

    if (completionAnim > 0) completionAnim -= dt * 2;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var ci = connLines.length - 1; ci >= 0; ci--) {
      connLines[ci].life -= dt * 0.5;
      if (waitTimer > 0 && connLines[ci].life <= 0) connLines.splice(ci, 1);
    }

    // Twinkle update
    for (var si = 0; si < stars.length; si++) {
      stars[si].twinkle += dt * (2 + si * 0.3);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars (tiny)
    for (var bsi = 0; bsi < 30; bsi++) {
      var bx = ((bsi * 137) % W);
      var by = ((bsi * 97 + 50) % (AREA_BOT - AREA_TOP)) + AREA_TOP;
      game.draw.circle(bx, by, 1.5, C.starHi, 0.2 + 0.15 * Math.sin(elapsed * 1.5 + bsi));
    }

    // Connection lines
    for (var li = 0; li < connLines.length; li++) {
      var ln = connLines[li];
      game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, C.line, 6);
      game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, C.starHi, 2);
    }

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s2 = stars[si2];
      var isDone = completed.indexOf(si2) >= 0;
      var isNext = si2 === nextIdx;
      var tw = 0.85 + 0.15 * Math.sin(s2.twinkle);
      var col = isDone ? C.starDone : (isNext ? C.star : C.starDk);
      var r2 = STAR_R * (isNext ? (0.95 + 0.05 * Math.sin(elapsed * 5)) : 1.0);

      // Glow for next star
      if (isNext) {
        game.draw.circle(s2.x, s2.y, r2 + 28, C.star, 0.12 + 0.08 * Math.sin(elapsed * 4));
      }

      // Shadow
      game.draw.circle(s2.x + 4, s2.y + 4, r2, '#000', 0.25);
      // Star body
      drawStar5(s2.x, s2.y, r2, col, tw * 0.9);

      // Number
      var numSz = isNext ? 48 : 40;
      game.draw.text('' + s2.num, s2.x, s2.y + 10, { size: numSz, color: isDone ? C.bg : C.num, bold: true });
    }

    // Next indicator
    if (nextIdx < STAR_COUNT && !waitTimer) {
      var ns = stars[nextIdx];
      game.draw.text('次: ' + ns.num + '番', W / 2, H * 0.87, { size: 44, color: C.star + 'cc', bold: true });
    }

    if (completionAnim > 0) {
      game.draw.rect(0, 0, W, H, C.correct, completionAnim * 0.08);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.21, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
