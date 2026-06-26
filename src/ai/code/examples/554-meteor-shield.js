// 554-meteor-shield.js
// メテオシールド — タップで展開するシールドで惑星を流星から守る
// 操作: タップで惑星の周りにシールドパネルを展開（方向自動選択）
// 成功: 30秒生き残る  失敗: 惑星に5回被弾

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000010',
    space:   '#00000a',
    planet:  '#2266ff',
    planetHi:'#66aaff',
    planetGl:'#2266ff33',
    shield:  '#00ccff',
    shieldHi:'#88eeff',
    shieldGl:'#00ccff33',
    meteor:  '#ff6633',
    meteorHi:'#ffaa66',
    meteorGl:'#ff663322',
    hit:     '#ef4444',
    star:    '#ffffff',
    text:    '#f1f5f9',
    ui:      '#334466',
    win:     '#ffcc00'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var PLANET_R = 110;
  var SHIELD_DIST = 180;
  var SHIELD_R = 60;
  var SHIELD_SEGMENTS = 8;
  var SHIELD_LIFE = 2.5; // seconds per shield
  var MAX_SHIELDS = 3;

  var shields = []; // {angle, life, maxLife}
  var meteors = [];
  var planetHits = 0;
  var MAX_HITS = 5;
  var survived = 0;
  var NEEDED_TIME = 30;
  var done = false;
  var timeLeft = NEEDED_TIME;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var nextMeteor = 0.8;
  var stars = [];
  var shieldCooldown = 0;

  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, twinkle: Math.random() * Math.PI * 2 });
  }

  function spawnMeteor() {
    // Come from random edge direction
    var ang = Math.random() * Math.PI * 2;
    var dist = Math.max(W, H) * 0.7;
    var mx = CX + Math.cos(ang) * dist;
    var my = CY + Math.sin(ang) * dist;
    // Aim roughly at planet with spread
    var aimAng = ang + Math.PI + (Math.random() - 0.5) * 0.4;
    var speed = 400 + Math.random() * 300 + elapsed * 5;
    meteors.push({
      x: mx, y: my,
      vx: Math.cos(aimAng) * speed,
      vy: Math.sin(aimAng) * speed,
      r: 22 + Math.random() * 20,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 4
    });
  }

  function addShield(tx, ty) {
    if (shields.length >= MAX_SHIELDS || shieldCooldown > 0) return;
    // Place shield in direction of tap from planet center
    var ang = Math.atan2(ty - CY, tx - CX);
    // Snap to nearest segment
    var segAng = Math.round(ang / (Math.PI * 2 / SHIELD_SEGMENTS)) * (Math.PI * 2 / SHIELD_SEGMENTS);
    // Check if slot occupied
    for (var i = 0; i < shields.length; i++) {
      var diff = Math.abs(shields[i].angle - segAng) % (Math.PI * 2);
      if (Math.min(diff, Math.PI * 2 - diff) < 0.2) return; // occupied
    }
    shields.push({ angle: segAng, life: SHIELD_LIFE, maxLife: SHIELD_LIFE });
    shieldCooldown = 0.3;
    game.audio.play('se_tap', 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    addShield(tx, ty);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.round(elapsed) * 200 + (MAX_HITS - planetHits) * 500); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (shieldCooldown > 0) shieldCooldown -= dt;

    // Update shields
    for (var si2 = shields.length - 1; si2 >= 0; si2--) {
      shields[si2].life -= dt;
      if (shields[si2].life <= 0) shields.splice(si2, 1);
    }

    // Spawn meteors
    nextMeteor -= dt;
    if (nextMeteor <= 0 && !done) {
      spawnMeteor();
      nextMeteor = Math.max(0.4, 0.8 - elapsed * 0.008);
    }

    // Update meteors
    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.angle += m.spin * dt;

      // Off screen
      if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200) {
        meteors.splice(mi, 1);
        continue;
      }

      var hitShield = false;
      // Check shield collision
      for (var si3 = shields.length - 1; si3 >= 0; si3--) {
        var sh = shields[si3];
        var shx = CX + Math.cos(sh.angle) * SHIELD_DIST;
        var shy = CY + Math.sin(sh.angle) * SHIELD_DIST;
        var sdx = m.x - shx, sdy = m.y - shy;
        if (Math.sqrt(sdx * sdx + sdy * sdy) < SHIELD_R + m.r) {
          // Shield hit!
          hitShield = true;
          shields.splice(si3, 1);
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: shx, y: shy, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.4, col: C.shieldHi });
          }
          meteors.splice(mi, 1);
          break;
        }
      }
      if (hitShield) continue;

      // Check planet collision
      var dx = m.x - CX, dy = m.y - CY;
      if (Math.sqrt(dx * dx + dy * dy) < PLANET_R + m.r) {
        planetHits++;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.6);
        for (var pi2 = 0; pi2 < 12; pi2++) {
          var ang3 = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: m.y, vx: Math.cos(ang3) * 240, vy: Math.sin(ang3) * 240, life: 0.5, col: C.meteor });
        }
        meteors.splice(mi, 1);
        if (planetHits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    for (var st = 0; st < stars.length; st++) {
      var s = stars[st];
      var alpha = 0.3 + Math.sin(elapsed * 1.5 + s.twinkle) * 0.3;
      game.draw.circle(s.x, s.y, s.r, C.star, alpha);
    }

    // Planet glow
    game.draw.circle(CX, CY, PLANET_R + 40, C.planetGl, 0.5);
    game.draw.circle(CX, CY, PLANET_R + 20, C.planet, 0.15);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.95);
    game.draw.circle(CX - 24, CY - 28, PLANET_R * 0.35, C.planetHi, 0.4);

    // Shields
    for (var si4 = 0; si4 < shields.length; si4++) {
      var sh2 = shields[si4];
      var shx2 = CX + Math.cos(sh2.angle) * SHIELD_DIST;
      var shy2 = CY + Math.sin(sh2.angle) * SHIELD_DIST;
      var lifeRatio = sh2.life / sh2.maxLife;
      game.draw.circle(shx2, shy2, SHIELD_R + 8, C.shieldGl, lifeRatio * 0.5);
      game.draw.circle(shx2, shy2, SHIELD_R, C.shield, lifeRatio * 0.9);
      // Life indicator
      for (var li = 0; li < 8; li++) {
        if (li / 8 > lifeRatio) continue;
        var lAng = li / 8 * Math.PI * 2 - Math.PI / 2;
        game.draw.circle(shx2 + Math.cos(lAng) * (SHIELD_R + 18), shy2 + Math.sin(lAng) * (SHIELD_R + 18), 7, C.shieldHi, 0.8);
      }
    }

    // Meteors
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      game.draw.circle(m2.x, m2.y, m2.r + 6, C.meteorGl, 0.6);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor, 0.9);
      game.draw.circle(m2.x + Math.cos(m2.angle) * m2.r * 0.5, m2.y + Math.sin(m2.angle) * m2.r * 0.5, m2.r * 0.3, C.meteorHi, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.15);

    // Shields available indicator
    var availShields = MAX_SHIELDS - shields.length;
    game.draw.text('シールド: ' + availShields + '/' + MAX_SHIELDS, W / 2, H * 0.82, { size: 44, color: availShields > 0 ? C.shield : C.ui });

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi * 104, H * 0.955, 20, hi < planetHits ? C.hit : C.ui, 0.9);
    }

    // Survival timer
    var surviveRatio = Math.max(0, timeLeft / NEEDED_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * surviveRatio, 72, surviveRatio > 0.3 ? C.shield : C.hit);
    game.draw.text(Math.ceil(timeLeft) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
  });
})(game);
