// 121-meteor-shower.js
// 流星雨 — 降り注ぐ流星の軌跡を指でなぞってエネルギーを収集する宇宙的快感
// 操作: タップで流星をキャッチ
// 成功: 30個収集  失敗: 10個見逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000308',
    star:    '#1a2240',
    meteor:  '#f97316',
    meteorHi:'#fcd34d',
    trail:   '#7c3aed',
    collected:'#22c55e',
    missed:  '#ef4444',
    ui:      '#334155'
  };

  var stars = [];
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5 });
  }

  var meteors = []; // { x, y, vx, vy, r, trail, caught, missed }
  var METEOR_R = 22;
  var SPAWN_INTERVAL = 0.6;
  var spawnTimer = 0;

  var collected = 0;
  var needed = 30;
  var misses = 0;
  var maxMisses = 10;
  var timeLeft = 40;
  var done = false;
  var sparkles = [];
  var catchFlash = 0;

  function spawnMeteor() {
    var startX = Math.random() * W * 1.2 - W * 0.1;
    var angle = Math.PI * 0.55 + Math.random() * Math.PI * 0.3;
    var speed = 500 + Math.random() * 300;
    meteors.push({
      x: startX, y: -40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: METEOR_R,
      trail: [],
      caught: false, missed: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      if (m.caught || m.missed) continue;
      var dx = tx - m.x, dy = ty - m.y;
      if (Math.sqrt(dx*dx + dy*dy) < m.r + 36) {
        m.caught = true;
        collected++;
        catchFlash = 0.3;
        // Sparkle burst
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          sparkles.push({ x: m.x, y: m.y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.5, color: C.meteorHi });
        }
        game.audio.play('se_tap', 0.8);
        if (collected >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(collected * 25 + Math.ceil(timeLeft) * 12); }, 400);
        }
        return;
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

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - collected * 0.008;
      if (spawnTimer < 0.3) spawnTimer = 0.3;
      spawnMeteor();
    }

    // Update meteors
    for (var i = 0; i < meteors.length; i++) {
      var m = meteors[i];
      if (m.caught) continue;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.trail.push({ x: m.x, y: m.y, age: 0 });
      for (var ti = 0; ti < m.trail.length; ti++) m.trail[ti].age += dt;
      m.trail = m.trail.filter(function(t) { return t.age < 0.25; });

      if (!m.missed && (m.y > H + 60 || m.x < -100 || m.x > W + 100)) {
        m.missed = true;
        misses++;
        game.audio.play('se_failure', 0.3);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }
    meteors = meteors.filter(function(m) { return !m.caught && !(m.missed && m.y > H + 100); });

    // Sparkles
    for (var sp = 0; sp < sparkles.length; sp++) {
      sparkles[sp].x += sparkles[sp].vx * dt;
      sparkles[sp].y += sparkles[sp].vy * dt;
      sparkles[sp].vy += 300 * dt;
      sparkles[sp].life -= dt;
    }
    sparkles = sparkles.filter(function(s) { return s.life > 0; });

    if (catchFlash > 0) catchFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars
    for (var sti = 0; sti < stars.length; sti++) {
      var s = stars[sti];
      var blink = 0.2 + 0.5 * Math.abs(Math.sin(timeLeft * 0.7 + sti));
      game.draw.circle(s.x, s.y, s.r, '#fff', blink);
    }

    // Catch flash
    if (catchFlash > 0) {
      game.draw.rect(0, 0, W, H, C.collected, catchFlash * 0.12);
    }

    // Meteors
    for (var mi = 0; mi < meteors.length; mi++) {
      var m2 = meteors[mi];
      if (m2.caught) continue;
      // Trail
      for (var tri = 0; tri < m2.trail.length; tri++) {
        var tr = m2.trail[tri];
        var tf = 1 - tr.age / 0.25;
        game.draw.circle(tr.x, tr.y, m2.r * tf * 0.8, C.trail, tf * 0.3);
      }
      // Meteor glow
      game.draw.circle(m2.x, m2.y, m2.r + 10, C.meteorHi, 0.3);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor);
      game.draw.circle(m2.x - m2.r * 0.3, m2.y - m2.r * 0.3, m2.r * 0.3, C.meteorHi, 0.7);
    }

    // Sparkles
    for (var spi = 0; spi < sparkles.length; spi++) {
      var sp2 = sparkles[spi];
      game.draw.circle(sp2.x, sp2.y, 6 * sp2.life * 2, sp2.color, sp2.life);
    }

    // Score
    game.draw.text(collected + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    // Miss indicators
    for (var mii = 0; mii < maxMisses; mii++) {
      var mxi = W / 2 + (mii - (maxMisses - 1) / 2) * 52;
      game.draw.circle(mxi, 218, 16, mii < misses ? C.missed : '#0a1020');
    }

    game.draw.text('流星をタップして捕まえろ！', W / 2, H * 0.9, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#8b5cf6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnMeteor();
    spawnMeteor();
  });
})(game);
