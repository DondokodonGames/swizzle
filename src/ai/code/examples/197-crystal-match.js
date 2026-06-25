// 197-crystal-match.js
// クリスタルマッチ — 降ってくる宝石の色を見て同じ列のボタンをタップする反射神経ゲーム
// 操作: タップで対応する列ボタンを押す
// 成功: 25個キャッチ  失敗: 7個取り逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#04040c',
    ui:    '#334155'
  };

  var COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];
  var COLOR_HI = ['#fca5a5', '#fde68a', '#86efac', '#93c5fd'];

  var COLS = 4;
  var COL_W = W / COLS;
  var GEM_R = 44;
  var FALL_SPEED = 420;
  var BTN_Y = H * 0.82;
  var BTN_H = 140;
  var CATCH_Y = BTN_Y - GEM_R;

  var gems = [];
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.6;
  var score = 0;
  var needed = 25;
  var misses = 0;
  var maxMisses = 7;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var btnFlash = [0, 0, 0, 0];
  var btnSuccess = [0, 0, 0, 0];
  var particles = [];

  function spawnGem() {
    var col = Math.floor(Math.random() * COLS);
    var colorIdx = Math.floor(Math.random() * COLORS.length);
    gems.push({ col: col, y: -GEM_R, colorIdx: colorIdx, caught: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty < BTN_Y) return;
    var col = Math.floor(tx / COL_W);
    if (col < 0 || col >= COLS) return;
    btnFlash[col] = 0.2;

    // Find lowest gem in that column near catch zone
    var hit = false;
    for (var gi = gems.length - 1; gi >= 0; gi--) {
      var g = gems[gi];
      if (g.col !== col || g.caught) continue;
      if (g.y > CATCH_Y - 120 && g.y < CATCH_Y + 60) {
        g.caught = true;
        score++;
        btnSuccess[col] = 0.3;
        game.audio.play('se_tap', 0.6);
        var cx = (col + 0.5) * COL_W;
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cx, y: CATCH_Y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, colorIdx: g.colorIdx });
        }
        hit = true;
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 30); }, 400);
        }
        break;
      }
    }
    if (!hit) {
      game.audio.play('se_failure', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    spawnTimer -= dt;
    var speedMult = 1 + score / 50;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL / speedMult;
      spawnGem();
    }

    for (var ci = 0; ci < COLS; ci++) {
      if (btnFlash[ci] > 0) btnFlash[ci] -= dt;
      if (btnSuccess[ci] > 0) btnSuccess[ci] -= dt;
    }

    for (var gi2 = gems.length - 1; gi2 >= 0; gi2--) {
      var g2 = gems[gi2];
      g2.y += FALL_SPEED * speedMult * dt;
      if (g2.caught && g2.y > CATCH_Y + 80) { gems.splice(gi2, 1); continue; }
      if (!g2.caught && g2.y > CATCH_Y + 60) {
        misses++;
        gems.splice(gi2, 1);
        if (misses >= maxMisses && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Column lanes
    for (var lc = 0; lc < COLS; lc++) {
      var lx = lc * COL_W;
      game.draw.rect(lx + 4, 0, COL_W - 8, H, COLORS[lc], 0.04);
    }

    // Catch zone line
    game.draw.rect(0, CATCH_Y - 4, W, 8, '#1e293b', 0.8);

    // Gems
    for (var gi3 = 0; gi3 < gems.length; gi3++) {
      var g3 = gems[gi3];
      var gx = (g3.col + 0.5) * COL_W;
      var col2 = COLORS[g3.colorIdx];
      var hi2 = COLOR_HI[g3.colorIdx];
      if (g3.caught) {
        game.draw.circle(gx, g3.y, GEM_R * 1.4, hi2, 0.4);
      } else {
        game.draw.circle(gx, g3.y, GEM_R + 8, col2, 0.15);
        game.draw.circle(gx, g3.y, GEM_R, col2, 0.9);
        game.draw.circle(gx - GEM_R * 0.3, g3.y - GEM_R * 0.3, GEM_R * 0.25, '#fff', 0.5);
        // Diamond facets
        game.draw.circle(gx, g3.y - GEM_R * 0.5, GEM_R * 0.2, hi2, 0.4);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, COLORS[part.colorIdx], part.life);
    }

    // Buttons
    for (var bc = 0; bc < COLS; bc++) {
      var bx = bc * COL_W;
      var isFlash = btnFlash[bc] > 0;
      var isSuccess = btnSuccess[bc] > 0;
      var bcol = COLORS[bc];
      game.draw.rect(bx + 8, BTN_Y, COL_W - 16, BTN_H, bcol, isFlash ? 0.6 : 0.3);
      game.draw.rect(bx + 8, BTN_Y, COL_W - 16, 16, COLOR_HI[bc], isFlash ? 0.5 : 0.2);
      if (isSuccess) {
        game.draw.circle((bc + 0.5) * COL_W, BTN_Y + BTN_H / 2, 32, '#fff', btnSuccess[bc] * 0.6);
      }
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 - (maxMisses - 1) * 28 + mi * 56, 218, 18, mi < misses ? COLORS[0] : '#0a0a14');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? COLORS[2] : COLORS[0]);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spawnTimer = 0.5;
  });
})(game);
