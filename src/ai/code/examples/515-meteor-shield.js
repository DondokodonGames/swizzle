// 515-meteor-shield.js
// メテオシールド — 落下する隕石をタップで盾を出して防ぐ
// 操作: 隕石の落下地点をタップして盾を展開
// 成功: 25個の隕石を防ぐ  失敗: 5個通過 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000010',
    stars:   '#c7d2fe',
    meteor:  '#f97316',
    meteorHi:'#fed7aa',
    meteor2: '#ef4444',
    shield:  '#3b82f6',
    shieldHi:'#93c5fd',
    base:    '#22c55e',
    baseHi:  '#86efac',
    block:   '#fbbf24',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var BASE_Y = H * 0.88;
  var SHIELD_R = 80;
  var SHIELD_DURATION = 0.4;

  var meteors = [];
  var shields = [];
  var particles = [];
  var stars = [];
  var blocked = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var nextMeteor = 0.8;

  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, twinkle: Math.random() * Math.PI * 2 });
  }

  function spawnMeteor() {
    var x = 60 + Math.random() * (W - 120);
    var speed = 400 + blocked * 12;
    meteors.push({ x: x, y: -40, vy: speed, r: 22 + Math.random() * 16, col: Math.random() < 0.3 ? C.meteor2 : C.meteor });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    shields.push({ x: tx, y: ty, life: SHIELD_DURATION, maxLife: SHIELD_DURATION });
    game.audio.play('se_tap', 0.4);
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
    nextMeteor -= dt;
    if (nextMeteor <= 0 && !done) {
      spawnMeteor();
      if (blocked > 10 && Math.random() < 0.4) spawnMeteor();
      nextMeteor = Math.max(0.3, 0.8 - blocked * 0.01);
    }

    // Update shields
    for (var shi = shields.length - 1; shi >= 0; shi--) {
      shields[shi].life -= dt;
      if (shields[shi].life <= 0) shields.splice(shi, 1);
    }

    // Update meteors
    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.y += m.vy * dt;

      // Check shield collision
      var shieldHit = false;
      for (var shi2 = 0; shi2 < shields.length; shi2++) {
        var sh = shields[shi2];
        var dx = m.x - sh.x, dy = m.y - sh.y;
        if (Math.sqrt(dx * dx + dy * dy) < SHIELD_R + m.r) {
          // Blocked!
          blocked++;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.block });
          }
          meteors.splice(mi, 1);
          shieldHit = true;
          if (blocked >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(blocked * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
          break;
        }
      }
      if (shieldHit) continue;

      // Check if reached base
      if (m.y > BASE_Y) {
        missed++;
        game.audio.play('se_failure', 0.5);
        for (var pi2 = 0; pi2 < 10; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: BASE_Y, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150 - 80, life: 0.5, col: m.col });
        }
        meteors.splice(mi, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Twinkle stars
    for (var sti = 0; sti < stars.length; sti++) {
      stars[sti].twinkle += dt;
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti2 = 0; sti2 < stars.length; sti2++) {
      var star = stars[sti2];
      game.draw.circle(star.x, star.y, star.r, C.stars, 0.4 + Math.sin(star.twinkle) * 0.3);
    }

    // Base
    game.draw.rect(0, BASE_Y, W, H - BASE_Y, C.base, 0.3);
    game.draw.rect(0, BASE_Y, W, 8, C.baseHi, 0.6);

    // Shields
    for (var shi3 = 0; shi3 < shields.length; shi3++) {
      var sh2 = shields[shi3];
      var a = sh2.life / sh2.maxLife;
      game.draw.circle(sh2.x, sh2.y, SHIELD_R + 20, C.shieldHi, a * 0.2);
      game.draw.circle(sh2.x, sh2.y, SHIELD_R, C.shield, a * 0.7);
    }

    // Meteors
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      // Tail
      game.draw.line(m2.x, m2.y - m2.r - 10, m2.x, m2.y - m2.r - 40, C.meteorHi, 5);
      game.draw.circle(m2.x, m2.y, m2.r + 8, m2.col, 0.2);
      game.draw.circle(m2.x, m2.y, m2.r, m2.col, 0.9);
      game.draw.circle(m2.x - m2.r * 0.25, m2.y - m2.r * 0.25, m2.r * 0.2, '#fff', 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Miss dots
    for (var missi = 0; missi < MAX_MISS; missi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + missi * 112, H * 0.955, 20, missi < missed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(blocked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.shield : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
