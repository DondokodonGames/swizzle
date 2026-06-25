// 083-night-sky.js
// 星座つなぎ — 夜空に浮かぶ星を正しい順番でタップして星座を描く喜び
// 操作: タップで星を順番につなぐ
// 成功: 5つの星座を完成させる  失敗: 3回間違える or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    star:    '#fef3c7',
    starHi:  '#fbbf24',
    line:    '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Constellations: array of {x,y} stars (normalized 0-1)
  var CONSTELLATIONS = [
    {
      name: 'おおぐま', stars: [
        {x:0.25,y:0.30},{x:0.35,y:0.25},{x:0.50,y:0.28},{x:0.62,y:0.32},
        {x:0.70,y:0.44},{x:0.65,y:0.56},{x:0.72,y:0.62}
      ]
    },
    {
      name: 'オリオン', stars: [
        {x:0.35,y:0.22},{x:0.65,y:0.22},{x:0.30,y:0.38},{x:0.70,y:0.38},
        {x:0.40,y:0.50},{x:0.60,y:0.50},{x:0.50,y:0.62}
      ]
    },
    {
      name: 'さそり', stars: [
        {x:0.50,y:0.20},{x:0.42,y:0.30},{x:0.38,y:0.42},{x:0.42,y:0.54},
        {x:0.52,y:0.60},{x:0.62,y:0.58},{x:0.70,y:0.66}
      ]
    },
    {
      name: 'カシオペア', stars: [
        {x:0.20,y:0.35},{x:0.35,y:0.25},{x:0.50,y:0.35},{x:0.65,y:0.25},{x:0.80,y:0.35}
      ]
    },
    {
      name: 'みなみじゅうじ', stars: [
        {x:0.50,y:0.22},{x:0.50,y:0.58},{x:0.28,y:0.40},{x:0.72,y:0.40}
      ]
    }
  ];

  var PLAY_Y_START = H * 0.18;
  var PLAY_H = H * 0.64;

  var currentIdx = 0;
  var currentProgress = 0; // how many stars tapped so far
  var completedLines = []; // array of line segments for current constellation
  var score = 0;
  var needed = CONSTELLATIONS.length;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var completedConstellations = []; // { stars, lines } of finished ones
  var flashTimer = 0;

  // Background star field (random, decorative)
  var bgStars = [];
  for (var i = 0; i < 80; i++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 3 + 1, twinkle: Math.random() * Math.PI * 2 });
  }

  function getCurrentConst() {
    return CONSTELLATIONS[currentIdx];
  }

  function starScreenPos(star) {
    return {
      x: star.x * W,
      y: PLAY_Y_START + star.y * PLAY_H
    };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var con = getCurrentConst();
    var target = con.stars[currentProgress];
    var sp = starScreenPos(target);
    var dx = tx - sp.x;
    var dy = ty - sp.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 70) {
      // Correct star
      if (currentProgress > 0) {
        var prev = starScreenPos(con.stars[currentProgress - 1]);
        completedLines.push({ x1: prev.x, y1: prev.y, x2: sp.x, y2: sp.y });
      }
      currentProgress++;
      game.audio.play('se_tap', 0.7);

      if (currentProgress >= con.stars.length) {
        // Constellation complete!
        score++;
        flashTimer = 0.6;
        game.audio.play('se_success');
        // Save completed constellation
        completedConstellations.push({
          stars: con.stars.map(starScreenPos),
          lines: completedLines.slice()
        });
        completedLines = [];
        currentProgress = 0;

        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 10); }, 500);
          return;
        }
        currentIdx = (currentIdx + 1) % CONSTELLATIONS.length;
      }
    } else {
      // Wrong tap — check if they tapped a wrong star
      var hitWrong = false;
      for (var j = currentProgress + 1; j < con.stars.length; j++) {
        var sp2 = starScreenPos(con.stars[j]);
        var d2 = Math.sqrt((tx - sp2.x) * (tx - sp2.x) + (ty - sp2.y) * (ty - sp2.y));
        if (d2 < 70) { hitWrong = true; break; }
      }
      if (hitWrong) {
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.6);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (feedback > 0) feedback -= dt;
    if (flashTimer > 0) flashTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars
    for (var i = 0; i < bgStars.length; i++) {
      var bs = bgStars[i];
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(game.time.elapsed * 1.2 + bs.twinkle));
      game.draw.circle(bs.x, bs.y, bs.r, '#fff', tw * 0.4);
    }

    // Draw completed constellations (dim)
    for (var c = 0; c < completedConstellations.length; c++) {
      var cc = completedConstellations[c];
      for (var l = 0; l < cc.lines.length; l++) {
        var ln = cc.lines[l];
        game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, '#1e3a5f', 2);
      }
      for (var s = 0; s < cc.stars.length; s++) {
        game.draw.circle(cc.stars[s].x, cc.stars[s].y, 14, '#22c55e', 0.5);
      }
    }

    // Flash on completion
    if (flashTimer > 0) {
      game.draw.rect(0, 0, W, H, '#fbbf24', flashTimer / 0.6 * 0.15);
    }

    var con = getCurrentConst();

    // Draw progress lines
    for (var pl = 0; pl < completedLines.length; pl++) {
      var pln = completedLines[pl];
      game.draw.line(pln.x1, pln.y1, pln.x2, pln.y2, C.line, 4);
    }

    // Draw stars for current constellation
    for (var si = 0; si < con.stars.length; si++) {
      var sp = starScreenPos(con.stars[si]);
      var tapped = si < currentProgress;
      var isNext = si === currentProgress;
      var pulse = 0.7 + 0.3 * Math.sin(game.time.elapsed * 4 + si);

      if (tapped) {
        game.draw.circle(sp.x, sp.y, 20, C.correct);
      } else if (isNext) {
        game.draw.circle(sp.x, sp.y, 28 + pulse * 6, C.starHi, pulse * 0.3);
        game.draw.circle(sp.x, sp.y, 24, C.starHi);
        game.draw.text('★', sp.x, sp.y, { size: 28, color: '#fff', bold: true });
      } else {
        game.draw.circle(sp.x, sp.y, 16, C.star, 0.5);
      }
    }

    // Order numbers (small labels)
    for (var ni = 0; ni < con.stars.length; ni++) {
      var nsp = starScreenPos(con.stars[ni]);
      if (ni >= currentProgress) {
        game.draw.text((ni + 1) + '', nsp.x + 24, nsp.y - 24, { size: 28, color: '#64748b' });
      }
    }

    // Constellation name
    game.draw.text(con.name, W / 2, H * 0.88, { size: 52, color: '#94a3b8', bold: true });

    // Feedback
    if (feedback > 0) {
      game.draw.text('順番が違う！', W / 2, H * 0.28, { size: 64, color: C.wrong, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, '#020408');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score dots + miss dots
    for (var sd = 0; sd < needed; sd++) {
      var sx = W / 2 + (sd - (needed - 1) / 2) * 72;
      game.draw.circle(sx, 128, 22, sd < score ? C.starHi : '#0a1428');
    }
    for (var md = 0; md < maxMisses; md++) {
      var mx = W / 2 + (md - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 192, 18, md < misses ? C.wrong : '#0a1428');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
