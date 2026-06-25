// 296-star-connect.js
// 星座を結べ — 流れ星が消える前に同じ形の星座をなぞって完成させる
// 操作: スワイプで星と星を繋ぐ（点線に沿って）
// 成功: 8つの星座を完成  失敗: 3回ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020310',
    sky:    '#030418',
    star:   '#fde68a',
    starHi: '#fff7d6',
    line:   '#7c3aed',
    lineHi: '#a78bfa',
    guide:  '#1e1b4b',
    conn:   '#60a5fa',
    connHi: '#93c5fd',
    done2:   '#22c55e',
    doneHi: '#86efac',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Constellation patterns (relative coords, normalized 0-1)
  var PATTERNS = [
    // Big dipper (simplified 4 stars)
    [[0.2,0.3],[0.4,0.2],[0.6,0.25],[0.8,0.3],[0.8,0.6],[0.6,0.65],[0.4,0.6]],
    // Orion (5 stars)
    [[0.3,0.2],[0.7,0.2],[0.5,0.45],[0.25,0.7],[0.75,0.7],[0.5,0.45],[0.5,0.45]],
    // Cross (5 stars)
    [[0.5,0.15],[0.5,0.4],[0.5,0.65],[0.5,0.9],[0.25,0.4],[0.75,0.4]],
    // Triangle (3 stars)
    [[0.5,0.1],[0.2,0.8],[0.8,0.8]],
    // Square (4 stars)
    [[0.2,0.2],[0.8,0.2],[0.8,0.8],[0.2,0.8]],
    // Diamond (4 stars)
    [[0.5,0.1],[0.85,0.5],[0.5,0.9],[0.15,0.5]],
    // Arrow (4 stars)
    [[0.1,0.5],[0.5,0.5],[0.7,0.2],[0.7,0.8]],
    // Star of David points (6 stars)
    [[0.5,0.1],[0.82,0.65],[0.18,0.65]]
  ];

  // Connection order (indices into PATTERNS[i] array)
  var CONNECTIONS = [
    [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
    [[0,1],[1,2],[2,3],[2,4]],
    [[0,1],[1,2],[2,3],[4,1],[1,5]],
    [[0,1],[1,2],[2,0]],
    [[0,1],[1,2],[2,3],[3,0]],
    [[0,1],[1,2],[2,3],[3,0]],
    [[0,1],[1,2],[1,3]],
    [[0,1],[1,2],[2,0]]
  ];

  var constellationIdx = 0;
  var completed = 0;
  var NEEDED = 8;
  var errors = 0;
  var MAX_ERR = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;

  // Current puzzle state
  var stars = [];
  var requiredConns = [];
  var madeConns = []; // indices into requiredConns that are done
  var particles = [];
  var bgStars = [];
  var fadeTimer = 0;
  var FADE_TIME = 0.8;

  // Generate bg stars
  for (var bs = 0; bs < 80; bs++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, twinkle: Math.random() * Math.PI * 2 });
  }

  var ZONE_X = W * 0.1, ZONE_Y = H * 0.2, ZONE_W = W * 0.8, ZONE_H = H * 0.55;

  function loadConstellation() {
    var idx = constellationIdx % PATTERNS.length;
    var pat = PATTERNS[idx];
    var con = CONNECTIONS[idx];
    stars = pat.map(function(p) {
      return { x: ZONE_X + p[0] * ZONE_W, y: ZONE_Y + p[1] * ZONE_H, r: 22 };
    });
    requiredConns = con.map(function(c) { return { a: c[0], b: c[1] }; });
    madeConns = [];
  }

  function findStarAt(x, y) {
    for (var i = 0; i < stars.length; i++) {
      var dx = x - stars[i].x, dy = y - stars[i].y;
      if (dx * dx + dy * dy < 60 * 60) return i;
    }
    return -1;
  }

  var swipeStart = null;
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var s1 = findStarAt(x1, y1);
    var s2 = findStarAt(x2, y2);
    if (s1 === -1 || s2 === -1 || s1 === s2) return;

    // Check if this connection is required
    var found = -1;
    for (var ci = 0; ci < requiredConns.length; ci++) {
      var c = requiredConns[ci];
      if ((c.a === s1 && c.b === s2) || (c.a === s2 && c.b === s1)) {
        found = ci;
        break;
      }
    }

    if (found === -1) {
      // Wrong connection
      errors++;
      game.audio.play('se_failure', 0.4);
      for (var fi = 0; fi < 6; fi++) {
        var fang = Math.random() * Math.PI * 2;
        particles.push({ x: (stars[s1].x + stars[s2].x) / 2, y: (stars[s1].y + stars[s2].y) / 2, vx: Math.cos(fang) * 150, vy: Math.sin(fang) * 150, life: 0.5, col: C.danger });
      }
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
      return;
    }

    if (madeConns.indexOf(found) !== -1) return; // already done

    madeConns.push(found);
    game.audio.play('se_tap', 0.3);

    // Particles along the line
    var mid = { x: (stars[s1].x + stars[s2].x) / 2, y: (stars[s1].y + stars[s2].y) / 2 };
    for (var pi = 0; pi < 4; pi++) {
      particles.push({ x: mid.x + (Math.random() - 0.5) * 60, y: mid.y + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 100, vy: -60 - Math.random() * 80, life: 0.6, col: C.connHi });
    }

    if (madeConns.length === requiredConns.length) {
      // Constellation complete!
      completed++;
      game.audio.play('se_success', 0.6);
      fadeTimer = FADE_TIME;
      constellationIdx++;
      if (completed >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(completed * 200 + Math.ceil(timeLeft) * 100); }, 600);
        return;
      }
      setTimeout(function() { if (!done) loadConstellation(); }, 800);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (fadeTimer > 0) fadeTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Twinkling background stars
    for (var bs2 = 0; bs2 < bgStars.length; bs2++) {
      var b = bgStars[bs2];
      b.twinkle += dt * 1.5;
      var alpha = 0.4 + 0.4 * Math.sin(b.twinkle);
      game.draw.circle(b.x, b.y, b.r, C.starHi, alpha);
    }

    // Success flash
    if (fadeTimer > 0 && fadeTimer < FADE_TIME) {
      game.draw.rect(ZONE_X, ZONE_Y, ZONE_W, ZONE_H, C.doneHi, fadeTimer / FADE_TIME * 0.3);
    }

    // Guide connections (required but not yet made)
    for (var ci2 = 0; ci2 < requiredConns.length; ci2++) {
      if (madeConns.indexOf(ci2) !== -1) continue;
      var c2 = requiredConns[ci2];
      var s3 = stars[c2.a], s4 = stars[c2.b];
      // Dashed guide
      var len = Math.hypot(s4.x - s3.x, s4.y - s3.y);
      var steps = Math.floor(len / 30);
      for (var d = 0; d < steps; d += 2) {
        var t1 = d / steps, t2 = (d + 1) / steps;
        game.draw.line(
          s3.x + (s4.x - s3.x) * t1, s3.y + (s4.y - s3.y) * t1,
          s3.x + (s4.x - s3.x) * t2, s3.y + (s4.y - s3.y) * t2,
          C.guide, 3
        );
      }
    }

    // Made connections
    for (var mi = 0; mi < madeConns.length; mi++) {
      var mc = requiredConns[madeConns[mi]];
      game.draw.line(stars[mc.a].x, stars[mc.a].y, stars[mc.b].x, stars[mc.b].y, C.conn, 6);
      game.draw.line(stars[mc.a].x, stars[mc.a].y, stars[mc.b].x, stars[mc.b].y, C.connHi, 2);
    }

    // Stars
    for (var si = 0; si < stars.length; si++) {
      var st = stars[si];
      var glow = 3 * Math.sin(elapsed * 3 + si * 1.5);
      game.draw.circle(st.x, st.y, st.r + glow + 12, C.star, 0.1);
      game.draw.circle(st.x, st.y, st.r + glow, C.star, 0.9);
      game.draw.circle(st.x, st.y, st.r * 0.5, C.starHi, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 1.5, p.col, p.life * 0.8);
    }

    // Progress
    var remaining2 = requiredConns.length - madeConns.length;
    game.draw.text('あと ' + remaining2 + ' 本', W / 2, H * 0.87, { size: 40, color: C.lineHi });
    game.draw.text(completed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 28 + ei * 56, H * 0.93, 16, ei < errors ? C.danger : '#020310');
    }

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.line : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    loadConstellation();
  });
})(game);
