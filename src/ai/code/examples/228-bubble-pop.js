// 228-bubble-pop.js
// バブルポップ — 大きなシャボン玉を最後の瞬間まで育ててから割る快感ゲーム
// 操作: タップで割る  長く育てるほど高得点
// 成功: 合計5000点  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020408',
    bubble: '#3b82f6',
    bubHi:  '#93c5fd',
    bubLo:  '#1e3a5f',
    danger: '#ef4444',
    pop:    '#f59e0b',
    popHi:  '#fde68a',
    ui:     '#475569'
  };

  var bubble = null;
  var score = 0;
  var NEEDED = 5000;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var pops = [];
  var GROW_SPEED = 40; // px per second
  var MAX_R = 300;
  var BURST_THRESHOLD = 0.9; // auto-burst at 90% max

  function spawnBubble() {
    bubble = {
      x: 100 + Math.random() * (W - 200),
      y: H * 0.25 + Math.random() * H * 0.5,
      r: 20,
      phase: 'growing', // 'growing' | 'popped'
      age: 0,
      shiver: 0
    };
  }

  function popBubble(manual) {
    if (!bubble || bubble.phase !== 'growing') return;
    var ratio = bubble.r / MAX_R;
    var pts = 0;
    if (ratio >= 0.85) pts = Math.round(ratio * 1500);
    else if (ratio >= 0.7) pts = Math.round(ratio * 1000);
    else if (ratio >= 0.5) pts = Math.round(ratio * 600);
    else pts = Math.round(ratio * 200);

    score += pts;
    game.audio.play('se_success', 0.5 + ratio * 0.4);

    // Pop particles
    for (var i = 0; i < 12; i++) {
      var ang = (i / 12) * Math.PI * 2;
      pops.push({
        x: bubble.x, y: bubble.y,
        vx: Math.cos(ang) * (150 + Math.random() * 150),
        vy: Math.sin(ang) * (150 + Math.random() * 150),
        life: 0.5 + Math.random() * 0.3,
        r: 10 + ratio * 20,
        pts: i === 0 ? pts : 0
      });
    }

    bubble = null;
    if (score >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(score); }, 500);
    } else {
      setTimeout(spawnBubble, 400);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || !bubble) return;
    var dx = tx - bubble.x, dy = ty - bubble.y;
    if (Math.sqrt(dx * dx + dy * dy) < bubble.r + 30) {
      popBubble(true);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play(score >= NEEDED ? 'se_success' : 'se_failure');
        if (score >= NEEDED) game.end.success(score);
        else game.end.failure();
        return;
      }
    }

    if (bubble) {
      bubble.age += dt;
      bubble.r += GROW_SPEED * dt;

      // Shiver as it gets large (warning)
      var ratio = bubble.r / MAX_R;
      if (ratio > 0.75) {
        bubble.shiver = (ratio - 0.75) * 20 * (Math.random() - 0.5);
      }

      if (bubble.r >= MAX_R * BURST_THRESHOLD) {
        // Auto-pop (no score bonus)
        popBubble(false);
      }
    }

    for (var pi = pops.length - 1; pi >= 0; pi--) {
      pops[pi].x += pops[pi].vx * dt;
      pops[pi].y += pops[pi].vy * dt;
      pops[pi].vy += 150 * dt;
      pops[pi].life -= dt;
      if (pops[pi].life <= 0) pops.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Score goal bar
    var goalRatio = Math.min(1, score / NEEDED);
    game.draw.rect(0, H * 0.92, W, 12, C.ui, 0.3);
    game.draw.rect(0, H * 0.92, W * goalRatio, 12, '#22c55e', 0.8);

    // Bubble
    if (bubble) {
      var ratio2 = bubble.r / MAX_R;
      var bx = bubble.x + bubble.shiver;
      var by = bubble.y;

      // Rainbow rim based on size
      var rimAlpha = ratio2 * 0.4;
      game.draw.circle(bx, by, bubble.r + 10, C.bubHi, rimAlpha * 0.5);
      game.draw.circle(bx, by, bubble.r + 4, C.danger, ratio2 > 0.75 ? rimAlpha : 0);

      // Body
      game.draw.circle(bx, by, bubble.r, C.bubble, 0.25);

      // Rim lines (soap film effect)
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        game.draw.circle(bx + Math.cos(a) * bubble.r * 0.8, by + Math.sin(a) * bubble.r * 0.8, bubble.r * 0.1, C.bubHi, 0.2);
      }

      // Highlight
      game.draw.circle(bx - bubble.r * 0.3, by - bubble.r * 0.3, bubble.r * 0.2, '#fff', 0.5);
      game.draw.circle(bx - bubble.r * 0.15, by - bubble.r * 0.15, bubble.r * 0.08, '#fff', 0.8);

      // Size / danger indicator
      var sizeText = ratio2 >= 0.85 ? '今だ！' : ratio2 >= 0.7 ? '良い感じ' : ratio2 >= 0.5 ? 'まだ...' : '育て中';
      var sizeCol = ratio2 >= 0.85 ? C.danger : ratio2 >= 0.7 ? C.pop : C.ui;
      var pts2 = ratio2 >= 0.85 ? Math.round(ratio2 * 1500) : ratio2 >= 0.7 ? Math.round(ratio2 * 1000) : ratio2 >= 0.5 ? Math.round(ratio2 * 600) : Math.round(ratio2 * 200);
      game.draw.text(sizeText + ' +' + pts2, bx, by, { size: 40, color: sizeCol, bold: true });
    }

    // Pop particles
    for (var pp = 0; pp < pops.length; pp++) {
      var p = pops[pp];
      game.draw.circle(p.x, p.y, p.r * p.life * 2, C.popHi, p.life * 0.7);
      if (p.pts > 0) {
        game.draw.text('+' + p.pts, p.x, p.y, { size: 44, color: '#fff', bold: true });
      }
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('タップで割る！', W / 2, H * 0.95, { size: 40, color: C.ui });

    var ratio3 = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio3, 72, ratio3 > 0.3 ? C.bubble : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnBubble();
  });
})(game);
