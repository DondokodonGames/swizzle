// 760-meteor-shower.js
// メテオシャワー — 流星が地面に落ちる前にタップして迎撃せよ
// 操作: タップで流星を直接狙い撃ち
// 成功: 50個撃破  失敗: 10個着弾 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#02040a',
    meteor:  '#f97316',
    meteorHi:'#fde68a',
    meteorDk:'#7c2d12',
    trail:   '#fbbf24',
    ground:  '#1e293b',
    groundHi:'#334155',
    explode: '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#06080e',
    star:    '#94a3b8'
  };

  var GROUND_Y = H * 0.88;
  var meteors = [];
  var spawnTimer = 0;
  var spawnRate = 0.9;

  var score = 0;
  var NEEDED = 50;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var groundShakes = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  // Background stars
  var stars = [];
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * GROUND_Y, r: 0.5 + Math.random() * 2, tw: Math.random() * Math.PI * 2 });
  }

  // Ground craters
  var craters = [];

  function spawnMeteor() {
    var startX = Math.random() * W * 0.8 + W * 0.1;
    var angle = 0.3 + Math.random() * 0.7; // rad from vertical (slight to steep)
    var spd = 380 + Math.random() * 280 + score * 4;
    var vx = Math.sin(angle) * spd * (Math.random() < 0.5 ? 1 : -1);
    var vy = Math.cos(angle) * spd;
    var r = 18 + Math.random() * 22;
    meteors.push({ x: startX, y: -r * 2, vx: vx, vy: vy, r: r, life: 1.0 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Hit detection: find closest meteor to tap point
    var hitIdx = -1;
    var bestDist = 100; // hit radius
    for (var i = 0; i < meteors.length; i++) {
      var m = meteors[i];
      var dx = tx - m.x;
      var dy = ty - m.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < m.r + 60 && dist < bestDist) {
        bestDist = dist;
        hitIdx = i;
      }
    }

    if (hitIdx >= 0) {
      var m2 = meteors[hitIdx];
      score++;
      flashCol = C.correct;
      flashAnim = 0.15;
      resultText = '撃破！';
      resultTimer = 0.3;
      game.audio.play('se_tap', 0.1);
      // Explosion particles
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        var sp = 150 + Math.random() * 200;
        particles.push({ x: m2.x, y: m2.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp, life: 0.45, col: C.meteorHi, r: 10 });
      }
      for (var p2 = 0; p2 < 4; p2++) {
        var pa2 = Math.random() * Math.PI * 2;
        particles.push({ x: m2.x, y: m2.y, vx: Math.cos(pa2) * 80, vy: Math.sin(pa2) * 80, life: 0.6, col: C.correct, r: 14 });
      }
      meteors.splice(hitIdx, 1);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 280 + Math.ceil(timeLeft) * 120); }, 700);
      }
    } else {
      // Miss tap — no penalty but show visual
      particles.push({ x: tx, y: ty, vx: 0, vy: -60, life: 0.25, col: '#ffffff', r: 6 });
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

    // Spawn meteors
    spawnTimer -= dt;
    spawnRate = Math.max(0.45, 0.9 - score * 0.007);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = spawnRate;
      spawnMeteor();
      if (score > 20) spawnMeteor(); // Double spawn at higher scores
    }

    // Update meteors
    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      if (m.y > GROUND_Y) {
        // Impact
        missed++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = '着弾！！';
        resultTimer = 0.42;
        game.audio.play('se_failure', 0.35);
        craters.push({ x: m.x, life: 1.0, r: m.r });
        for (var pe = 0; pe < 10; pe++) {
          var pea = -Math.PI + Math.random() * Math.PI;
          particles.push({ x: m.x, y: GROUND_Y, vx: Math.cos(pea) * (120 + Math.random() * 160), vy: Math.sin(pea) * (80 + Math.random() * 120) - 60, life: 0.5, col: C.explode, r: 12 });
        }
        groundShakes.push(0.3);
        meteors.splice(mi, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
        }
      } else if (m.x < -m.r * 2 || m.x > W + m.r * 2) {
        meteors.splice(mi, 1);
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2.2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    for (var gi = craters.length - 1; gi >= 0; gi--) {
      craters[gi].life -= dt * 0.3;
      if (craters[gi].life <= 0) craters.splice(gi, 1);
    }

    for (var gsi = groundShakes.length - 1; gsi >= 0; gsi--) {
      groundShakes[gsi] -= dt * 3;
      if (groundShakes[gsi] <= 0) groundShakes.splice(gsi, 1);
    }

    var shake = groundShakes.length > 0 ? Math.sin(elapsed * 40) * 10 * groundShakes[0] : 0;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars (twinkling)
    for (var sti = 0; sti < stars.length; sti++) {
      var st = stars[sti];
      st.tw += dt * (1 + Math.random() * 2);
      var alpha = 0.3 + 0.3 * Math.sin(st.tw);
      game.draw.circle(st.x, st.y, st.r, C.star, alpha);
    }

    // Meteors (with trails)
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m3 = meteors[mi2];
      var spd2 = Math.sqrt(m3.vx * m3.vx + m3.vy * m3.vy);
      var nx = -m3.vx / spd2;
      var ny = -m3.vy / spd2;
      // Trail
      for (var tri = 1; tri <= 5; tri++) {
        var trx = m3.x + nx * tri * m3.r * 0.8;
        var try_ = m3.y + ny * tri * m3.r * 0.8;
        game.draw.circle(trx, try_, m3.r * (1 - tri * 0.16), C.trail, 0.5 - tri * 0.08);
      }
      // Shadow
      game.draw.circle(m3.x + 4, m3.y + 4, m3.r, '#000', 0.3);
      // Body
      game.draw.circle(m3.x, m3.y, m3.r, C.meteor, 0.92);
      game.draw.circle(m3.x - m3.r * 0.3, m3.y - m3.r * 0.3, m3.r * 0.35, C.meteorHi, 0.5);
      // Hit circle indicator (subtle)
      for (var hi2 = 0; hi2 < 12; hi2++) {
        var ha = hi2 * Math.PI * 2 / 12;
        game.draw.circle(m3.x + Math.cos(ha) * (m3.r + 48), m3.y + Math.sin(ha) * (m3.r + 48), 3, C.meteorDk, 0.3);
      }
    }

    // Ground
    var gy = GROUND_Y + shake;
    game.draw.rect(0, gy, W, H - gy, C.ground, 1.0);
    game.draw.rect(0, gy, W, 8, C.groundHi, 0.6);

    // Craters
    for (var ci = 0; ci < craters.length; ci++) {
      var cr = craters[ci];
      game.draw.circle(cr.x, gy, cr.r * 2 * cr.life, '#000', cr.life * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r * p.life, p.col, p.life);
    }

    if (!done) {
      game.draw.text('流星をタップして撃破！', W / 2, H * 0.92, { size: 36, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.20, { size: 56, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var msi = 0; msi < MAX_MISS; msi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 48 + msi * 96, H * 0.955, 20, msi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnMeteor();
    spawnMeteor();
  });
})(game);
