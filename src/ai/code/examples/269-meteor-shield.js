// 269-meteor-shield.js
// メテオシールド — 惑星を守る最後の盾、迫りくる流星を弾き返せ
// 操作: タップで盾を回転させて流星を反射
// 成功: 30個の流星を弾く  失敗: 惑星に5個当たる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020510',
    space:  '#0a0f1e',
    planet: '#1e4080',
    planHi: '#3b82f6',
    shield: '#22c55e',
    sldHi:  '#86efac',
    meteor: '#f97316',
    metHi:  '#fed7aa',
    hit:    '#ef4444',
    star:   '#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var CX = W / 2, CY = H * 0.55;
  var PLANET_R = 90;
  var SHIELD_R = 160;
  var SHIELD_ARC = Math.PI * 0.55; // arc span
  var shieldAngle = -Math.PI / 2; // pointing up

  var meteors = [];
  var deflected = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HIT = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var stars = [];
  var hitFlash = 0;
  var planetPulse = 0;

  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5 });
  }

  function spawnMeteor() {
    var ang = Math.random() * Math.PI * 2;
    var dist = Math.max(W, H) * 0.7;
    var mx = CX + Math.cos(ang) * dist;
    var my = CY + Math.sin(ang) * dist;
    var dx = CX - mx, dy = CY - my;
    var len = Math.sqrt(dx * dx + dy * dy);
    var spd = 280 + Math.random() * 140;
    meteors.push({
      x: mx, y: my,
      vx: (dx / len) * spd,
      vy: (dy / len) * spd,
      r: 14 + Math.random() * 10,
      trail: [],
      deflected: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - CX, dy = ty - CY;
    shieldAngle = Math.atan2(dy, dx);
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (hitFlash > 0) hitFlash -= dt;
    planetPulse += dt * 3;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnMeteor();
      spawnTimer = 0.8 + Math.random() * 0.8 - deflected * 0.005;
    }

    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 8) m.trail.shift();

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      var dx = m.x - CX, dy = m.y - CY;
      var dist = Math.sqrt(dx * dx + dy * dy);

      // Check shield collision
      if (!m.deflected && dist < SHIELD_R + m.r && dist > SHIELD_R - 16) {
        var ang = Math.atan2(dy, dx);
        var diff = ang - shieldAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < SHIELD_ARC / 2) {
          // Deflect
          m.deflected = true;
          var nx = dx / dist, ny = dy / dist;
          var dot = m.vx * nx + m.vy * ny;
          m.vx -= 2 * dot * nx;
          m.vy -= 2 * dot * ny;
          deflected++;
          game.audio.play('se_success', 0.4);
          for (var pi = 0; pi < 8; pi++) {
            var a = Math.random() * Math.PI * 2;
            particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.sldHi });
          }
          if (deflected >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(deflected * 120 + Math.ceil(timeLeft) * 80); }, 400);
          }
        }
      }

      // Check planet collision
      if (dist < PLANET_R + m.r) {
        hits++;
        hitFlash = 0.4;
        game.audio.play('se_failure', 0.6);
        meteors.splice(mi, 1);
        for (var pi2 = 0; pi2 < 6; pi2++) {
          var a2 = Math.random() * Math.PI * 2;
          particles.push({ x: CX, y: CY, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150, life: 0.6, col: C.hit });
        }
        if (hits >= MAX_HIT && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }

      // Out of bounds
      if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200) {
        meteors.splice(mi, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.hit, hitFlash * 0.3);

    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      game.draw.circle(s.x, s.y, s.r, C.star, 0.5 + 0.3 * Math.abs(Math.sin(elapsed * 2 + si2)));
    }

    // Planet
    var pulse = 1 + 0.04 * Math.sin(planetPulse);
    game.draw.circle(CX, CY, PLANET_R * pulse + 20, C.planHi, 0.08);
    game.draw.circle(CX, CY, PLANET_R * pulse, C.planet, 0.95);
    game.draw.circle(CX - 28, CY - 28, PLANET_R * 0.35, C.planHi, 0.2);

    // Shield arc
    var shA1 = shieldAngle - SHIELD_ARC / 2;
    var shA2 = shieldAngle + SHIELD_ARC / 2;
    var segs = 20;
    var prev = null;
    for (var si3 = 0; si3 <= segs; si3++) {
      var a = shA1 + (shA2 - shA1) * (si3 / segs);
      var sx = CX + Math.cos(a) * SHIELD_R;
      var sy = CY + Math.sin(a) * SHIELD_R;
      if (prev) game.draw.line(prev.x, prev.y, sx, sy, C.shield, 14);
      prev = { x: sx, y: sy };
    }
    // Shield glow tips
    var tip1x = CX + Math.cos(shA1) * SHIELD_R;
    var tip1y = CY + Math.sin(shA1) * SHIELD_R;
    var tip2x = CX + Math.cos(shA2) * SHIELD_R;
    var tip2y = CY + Math.sin(shA2) * SHIELD_R;
    game.draw.circle(tip1x, tip1y, 10, C.sldHi, 0.9);
    game.draw.circle(tip2x, tip2y, 10, C.sldHi, 0.9);

    // Meteors
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      for (var ti = 0; ti < m2.trail.length; ti++) {
        var a3 = (ti / m2.trail.length) * 0.5;
        game.draw.circle(m2.trail[ti].x, m2.trail[ti].y, m2.r * 0.6 * a3, C.meteor, a3 * 0.7);
      }
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor, 0.9);
      game.draw.circle(m2.x - m2.r * 0.3, m2.y - m2.r * 0.3, m2.r * 0.3, C.metHi, 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 6 * p.life * 2, p.col, p.life);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 28 + hi * 56, H * 0.92, 16, hi < hits ? C.hit : '#050a14');
    }

    game.draw.text(deflected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.shield : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 1.0;
  });
})(game);
