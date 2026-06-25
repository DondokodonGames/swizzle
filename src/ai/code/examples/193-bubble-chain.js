// 193-bubble-chain.js
// バブルチェーン — 同じ色のバブルを3つ以上繋げてタップで消す連鎖の気持ちよさ
// 操作: タップで同色グループを消す（3個以上）
// 成功: 50個のバブルを消す  失敗: 画面が埋まる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#04060c',
    ui:    '#334155',
    flash: '#ffffff'
  };

  var COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
  var COLOR_HI = ['#fca5a5', '#fde68a', '#86efac', '#93c5fd', '#d8b4fe'];

  var COLS = 7;
  var ROWS = 12;
  var BUB_R = 68;
  var SPACING = BUB_R * 2 + 4;
  var GX = (W - COLS * SPACING) / 2 + BUB_R;
  var GY = H * 0.1 + BUB_R;

  var bubbles = [];
  var score = 0;
  var needed = 50;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var feedback = 0;
  var feedbackOk = false;

  function initBubbles() {
    bubbles = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (r < 6) { // fill top 6 rows
          bubbles.push({
            col: c, row: r,
            x: GX + c * SPACING,
            y: GY + r * SPACING,
            color: Math.floor(Math.random() * COLORS.length),
            alive: true,
            scale: 1
          });
        }
      }
    }
  }

  function findGroup(startCol, startRow, color) {
    var visited = {};
    var group = [];
    var queue = [{ c: startCol, r: startRow }];
    while (queue.length > 0) {
      var cur = queue.shift();
      var k = cur.c + ',' + cur.r;
      if (visited[k]) continue;
      visited[k] = true;
      // Find bubble at this pos
      var found = null;
      for (var bi = 0; bi < bubbles.length; bi++) {
        if (bubbles[bi].alive && bubbles[bi].col === cur.c && bubbles[bi].row === cur.r && bubbles[bi].color === color) {
          found = bubbles[bi];
          break;
        }
      }
      if (!found) continue;
      group.push(found);
      var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (var di = 0; di < dirs.length; di++) {
        var nc = cur.c + dirs[di][0], nr = cur.r + dirs[di][1];
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
          queue.push({ c: nc, r: nr });
        }
      }
    }
    return group;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped bubble
    var hitBub = null;
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi];
      if (!b.alive) continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < BUB_R) {
        hitBub = b;
        break;
      }
    }
    if (!hitBub) return;

    var group = findGroup(hitBub.col, hitBub.row, hitBub.color);
    if (group.length < 3) {
      feedbackOk = false; feedback = 0.3;
      game.audio.play('se_failure', 0.2);
      return;
    }

    // Pop group
    for (var gi = 0; gi < group.length; gi++) {
      group[gi].alive = false;
      score += group.length;
      var ang = Math.random() * Math.PI * 2;
      for (var pi = 0; pi < 4; pi++) {
        var a = ang + pi * Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        particles.push({
          x: group[gi].x, y: group[gi].y,
          vx: Math.cos(a) * (120 + Math.random() * 80),
          vy: Math.sin(a) * (120 + Math.random() * 80),
          life: 0.5, color: hitBub.color
        });
      }
    }

    feedbackOk = true; feedback = 0.2;
    game.audio.play('se_success', Math.min(1, 0.4 + group.length * 0.05));

    if (score >= needed && !done) {
      done = true;
      setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 30); }, 400);
      return;
    }

    // Check if screen filled
    var maxRow = 0;
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      if (bubbles[bi2].alive) maxRow = Math.max(maxRow, bubbles[bi2].row);
    }

    // Add new row at top occasionally
    if (Math.random() < 0.4 && maxRow < ROWS - 1) {
      for (var nc = 0; nc < COLS; nc++) {
        // shift existing down
      }
      // Add new top row
      for (var bi3 = 0; bi3 < bubbles.length; bi3++) {
        if (bubbles[bi3].alive) {
          bubbles[bi3].row++;
          bubbles[bi3].y = GY + bubbles[bi3].row * SPACING;
        }
      }
      for (var nc2 = 0; nc2 < COLS; nc2++) {
        bubbles.push({
          col: nc2, row: 0,
          x: GX + nc2 * SPACING,
          y: GY,
          color: Math.floor(Math.random() * COLORS.length),
          alive: true, scale: 1
        });
      }
    }

    // Failure if bubbles reach bottom
    for (var bi4 = 0; bi4 < bubbles.length; bi4++) {
      if (bubbles[bi4].alive && bubbles[bi4].row >= ROWS - 1 && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 350 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bubbles
    for (var bi5 = 0; bi5 < bubbles.length; bi5++) {
      var b2 = bubbles[bi5];
      if (!b2.alive) continue;
      var col = COLORS[b2.color];
      var hiCol = COLOR_HI[b2.color];
      game.draw.circle(b2.x, b2.y, BUB_R + 8, col, 0.12);
      game.draw.circle(b2.x, b2.y, BUB_R, col, 0.85);
      game.draw.circle(b2.x - BUB_R * 0.28, b2.y - BUB_R * 0.32, BUB_R * 0.24, '#fff', 0.4);
      game.draw.circle(b2.x, b2.y, BUB_R * 0.35, hiCol, 0.2);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 14 * part.life * 2, COLORS[part.color], part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : '#ef4444', feedback * 0.08);
    }

    game.draw.text('3個以上つながった色をタップ', W / 2, H * 0.93, { size: 34, color: C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, H * 0.88, { size: 48, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? COLORS[2] : COLORS[0]);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    initBubbles();
  });
})(game);
