// 235-meteor-shield.js
// メテオシールド — 街に落ちてくる隕石をシールドでそらし続ける防衛ゲーム
// 操作: タップでシールドの向きをセット
// 成功: 30秒守る  失敗: 3個の隕石が街に着弾

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02040a',
    city:   '#1e293b',
    citHi:  '#334155',
    sky:    '#060c1a',
    meteor: '#f97316',
    metHi:  '#fed7aa',
    shield: '#22c55e',
    shldHi: '#86efac',
    deflect:'#f59e0b',
    hit:    '#ef4444',
    star:   '#1e3a5f',
    ui:     '#475569'
  };

  var CX = W / 2;
  var SHIELD_Y = H * 0.62;
  var SHIELD_W = 200;
  var shieldAngle = 0; // radians, normal to shield surface
  var meteors = [];
  var particles = [];
  var survived = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.4;
  var stars = [];
  var buildingDamage = [0, 0, 0, 0, 0]; // damage level per building

  for (var si = 0; si < 50; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.65 });
  }

  function spawnMeteor() {
    var x = 40 + Math.random() * (W - 80);
    var speed = 250 + survived * 10;
    // Aim roughly at city (bottom center ±200)
    var targetX = W / 2 + (Math.random() - 0.5) * 400;
    var targetY = H * 0.82;
    var dx = targetX - x, dy = targetY - (-40);
    var dist = Math.sqrt(dx * dx + dy * dy);
    meteors.push({
      x: x, y: -40,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      r: 20 + Math.random() * 14,
      deflected: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Angle shield toward tap from shield center
    var dx = tx - CX, dy = ty - SHIELD_Y;
    shieldAngle = Math.atan2(dy, dx);
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + hits === 0 ? 1000 : 500); }, 400);
        return;
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMeteor();
      spawnTimer = SPAWN_INTERVAL * (0.6 + Math.random() * 0.8);
    }

    // Shield normal vector (perpendicular to shield)
    var sNX = -Math.sin(shieldAngle);
    var sNY = Math.cos(shieldAngle);

    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Check shield collision
      if (!m.deflected) {
        var dsx = m.x - CX, dsy = m.y - SHIELD_Y;
        var projAlong = dsx * Math.cos(shieldAngle) + dsy * Math.sin(shieldAngle);
        var projPerp = dsx * sNX + dsy * sNY;

        if (Math.abs(projAlong) < SHIELD_W / 2 + m.r && Math.abs(projPerp) < 20 + m.r && m.y > SHIELD_Y - 100 && m.y < SHIELD_Y + 60) {
          // Deflect! Reflect velocity off shield normal
          var dot = m.vx * sNX + m.vy * sNY;
          m.vx -= 2 * dot * sNX;
          m.vy -= 2 * dot * sNY;
          m.deflected = true;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 6; pi++) {
            var ang = shieldAngle + Math.PI + (Math.random() - 0.5) * 1.5;
            particles.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.deflect });
          }
        }
      }

      // Out of bounds
      if (m.x < -100 || m.x > W + 100 || m.y < -200) {
        meteors.splice(mi, 1);
        continue;
      }

      // Hit city (bottom)
      if (m.y > H * 0.75 && !done) {
        hits++;
        meteors.splice(mi, 1);
        var buildIdx = Math.floor(Math.random() * 5);
        buildingDamage[buildIdx] = Math.min(3, (buildingDamage[buildIdx] || 0) + 1);
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: H * 0.78, vx: Math.cos(ang2) * 100, vy: Math.sin(ang2) * 100 - 200, life: 0.6, col: C.hit });
        }
        game.audio.play('se_failure', 0.6);
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
        continue;
      }
    }

    for (var pi3 = particles.length - 1; pi3 >= 0; pi3--) {
      particles[pi3].x += particles[pi3].vx * dt;
      particles[pi3].y += particles[pi3].vy * dt;
      particles[pi3].vy += 300 * dt;
      particles[pi3].life -= dt;
      if (particles[pi3].life <= 0) particles.splice(pi3, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.65, C.sky, 0.3);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      game.draw.circle(stars[sti].x, stars[sti].y, 2, '#fff', 0.3 + Math.random() * 0.05);
    }

    // Meteors
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      // Trail
      for (var ti = 1; ti <= 4; ti++) {
        game.draw.circle(m2.x - m2.vx * dt * ti * 1.5, m2.y - m2.vy * dt * ti * 1.5, m2.r * (1 - ti * 0.2), C.metHi, (1 - ti * 0.2) * 0.3);
      }
      game.draw.circle(m2.x, m2.y, m2.r + 5, C.metHi, 0.25);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor, 0.9);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // City buildings
    var buildW = W / 5;
    var buildHeights = [120, 200, 160, 220, 140];
    for (var bi = 0; bi < 5; bi++) {
      var bx = bi * buildW;
      var bh = buildHeights[bi];
      var dmg = buildingDamage[bi] || 0;
      var alpha = 1 - dmg * 0.25;
      game.draw.rect(bx + 10, H - bh - 30, buildW - 20, bh, C.city, alpha);
      game.draw.rect(bx + 10, H - bh - 30, buildW - 20, 10, C.citHi, alpha * 0.5);
      // Windows
      for (var wr = 0; wr < 3; wr++) {
        for (var wc = 0; wc < 2; wc++) {
          var litUp = Math.random() < 0.7;
          game.draw.rect(bx + 22 + wc * 30, H - bh - 20 + wr * 35, 20, 20, litUp ? '#f59e0b' : C.citHi, litUp ? 0.6 * alpha : 0.2);
        }
      }
      if (dmg > 0) {
        game.draw.text('💥'.replace(/[^\x00-\x7F]/g, '!'), bx + buildW / 2, H - bh - 50, { size: 32, color: C.hit, bold: true });
      }
    }
    // Ground
    game.draw.rect(0, H - 30, W, 30, C.citHi, 0.8);

    // Shield
    var sEndX1 = CX + Math.cos(shieldAngle) * SHIELD_W / 2;
    var sEndY1 = SHIELD_Y + Math.sin(shieldAngle) * SHIELD_W / 2;
    var sEndX2 = CX - Math.cos(shieldAngle) * SHIELD_W / 2;
    var sEndY2 = SHIELD_Y - Math.sin(shieldAngle) * SHIELD_W / 2;
    game.draw.line(sEndX2, sEndY2, sEndX1, sEndY1, C.shldHi, 10);
    game.draw.line(sEndX2, sEndY2, sEndX1, sEndY1, C.shield, 4);
    game.draw.circle(CX, SHIELD_Y, 16, C.shldHi, 0.8);

    // Hits display
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 30 + hi * 60, H * 0.88, 18, hi < hits ? C.hit : '#1e293b');
    }

    game.draw.text(survived.toFixed(1) + 's / ' + NEEDED, W / 2, 148, { size: 56, color: '#f1f5f9', bold: true });
    game.draw.text('タップでシールドを向ける', W / 2, H * 0.93, { size: 34, color: C.ui });

    var ratio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.8;
  });
})(game);
