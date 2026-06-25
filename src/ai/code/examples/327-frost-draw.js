// 327-frost-draw.js
// フロストドロー — 凍った窓に息を吹きかけて隠れた図形を見つける
// 操作: スワイプで霜を溶かし、図形のシルエットを浮かび上がらせる
// 成功: 8つの図形を発見  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1628',
    frost:  '#bfdbfe',
    frostHi:'#dbeafe',
    hidden: '#3b82f6',
    hiddenHi:'#60a5fa',
    reveal: '#f0f9ff',
    found:  '#22c55e',
    foundHi:'#86efac',
    breath: '#e0f2fe',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Hidden shapes in a 3x3+ grid
  var HIDDEN = [
    { x: W * 0.2, y: H * 0.28, w: 160, h: 160, type: 'circle', found: false, reveal: 0 },
    { x: W * 0.6, y: H * 0.28, w: 180, h: 180, type: 'square', found: false, reveal: 0 },
    { x: W * 0.85, y: H * 0.35, w: 140, h: 140, type: 'triangle', found: false, reveal: 0 },
    { x: W * 0.15, y: H * 0.5, w: 150, h: 150, type: 'diamond', found: false, reveal: 0 },
    { x: W * 0.5, y: H * 0.48, w: 180, h: 180, type: 'star', found: false, reveal: 0 },
    { x: W * 0.82, y: H * 0.56, w: 160, h: 160, type: 'circle', found: false, reveal: 0 },
    { x: W * 0.25, y: H * 0.68, w: 170, h: 170, type: 'square', found: false, reveal: 0 },
    { x: W * 0.68, y: H * 0.7, w: 160, h: 160, type: 'triangle', found: false, reveal: 0 }
  ];

  // Frost cells grid (simulate with array)
  var FROST_COLS = 18;
  var FROST_ROWS = 28;
  var frost = [];
  for (var fr = 0; fr < FROST_ROWS; fr++) {
    frost.push([]);
    for (var fc = 0; fc < FROST_COLS; fc++) {
      frost[fr].push(1.0); // 1=fully frosted, 0=clear
    }
  }

  var found = 0;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var breaths = []; // { x, y, r, life }
  var particles = [];

  function meltFrost(tx, ty, radius) {
    var cellW = W / FROST_COLS;
    var cellH = H / FROST_ROWS;
    var minC = Math.max(0, Math.floor((tx - radius) / cellW));
    var maxC = Math.min(FROST_COLS - 1, Math.ceil((tx + radius) / cellW));
    var minR = Math.max(0, Math.floor((ty - radius) / cellH));
    var maxR = Math.min(FROST_ROWS - 1, Math.ceil((ty + radius) / cellH));
    for (var r = minR; r <= maxR; r++) {
      for (var c = minC; c <= maxC; c++) {
        var cx = (c + 0.5) * cellW;
        var cy = (r + 0.5) * cellH;
        var dist = Math.hypot(cx - tx, cy - ty);
        if (dist < radius) {
          frost[r][c] = Math.max(0, frost[r][c] - 0.4 * (1 - dist / radius));
        }
      }
    }
  }

  function checkReveal(shape) {
    // Check if enough frost is melted around shape center
    var cellW = W / FROST_COLS;
    var cellH = H / FROST_ROWS;
    var sc = Math.floor(shape.x / cellW);
    var sr = Math.floor(shape.y / cellH);
    var totalClear = 0, total = 0;
    for (var r = Math.max(0, sr - 2); r <= Math.min(FROST_ROWS - 1, sr + 2); r++) {
      for (var c = Math.max(0, sc - 2); c <= Math.min(FROST_COLS - 1, sc + 2); c++) {
        total++;
        if (frost[r][c] < 0.5) totalClear++;
      }
    }
    return total > 0 ? totalClear / total : 0;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var mx = (x1 + x2) / 2;
    var my = (y1 + y2) / 2;
    meltFrost(mx, my, 80);
    breaths.push({ x: mx, y: my, r: 30, life: 0.6 });
    game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    meltFrost(tx, ty, 60);
    breaths.push({ x: tx, y: ty, r: 20, life: 0.4 });
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Slow re-frost
    if (!done) {
      for (var r = 0; r < FROST_ROWS; r++) {
        for (var c = 0; c < FROST_COLS; c++) {
          if (frost[r][c] < 1) frost[r][c] = Math.min(1, frost[r][c] + dt * 0.03);
        }
      }
    }

    // Update breaths
    for (var bi = breaths.length - 1; bi >= 0; bi--) {
      breaths[bi].r += 60 * dt;
      breaths[bi].life -= dt * 2;
      if (breaths[bi].life <= 0) breaths.splice(bi, 1);
    }

    // Check reveals
    for (var si = 0; si < HIDDEN.length; si++) {
      if (!HIDDEN[si].found) {
        HIDDEN[si].reveal = checkReveal(HIDDEN[si]);
        if (HIDDEN[si].reveal > 0.6) {
          HIDDEN[si].found = true;
          found++;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: HIDDEN[si].x, y: HIDDEN[si].y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.foundHi });
          }
          if (found >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(found * 300 + Math.ceil(timeLeft) * 100); }, 500);
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw hidden shapes (below frost)
    for (var si2 = 0; si2 < HIDDEN.length; si2++) {
      var sh = HIDDEN[si2];
      var shCol = sh.found ? C.found : C.hidden;
      var shAlpha = sh.found ? 0.9 : 0.5 + sh.reveal * 0.4;
      if (sh.type === 'circle') {
        game.draw.circle(sh.x, sh.y, sh.w / 2, shCol, shAlpha);
      } else if (sh.type === 'square') {
        game.draw.rect(sh.x - sh.w / 2, sh.y - sh.h / 2, sh.w, sh.h, shCol, shAlpha);
      } else if (sh.type === 'triangle') {
        game.draw.circle(sh.x, sh.y, sh.w / 2 * 0.8, shCol, shAlpha);
      } else if (sh.type === 'diamond') {
        game.draw.circle(sh.x, sh.y, sh.w * 0.35, shCol, shAlpha);
        game.draw.rect(sh.x - sh.w * 0.25, sh.y - sh.h * 0.5, sh.w * 0.5, sh.h, shCol, shAlpha * 0.7);
      } else if (sh.type === 'star') {
        game.draw.circle(sh.x, sh.y, sh.w / 2, shCol, shAlpha * 0.7);
        for (var pi2 = 0; pi2 < 5; pi2++) {
          var sa = pi2 * Math.PI * 2 / 5 - Math.PI / 2;
          game.draw.circle(sh.x + Math.cos(sa) * sh.w * 0.4, sh.y + Math.sin(sa) * sh.w * 0.4, 24, shCol, shAlpha);
        }
      }
    }

    // Frost overlay
    var cellW = W / FROST_COLS;
    var cellH = H / FROST_ROWS;
    for (var fr2 = 0; fr2 < FROST_ROWS; fr2++) {
      for (var fc2 = 0; fc2 < FROST_COLS; fc2++) {
        var fv = frost[fr2][fc2];
        if (fv > 0.05) {
          var variation = (Math.sin(fr2 * 3.7 + fc2 * 2.1) * 0.1 + 0.9);
          game.draw.rect(fc2 * cellW, fr2 * cellH, cellW + 1, cellH + 1, C.frost, fv * variation * 0.85);
        }
      }
    }

    // Breath clouds
    for (var bi2 = 0; bi2 < breaths.length; bi2++) {
      var br = breaths[bi2];
      game.draw.circle(br.x, br.y, br.r, C.breath, br.life * 0.25);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text('スワイプで霜を溶かせ！', W / 2, H * 0.88, { size: 38, color: C.text });

    game.draw.text(found + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hidden : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
