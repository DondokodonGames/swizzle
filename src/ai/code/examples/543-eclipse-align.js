// 543-eclipse-align.js
// エクリプスアライン — 太陽・月・地球を軌道上で整列させて日食を作る
// 操作: タップで各天体の公転速度を変える
// 成功: 8回整列  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000008',
    space:   '#00000f',
    sun:     '#ffcc00',
    sunGlow: '#ff880033',
    moon:    '#aabbcc',
    moonHi:  '#ddeeff',
    earth:   '#2266ff',
    earthHi: '#66aaff',
    align:   '#ffffff',
    corona:  '#ffaa0066',
    star:    '#ffffff',
    text:    '#f1f5f9',
    ui:      '#334466',
    hit:     '#ffcc00'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var SUN_R = 140;
  var EARTH_R = 52;
  var MOON_R = 30;
  var EARTH_ORBIT = 340;
  var MOON_ORBIT = 160;

  var earthAngle = 0;
  var moonAngle = 0;
  var earthSpeed = 0.5; // radians/sec
  var moonSpeed = 1.8;
  var EARTH_SPEEDS = [0.3, 0.5, 0.8, 1.2];
  var MOON_SPEEDS = [1.0, 1.8, 2.8, 4.0];
  var earthSpeedIdx = 1;
  var moonSpeedIdx = 1;

  var alignCount = 0;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var alignAnim = 0;
  var alignCooldown = 0;
  var particles = [];
  var stars = [];

  // Generate background stars
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, twinkle: Math.random() * Math.PI * 2 });
  }

  function getEarthPos() {
    return { x: CX + Math.cos(earthAngle) * EARTH_ORBIT, y: CY + Math.sin(earthAngle) * EARTH_ORBIT };
  }

  function getMoonPos() {
    var ep = getEarthPos();
    return { x: ep.x + Math.cos(moonAngle) * MOON_ORBIT, y: ep.y + Math.sin(moonAngle) * MOON_ORBIT };
  }

  function checkAlignment() {
    if (alignCooldown > 0) return false;
    var ep = getEarthPos();
    var mp = getMoonPos();
    // Check if sun, earth, moon are roughly collinear (sun->earth->moon or sun->moon between)
    // Vector from sun to earth
    var sex = ep.x - CX, sey = ep.y - CY;
    // Vector from sun to moon
    var smx = mp.x - CX, smy = mp.y - CY;
    var lenSE = Math.sqrt(sex * sex + sey * sey);
    var lenSM = Math.sqrt(smx * smx + smy * smy);
    if (lenSE === 0 || lenSM === 0) return false;
    var dot = (sex * smx + sey * smy) / (lenSE * lenSM);
    // Also check moon is roughly between or beyond earth from sun
    var crossMag = Math.abs(sex * smy - sey * smx) / (lenSE * lenSM);
    return dot > 0.97 && crossMag < 0.12;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var ep = getEarthPos();
    var dx = tx - ep.x, dy = ty - ep.y;
    if (Math.sqrt(dx * dx + dy * dy) < EARTH_R + 60) {
      earthSpeedIdx = (earthSpeedIdx + 1) % EARTH_SPEEDS.length;
      earthSpeed = EARTH_SPEEDS[earthSpeedIdx];
      game.audio.play('se_tap', 0.3);
      return;
    }
    var mp = getMoonPos();
    var dx2 = tx - mp.x, dy2 = ty - mp.y;
    if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < MOON_R + 60) {
      moonSpeedIdx = (moonSpeedIdx + 1) % MOON_SPEEDS.length;
      moonSpeed = MOON_SPEEDS[moonSpeedIdx];
      game.audio.play('se_tap', 0.2);
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

    earthAngle += earthSpeed * dt;
    moonAngle += moonSpeed * dt;
    if (alignCooldown > 0) alignCooldown -= dt;
    if (alignAnim > 0) alignAnim -= dt * 2;

    if (checkAlignment()) {
      alignCount++;
      alignAnim = 1.0;
      alignCooldown = 1.5;
      game.audio.play('se_success', 0.8);
      var mp2 = getMoonPos();
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: mp2.x, y: mp2.y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.6, col: C.corona });
      }
      if (alignCount >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(alignCount * 600 + Math.ceil(timeLeft) * 80); }, 700);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 1.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      var alpha = 0.4 + Math.sin(elapsed * 1.5 + s.twinkle) * 0.3;
      game.draw.circle(s.x, s.y, s.r, C.star, alpha);
    }

    // Earth orbit
    for (var oi = 0; oi < 60; oi++) {
      var oang = oi / 60 * Math.PI * 2;
      game.draw.circle(CX + Math.cos(oang) * EARTH_ORBIT, CY + Math.sin(oang) * EARTH_ORBIT, 3, C.ui, 0.25);
    }

    var ep2 = getEarthPos();
    var mp3 = getMoonPos();

    // Moon orbit
    for (var oi2 = 0; oi2 < 40; oi2++) {
      var oang2 = oi2 / 40 * Math.PI * 2;
      game.draw.circle(ep2.x + Math.cos(oang2) * MOON_ORBIT, ep2.y + Math.sin(oang2) * MOON_ORBIT, 2, C.moon, 0.2);
    }

    // Sun
    game.draw.circle(CX, CY, SUN_R + 40, C.sun, 0.06);
    game.draw.circle(CX, CY, SUN_R + 20, C.sun, 0.12);
    game.draw.circle(CX, CY, SUN_R, C.sun, 0.95);
    game.draw.circle(CX - 30, CY - 30, SUN_R * 0.25, '#fff', 0.3);

    // Eclipse effect
    if (alignAnim > 0) {
      game.draw.circle(CX, CY, SUN_R + 80 * alignAnim, C.corona, alignAnim * 0.4);
    }

    // Earth
    game.draw.circle(ep2.x, ep2.y, EARTH_R + 8, C.earth, 0.15);
    game.draw.circle(ep2.x, ep2.y, EARTH_R, C.earth, 0.95);
    game.draw.circle(ep2.x - 12, ep2.y - 12, EARTH_R * 0.35, C.earthHi, 0.5);
    game.draw.text('v' + EARTH_SPEEDS[earthSpeedIdx].toFixed(1), ep2.x, ep2.y + EARTH_R + 40, { size: 28, color: C.earthHi });

    // Moon
    game.draw.circle(mp3.x, mp3.y, MOON_R + 4, C.moon, 0.15);
    game.draw.circle(mp3.x, mp3.y, MOON_R, C.moon, 0.9);
    game.draw.circle(mp3.x - 6, mp3.y - 6, MOON_R * 0.4, C.moonHi, 0.4);
    game.draw.text('v' + MOON_SPEEDS[moonSpeedIdx].toFixed(1), mp3.x, mp3.y - MOON_R - 28, { size: 24, color: C.moonHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 16 * p.life, p.col, p.life);
    }

    // Alignment flash
    if (alignAnim > 0) {
      game.draw.rect(0, 0, W, H, C.align, alignAnim * 0.08);
      game.draw.text('ECLIPSE!', W / 2, CY + EARTH_ORBIT + 120, { size: 60, color: C.hit, bold: true });
    }

    game.draw.text(alignCount + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sun : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    earthAngle = Math.random() * Math.PI * 2;
    moonAngle = Math.random() * Math.PI * 2;
  });
})(game);
