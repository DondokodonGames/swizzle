// 067-bubble-pop.js
// バブルポップ — 数字付きのシャボン玉を昇順にタップして連鎖的に弾かせる気持ちよさ
// 操作: 小さい番号から順にタップ
// 成功: 全バブルを正しい順序で割る  失敗: 順序ミス3回 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030c18',
    ui:      '#475569'
  };

  var BUBBLE_COLORS = [
    { fill: '#ef4444', hi: '#fca5a5' },
    { fill: '#f97316', hi: '#fed7aa' },
    { fill: '#eab308', hi: '#fef08a' },
    { fill: '#22c55e', hi: '#86efac' },
    { fill: '#3b82f6', hi: '#93c5fd' },
    { fill: '#8b5cf6', hi: '#c4b5fd' },
    { fill: '#ec4899', hi: '#f9a8d4' }
  ];

  var bubbles = [];
  var pops = [];
  var nextTap = 1;
  var totalBubbles = 0;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;

  function spawnBubbles() {
    bubbles = [];
    pops = [];
    nextTap = 1;
    var count = 10;
    totalBubbles = count;
    var r = 56;

    for (var i = 0; i < count; i++) {
      var attempts = 0;
      var x, y, ok;
      do {
        x = r + 60 + Math.random() * (W - r * 2 - 120);
        y = H * 0.22 + Math.random() * (H * 0.62);
        ok = true;
        for (var j = 0; j < bubbles.length; j++) {
          var dx = x - bubbles[j].x, dy = y - bubbles[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < r * 2 + 16) { ok = false; break; }
        }
        attempts++;
      } while (!ok && attempts < 40);

      var colorIdx = i % BUBBLE_COLORS.length;
      bubbles.push({
        num: i + 1,
        x: x, y: y,
        r: r,
        vy: -20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 15,
        colorIdx: colorIdx,
        popped: false,
        scale: 0
      });
    }
  }

  game.onTap(function(x, y) {
    if (done) return;
    var hit = false;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      if (b.popped) continue;
      var dx = x - b.x, dy = y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.r + 16) {
        if (b.num === nextTap) {
          // Correct!
          b.popped = true;
          nextTap++;
          // Pop explosion
          var col = BUBBLE_COLORS[b.colorIdx];
          for (var p = 0; p < 12; p++) {
            var ang = (p / 12) * Math.PI * 2;
            pops.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, color: col.fill, life: 0.5, r: 10 });
          }
          pops.push({ x: b.x, y: b.y, vx: 0, vy: 0, color: '#fff', life: 0.25, r: b.r });
          game.audio.play('se_tap', 0.7);

          // Win check
          var remaining = bubbles.filter(function(bb) { return !bb.popped; }).length;
          if (remaining === 0 && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(200 + Math.ceil(timeLeft) * 10); }, 400);
          }
        } else {
          // Wrong order
          misses++;
          game.audio.play('se_failure', 0.5);
          // Flash wrong bubble
          b._wrongFlash = 0.4;
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        hit = true;
        break;
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

    // Float bubbles gently
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (b.popped) continue;
      b.scale = Math.min(1, b.scale + dt * 4);
      b.y += b.vy * dt;
      b.x += b.vx * dt;
      b.vy *= 0.99;
      b.vx *= 0.99;
      // Bounce off walls
      if (b.x - b.r < 40) { b.x = 40 + b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W - 40) { b.x = W - 40 - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < H * 0.15) { b.y = H * 0.15 + b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > H * 0.87) { b.y = H * 0.87 - b.r; b.vy = -Math.abs(b.vy); }
      if (b._wrongFlash > 0) b._wrongFlash -= dt;
    }

    // Update pops
    for (var p = pops.length - 1; p >= 0; p--) {
      pops[p].x += pops[p].vx * dt;
      pops[p].y += pops[p].vy * dt;
      pops[p].vy += 200 * dt;
      pops[p].life -= dt;
      if (pops[p].life <= 0) pops.splice(p, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bubbles (non-popped, sorted by number)
    for (var j = 0; j < bubbles.length; j++) {
      var b2 = bubbles[j];
      if (b2.popped) continue;
      var col = BUBBLE_COLORS[b2.colorIdx];
      var r = b2.r * b2.scale;
      var isNext = b2.num === nextTap;
      var wrongFlash = b2._wrongFlash > 0;

      // Glow for next target
      if (isNext) {
        var gPulse = 0.2 + 0.2 * Math.sin(game.time.elapsed * 7);
        game.draw.circle(b2.x, b2.y, r + 20, col.fill, gPulse);
      }

      // Wrong flash
      if (wrongFlash) {
        game.draw.circle(b2.x, b2.y, r + 16, '#ef4444', b2._wrongFlash / 0.4 * 0.8);
      }

      // Bubble body (semi-transparent)
      game.draw.circle(b2.x, b2.y, r, col.fill, 0.6);
      // Inner highlight
      game.draw.circle(b2.x - r * 0.25, b2.y - r * 0.3, r * 0.35, '#fff', 0.4);
      game.draw.circle(b2.x, b2.y, r - 6, col.hi, 0.1);

      // Number
      game.draw.text(b2.num + '', b2.x, b2.y, { size: 48, color: '#fff', bold: true });
    }

    // Pop particles
    for (var p2 = 0; p2 < pops.length; p2++) {
      var pp = pops[p2];
      game.draw.circle(pp.x, pp.y, pp.r * pp.life / 0.5, pp.color, pp.life / 0.5 * 0.8);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#030c18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Next tap indicator
    game.draw.text('次: ' + nextTap, W / 2, 140, { size: 56, color: '#fff', bold: true });

    // Miss pips
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - 1) * 64;
      game.draw.circle(mx, 212, 20, m < misses ? '#ef4444' : '#0a1428');
    }

    // Guide
    game.draw.text('番号順にタップして弾かせろ！', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnBubbles();
  });
})(game);
