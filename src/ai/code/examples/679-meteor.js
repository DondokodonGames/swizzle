// 679-meteor.js
// 流星キャッチ — 夜空を横切る流れ星を瞬時につかめ
// 操作: タップで流れ星をキャッチ
// 成功: 25個キャッチ  失敗: 10個逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010210',
    meteor:  '#fde68a',
    trail:   '#93c5fd',
    glow:    '#e0f2fe',
    caught:  '#22c55e',
    missed:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#04051a'
  };

  var meteors = [];
  var spawnTimer = 0;
  var spawnInterval = 1.6;

  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.caught;
  var resultTimer = 0, resultText = '';

  var stars = [];
  for (var s = 0; s < 150; s++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() < 0.8 ? 1.5 : 3,
      phase: Math.random() * Math.PI * 2
    });
  }

  function spawnMeteor() {
    var startX = W * 0.2 + Math.random() * W * 0.9;
    var startY = -60 + Math.random() * H * 0.35;
    var angle = 2.1 + (Math.random() - 0.5) * 0.5;
    var speed = 1000 + Math.random() * 600;
    var len = 150 + Math.random() * 200;
    meteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed: speed,
      len: len,
      tapped: false,
      counted: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      if (m.tapped || m.counted) continue;
      var dx = tx - m.x, dy = ty - m.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      // Also check midpoint of trail
      var midX = m.x - (m.vx / m.speed) * m.len * 0.5;
      var midY = m.y - (m.vy / m.speed) * m.len * 0.5;
      var dmx = tx - midX, dmy = ty - midY;
      var mdist = Math.sqrt(dmx * dmx + dmy * dmy);
      if (dist < 100 || mdist < 90) {
        m.tapped = true;
        caught++;
        flashCol = C.caught;
        flashAnim = 0.3;
        resultText = 'キャッチ！';
        resultTimer = 0.5;
        game.audio.play('se_success', 0.5);
        for (var p = 0; p < 7; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: m.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.5, col: C.meteor });
        }
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
        break;
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    spawnInterval = Math.max(0.7, 1.6 - elapsed * 0.015);
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnMeteor();
      if (elapsed > 25 && Math.random() < 0.35) spawnMeteor();
    }

    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      var offScreen = m.x < -300 || m.x > W + 300 || m.y > H + 300;
      if (!m.tapped && !m.counted && offScreen) {
        m.counted = true;
        missed++;
        flashCol = C.missed;
        flashAnim = 0.2;
        resultText = '逃した！';
        resultTimer = 0.35;
        game.audio.play('se_failure', 0.18);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
      if (offScreen || (m.tapped && m.x < -300)) {
        meteors.splice(i, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si = 0; si < stars.length; si++) {
      var star = stars[si];
      var alpha = 0.2 + 0.25 * Math.sin(elapsed * 1.1 + star.phase);
      game.draw.circle(star.x, star.y, star.r, '#c7d2fe', alpha);
    }

    // Constellation suggestion lines
    for (var cl = 0; cl < 5; cl++) {
      var cx1 = stars[cl * 8].x, cy1 = stars[cl * 8].y;
      var cx2 = stars[cl * 8 + 3].x, cy2 = stars[cl * 8 + 3].y;
      game.draw.line(cx1, cy1, cx2, cy2, '#ffffff06', 1);
    }

    // Meteors
    for (var mi = 0; mi < meteors.length; mi++) {
      var met = meteors[mi];
      if (met.tapped) continue;
      var dir = met.speed > 0 ? 1 : -1;
      var tailX = met.x - (met.vx / met.speed) * met.len;
      var tailY = met.y - (met.vy / met.speed) * met.len;

      // Trail gradient: draw multiple segments fading out
      for (var seg = 0; seg < 5; seg++) {
        var t0 = seg / 5, t1 = (seg + 1) / 5;
        var sx0 = tailX + (met.x - tailX) * t0;
        var sy0 = tailY + (met.y - tailY) * t0;
        var sx1 = tailX + (met.x - tailX) * t1;
        var sy1 = tailY + (met.y - tailY) * t1;
        game.draw.line(sx0, sy0, sx1, sy1, C.trail, 3 + seg * 1.5);
      }

      // Head glow
      game.draw.circle(met.x, met.y, 24, C.glow, 0.3);
      game.draw.circle(met.x, met.y, 12, C.meteor, 0.95);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 64, color: flashCol, bold: true });
    }

    game.draw.text('流れ星をタップ！', W / 2, H * 0.13, { size: 42, color: '#ffffff44' });

    for (var mii = 0; mii < MAX_MISS; mii++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mii * 88, H * 0.955, 18, mii < missed ? C.missed : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.caught : C.missed);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    spawnMeteor();
  });
})(game);
