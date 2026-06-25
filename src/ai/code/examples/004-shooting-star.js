// 004-shooting-star.js
// 流れ星タップ — 消える前に3回つかまえる緊張感
// 操作: 流れ星をタップ
// 成功: 3回キャッチ  失敗: 12秒以内に3回キャッチできず

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#08091a',
    sky:   '#0d1540',
    star:  '#fffde0',
    trail: '#6b93ff',
    gem:   '#ffd700',
    hit:   '#00f5ff',
    ui:    '#475569'
  };

  var score = 0;
  var needed = 3;
  var timeLeft = 12;
  var done = false;

  // 背景の星（静的）
  var bgStars = [];
  for (var i = 0; i < 80; i++) {
    bgStars.push({
      x: game.random(0, W),
      y: game.random(100, H * 0.85),
      r: game.random(1, 5),
      phase: Math.random() * Math.PI * 2
    });
  }

  // 流れ星
  var star = null;
  var trail = [];
  var hitFx = null; // { x, y, t }
  var spawnCooldown = 0.8;

  function spawnStar() {
    var fromLeft = Math.random() < 0.5;
    star = {
      x:  fromLeft ? -60 : W + 60,
      y:  game.random(H * 0.15, H * 0.55),
      vx: fromLeft ? game.random(1400, 2000) : -game.random(1400, 2000),
      vy: game.random(500, 900),
      r:  32,
      hit: false,
      fadeOut: 0
    };
    trail = [];
  }

  game.onTap(function(x, y) {
    if (done || !star || star.hit) return;
    var dx = x - star.x;
    var dy = y - star.y;
    if (dx * dx + dy * dy <= (star.r + 40) * (star.r + 40)) {
      star.hit = true;
      hitFx = { x: star.x, y: star.y, t: 0 };
      score++;
      game.audio.play('se_tap', 0.9);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 30 + Math.ceil(timeLeft) * 6);
        }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // star logic
    if (star) {
      trail.unshift({ x: star.x, y: star.y });
      if (trail.length > 14) trail.pop();

      if (star.hit) {
        star.fadeOut += dt * 3;
        if (star.fadeOut >= 1) { star = null; spawnCooldown = 0.8; }
      } else {
        star.x += star.vx * dt;
        star.y += star.vy * dt;
        if (star.x < -200 || star.x > W + 200 || star.y > H + 100) {
          star = null;
          spawnCooldown = 0.6;
        }
      }
    } else if (!done) {
      spawnCooldown -= dt;
      if (spawnCooldown <= 0) spawnStar();
    }

    if (hitFx) {
      hitFx.t += dt;
      if (hitFx.t > 0.5) hitFx = null;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    // horizon glow
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#0a0e1e');

    // background stars
    for (var i = 0; i < bgStars.length; i++) {
      var bs = bgStars[i];
      var twinkle = 0.4 + 0.6 * Math.sin(game.time.elapsed * 1.3 + bs.phase);
      game.draw.circle(bs.x, bs.y, bs.r, '#ffffff', twinkle * 0.7);
    }

    // timer bar
    var ratio = Math.max(0, timeLeft / 12);
    game.draw.rect(0, 0, W, 72, '#0d1540');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.trail : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score pips
    for (var j = 0; j < needed; j++) {
      var px = W / 2 + (j - (needed - 1) / 2) * 80;
      game.draw.circle(px, 140, 26, j < score ? C.gem : '#1e293b');
      if (j < score) game.draw.circle(px, 140, 14, '#ffffffcc');
    }

    // trail
    for (var k = 0; k < trail.length; k++) {
      var tk = trail[k];
      var a = (1 - k / trail.length) * (star ? 1 - (star.fadeOut || 0) : 0);
      game.draw.circle(tk.x, tk.y, (star ? star.r : 32) * 0.55 * (1 - k / trail.length), C.trail, a * 0.65);
    }

    // star
    if (star) {
      var fade = 1 - (star.fadeOut || 0);
      game.draw.circle(star.x, star.y, star.r + 12, '#ffffff', fade * 0.25);
      game.draw.circle(star.x, star.y, star.r, C.star, fade);
      game.draw.circle(star.x, star.y, star.r * 0.38, '#ffffff', fade);
    }

    // hit effect
    if (hitFx) {
      var p = hitFx.t / 0.5;
      game.draw.circle(hitFx.x, hitFx.y, 40 + p * 100, C.hit, (1 - p) * 0.9);
      game.draw.circle(hitFx.x, hitFx.y, 20 + p * 50, '#ffffff', (1 - p) * 0.7);
      game.draw.text('★', hitFx.x, hitFx.y - 60 * p, { size: 80, color: C.gem, bold: true });
    }

    // guide
    if (!star && !done) {
      game.draw.text('流れ星を待て...', W / 2, H - 180, { size: 52, color: C.ui });
    } else if (star && !star.hit && !done) {
      var pulse = 0.8 + 0.2 * Math.sin(game.time.elapsed * 8);
      game.draw.text('タップ！', W / 2, H - 180, { size: 64 * pulse, color: '#7ba7ff', bold: true });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnStar();
  });
})(game);
