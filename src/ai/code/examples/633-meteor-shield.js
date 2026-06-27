// 633-meteor-shield.js
// メテオシールド — 惑星を守れ、隕石が来る前にシールドを展開しろ
// 操作: タップでシールドセクターを起動/停止
// 成功: 30秒惑星を守る  失敗: 惑星HP0 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010208',
    planet:  '#1d4ed8',
    planetHi:'#93c5fd',
    core:    '#60a5fa',
    shield:  '#f59e0b',
    shieldHi:'#fde68a',
    meteor:  '#9a3412',
    meteorHi:'#fb923c',
    hit:     '#ef4444',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#05070f',
    stars:   '#334155'
  };

  var CX = W / 2, CY = H * 0.52;
  var PLANET_R = 150;
  var SHIELD_R = 260;
  var NUM_SECTORS = 6;

  var shieldActive = [false, false, false, false, false, false]; // 6 sectors
  var shieldCooldown = [0, 0, 0, 0, 0, 0]; // cooldown per sector
  var SHIELD_COST = 0.8; // energy per second per active shield
  var energy = 100;

  var meteorList = [];
  var hp = 100;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var flashAnim = 0;

  function spawnMeteor() {
    var angle = Math.random() * Math.PI * 2;
    var spawnR = 700;
    meteorList.push({
      x: CX + Math.cos(angle) * spawnR,
      y: CY + Math.sin(angle) * spawnR,
      angle: angle + Math.PI + (Math.random() - 0.5) * 0.4,
      speed: 220 + elapsed * 3 + Math.random() * 80,
      r: 18 + Math.random() * 20,
      sectorAngle: angle + Math.PI // approximate inbound angle
    });
  }

  function getSector(angle) {
    // Normalize angle 0..2PI
    var a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(a / (Math.PI * 2) * NUM_SECTORS);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Determine which sector was tapped based on angle from center
    var dx = tx - CX, dy = ty - CY;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 80) {
      // Tap center — toggle all shields off
      for (var i = 0; i < NUM_SECTORS; i++) shieldActive[i] = false;
      return;
    }
    var angle = Math.atan2(dy, dx);
    var sector = getSector(angle);
    if (shieldCooldown[sector] <= 0) {
      shieldActive[sector] = !shieldActive[sector];
      game.audio.play('se_tap', 0.15);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(hp) * 200 + 60 * 100); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Energy drain from shields
    var activeCount = 0;
    for (var s = 0; s < NUM_SECTORS; s++) {
      if (shieldCooldown[s] > 0) shieldCooldown[s] -= dt;
      if (shieldActive[s]) activeCount++;
    }
    energy -= activeCount * SHIELD_COST * dt * 10;
    energy = Math.max(0, Math.min(100, energy + dt * 8)); // passive regen
    if (energy <= 0) {
      for (var s2 = 0; s2 < NUM_SECTORS; s2++) {
        if (shieldActive[s2]) { shieldActive[s2] = false; shieldCooldown[s2] = 1.5; }
      }
    }

    // Spawn meteors
    spawnTimer += dt;
    if (spawnTimer > Math.max(0.5, 1.8 - elapsed * 0.02)) {
      spawnTimer = 0;
      spawnMeteor();
    }

    // Update meteors
    for (var mi = meteorList.length - 1; mi >= 0; mi--) {
      var m = meteorList[mi];
      m.x += Math.cos(m.angle) * m.speed * dt;
      m.y += Math.sin(m.angle) * m.speed * dt;
      var dx2 = m.x - CX, dy2 = m.y - CY;
      var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      // Check shield intercept
      if (dist <= SHIELD_R + m.r) {
        var mAngle = Math.atan2(dy2, dx2);
        var sec = getSector(mAngle);
        if (shieldActive[sec] && energy > 5) {
          // Shield blocked!
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: m.x, y: m.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.shieldHi });
          }
          meteorList.splice(mi, 1);
          game.audio.play('se_tap', 0.2);
          continue;
        }
      }

      // Check planet hit
      if (dist <= PLANET_R + m.r) {
        hp -= 12 + m.r * 0.3;
        hp = Math.max(0, hp);
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.3);
        for (var p2 = 0; p2 < 5; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: m.y, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.35, col: C.meteorHi });
        }
        meteorList.splice(mi, 1);
        if (hp <= 0 && !done) {
          done = true;
          game.audio.play('se_failure', 0.7);
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }

      // Out of range
      if (dist > 900) meteorList.splice(mi, 1);
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
    for (var st = 0; st < 40; st++) {
      var sx = (st * 53 + 17) % W;
      var sy = (st * 89 + 31) % H;
      game.draw.circle(sx, sy, 1.5, C.stars, 0.3 + Math.sin(elapsed + st) * 0.15);
    }

    // Meteors
    for (var mi2 = 0; mi2 < meteorList.length; mi2++) {
      var m2 = meteorList[mi2];
      game.draw.circle(m2.x + 4, m2.y + 4, m2.r, '#000', 0.3);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor, 0.9);
      game.draw.circle(m2.x - m2.r * 0.3, m2.y - m2.r * 0.3, m2.r * 0.4, C.meteorHi, 0.5);
    }

    // Shield sectors
    for (var s3 = 0; s3 < NUM_SECTORS; s3++) {
      var startAngle = (s3 / NUM_SECTORS) * Math.PI * 2;
      var endAngle = ((s3 + 1) / NUM_SECTORS) * Math.PI * 2;
      var midAngle = (startAngle + endAngle) / 2;
      var isActive = shieldActive[s3];
      var onCooldown = shieldCooldown[s3] > 0;
      var alpha = isActive ? (0.5 + Math.sin(elapsed * 6 + s3) * 0.2) : (onCooldown ? 0.1 : 0.15);
      var col = onCooldown ? C.hit : (isActive ? C.shield : C.stars);

      // Draw sector arc as a thick arc (approximated by overlapping circles along arc)
      for (var arc = 0; arc <= 8; arc++) {
        var arcA = startAngle + (arc / 8) * (endAngle - startAngle);
        game.draw.circle(CX + Math.cos(arcA) * SHIELD_R, CY + Math.sin(arcA) * SHIELD_R, isActive ? 22 : 14, col, alpha);
      }

      // Tap indicator
      var tipX = CX + Math.cos(midAngle) * (SHIELD_R + 80);
      var tipY = CY + Math.sin(midAngle) * (SHIELD_R + 80);
      game.draw.circle(tipX, tipY, 28, col, isActive ? 0.6 : 0.25);
    }

    // Planet
    game.draw.circle(CX + 8, CY + 8, PLANET_R, '#000', 0.3);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX - 50, CY - 50, PLANET_R * 0.35, C.core, 0.4);
    game.draw.circle(CX - 40, CY - 40, PLANET_R * 0.15, C.planetHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // HP bar
    var hpRatio = hp / 100;
    game.draw.rect(W / 2 - 200, H * 0.91, 400, 20, C.ui, 0.8);
    game.draw.rect(W / 2 - 200, H * 0.91, 400 * hpRatio, 20, hpRatio > 0.4 ? C.safe : C.hit, 0.9);
    game.draw.text('HP ' + Math.ceil(hp), W / 2, H * 0.91 + 36, { size: 32, color: hpRatio > 0.4 ? C.safe : C.hit });

    // Energy bar
    var eRatio = energy / 100;
    game.draw.rect(W / 2 - 200, H * 0.95, 400, 16, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.95, 400 * eRatio, 16, C.shield, 0.8);
    game.draw.text('EN', W / 2, H * 0.95 + 30, { size: 26, color: C.shieldHi });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnMeteor();
    spawnMeteor();
  });
})(game);
