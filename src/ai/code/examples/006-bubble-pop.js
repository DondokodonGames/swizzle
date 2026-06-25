// 006-bubble-pop.js
// バブルポップ — 水面に達する前に弾ける気持ちよさ
// 操作: 泡をタップして弾く
// 成功: 10個弾く  失敗: 1個でも水面に届く or 15秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040d1f',
    deep:    '#071428',
    water:   '#0e2a4a',
    surface: '#1e4a7a',
    shine:   '#60a5fa',
    pop:     '#00eeff',
    fail:    '#ef4444',
    ui:      '#475569'
  };

  // Bubble colors (GBA-style palette)
  var BUBBLE_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#f87171'];

  var score = 0;
  var needed = 10;
  var timeLeft = 15;
  var done = false;

  var bubbles = [];
  var popFx = [];    // { x, y, r, color, t }
  var spawnTimer = 1.2;
  var SURFACE_Y = 160; // y above which bubble escapes

  function spawnBubble() {
    bubbles.push({
      x:     game.random(80, W - 80),
      y:     H + 80,
      r:     game.random(48, 88),
      vy:    -game.random(160, 320),
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: game.random(2, 4)
    });
  }

  game.onTap(function(x, y) {
    if (done) return;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      var dx = x - b.x;
      var dy = y - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) {
        popFx.push({ x: b.x, y: b.y, r: b.r, color: b.color, t: 0 });
        bubbles.splice(i, 1);
        score++;
        game.audio.play('se_tap', 0.7);
        if (score >= needed) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(score * 10 + Math.ceil(timeLeft) * 5);
          }, 400);
        }
        return; // one tap = one pop
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

      // spawn
      spawnTimer -= dt;
      // speed up over time
      var spawnInterval = Math.max(0.5, 1.3 - (15 - timeLeft) * 0.04);
      if (spawnTimer <= 0) {
        spawnBubble();
        spawnTimer = spawnInterval;
      }

      // update bubbles
      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i];
        b.wobble += b.wobbleSpeed * dt;
        b.x += Math.sin(b.wobble) * 18 * dt;
        b.y += b.vy * dt;

        if (b.y + b.r < SURFACE_Y) {
          // escaped to surface
          done = true;
          game.audio.play('se_failure');
          game.end.failure();
          return;
        }
      }
    }

    // update pop effects
    for (var j = popFx.length - 1; j >= 0; j--) {
      popFx[j].t += dt;
      if (popFx[j].t > 0.45) popFx.splice(j, 1);
    }

    // ---- draw ----
    // deep water background
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.3, W, H * 0.7, C.deep);
    game.draw.rect(0, H * 0.6, W, H * 0.4, C.water);

    // water surface shimmer
    game.draw.rect(0, SURFACE_Y, W, 20, C.surface);
    for (var w = 0; w < 6; w++) {
      var wx = (w * 200 + game.time.elapsed * 60) % W;
      game.draw.rect(wx, SURFACE_Y - 4, 80, 8, C.shine, 0.4);
    }
    game.draw.rect(0, 0, W, SURFACE_Y, '#040d1f');

    // timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#071428');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.shine : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score counter
    game.draw.text(score + ' / ' + needed, W / 2, 130, { size: 56, color: '#7dd3fc', bold: true });

    // danger zone line
    game.draw.rect(0, SURFACE_Y - 2, W, 4, '#ef444480');

    // bubbles
    for (var k = 0; k < bubbles.length; k++) {
      var b2 = bubbles[k];
      // outer glow
      game.draw.circle(b2.x, b2.y, b2.r + 8, b2.color, 0.2);
      // body
      game.draw.circle(b2.x, b2.y, b2.r, b2.color, 0.6);
      // inner fill (slightly transparent)
      game.draw.circle(b2.x, b2.y, b2.r, '#00000030');
      // shine
      game.draw.circle(b2.x - b2.r * 0.28, b2.y - b2.r * 0.3, b2.r * 0.22, '#ffffff', 0.8);
      game.draw.circle(b2.x - b2.r * 0.15, b2.y - b2.r * 0.18, b2.r * 0.09, '#ffffff', 0.95);
    }

    // pop effects
    for (var p = 0; p < popFx.length; p++) {
      var fx = popFx[p];
      var prog = fx.t / 0.45;
      game.draw.circle(fx.x, fx.y, fx.r * (1 + prog * 1.5), fx.color, (1 - prog) * 0.8);
      game.draw.circle(fx.x, fx.y, fx.r * (1 + prog * 2.5), C.pop, (1 - prog) * 0.4);
      // sparkles
      for (var s = 0; s < 6; s++) {
        var sa = (s / 6) * Math.PI * 2;
        var sd = fx.r * (0.8 + prog * 1.2);
        game.draw.circle(
          fx.x + Math.cos(sa) * sd,
          fx.y + Math.sin(sa) * sd,
          6 * (1 - prog),
          '#ffffff',
          (1 - prog)
        );
      }
    }

    // guide text at bottom
    if (!done) {
      game.draw.text('水面に届く前にタップ！', W / 2, H - 180, { size: 48, color: C.ui });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnBubble();
    spawnBubble();
  });
})(game);
