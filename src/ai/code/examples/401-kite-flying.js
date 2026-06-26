// 401-kite-flying.js
// 凧揚げ — 風に乗せて凧を高く揚げ、糸が切れないよう操る
// 操作: スワイプで凧に引力を加える（向きで操縦）
// 成功: 2000の高度を達成  失敗: 糸が切れる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1628',
    sky:    '#1e3a5f',
    skyTop: '#0c1a35',
    cloud:  '#cbd5e1',
    cloudHi:'#f1f5f9',
    kite0:  '#ef4444',
    kite1:  '#fbbf24',
    kite2:  '#22c55e',
    kite3:  '#3b82f6',
    string: '#e2e8f0',
    wind:   '#7dd3fc',
    text:   '#f1f5f9',
    ui:     '#475569',
    danger: '#ef4444'
  };

  var PLAYER_X = W/2;
  var PLAYER_Y = H * 0.88;
  var STRING_LEN = 600;
  var STRING_TENSION = 1.0;  // 0-2: >1.8 = snap

  var kiteX = W/2;
  var kiteY = H * 0.45;
  var kiteVX = 0;
  var kiteVY = -40;
  var kiteAngle = 0;

  var altitude = 0;  // how high above start
  var MAX_ALT = 2000;
  var tension = 0.8;

  var windX = 30;
  var windY = -20;
  var windTimer = 0;
  var windInterval = 2.5;

  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var tensionFlash = 0;

  var clouds = [];
  for (var ci = 0; ci < 8; ci++) {
    clouds.push({ x: Math.random()*W, y: H*0.08+Math.random()*H*0.35, w: 120+Math.random()*200, speed: 20+Math.random()*30 });
  }

  var KITE_COLOR = [C.kite0,C.kite1,C.kite2,C.kite3][Math.floor(Math.random()*4)];

  function updateWind() {
    windX = (Math.random()-0.4)*80;
    windY = -(20 + Math.random()*60);
    windInterval = 1.5 + Math.random()*2.5;
    windTimer = 0;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var dx = x2-x1, dy = y2-y1;
    var len = Math.sqrt(dx*dx+dy*dy);
    if (len < 20) return;
    var force = Math.min(len*0.8, 400);
    kiteVX += dx/len*force*0.3;
    kiteVY += dy/len*force*0.3;
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (tensionFlash > 0) tensionFlash -= dt * 3;

    // Wind update
    windTimer += dt;
    if (windTimer > windInterval) updateWind();

    // Kite physics
    kiteVX += windX * dt;
    kiteVY += windY * dt;
    kiteVX *= (1 - 1.5*dt);
    kiteVY *= (1 - 1.5*dt);
    kiteX += kiteVX * dt;
    kiteY += kiteVY * dt;

    // String constraint
    var dx2 = kiteX - PLAYER_X;
    var dy2 = kiteY - PLAYER_Y;
    var dist = Math.sqrt(dx2*dx2+dy2*dy2);
    tension = dist / STRING_LEN;

    if (dist > STRING_LEN) {
      // Pull back toward string length
      var nx = dx2/dist, ny = dy2/dist;
      kiteX = PLAYER_X + nx*STRING_LEN;
      kiteY = PLAYER_Y + ny*STRING_LEN;
      kiteVX -= nx*Math.abs(kiteVX)*0.5;
      kiteVY -= ny*Math.abs(kiteVY)*0.5;
    }

    // Altitude
    altitude = Math.max(0, (PLAYER_Y - kiteY) * 2);
    if (altitude >= MAX_ALT && !done) {
      done = true;
      game.audio.play('se_success', 0.7);
      setTimeout(function(){ game.end.success(Math.round(altitude)+Math.ceil(timeLeft)*80); }, 600);
    }

    // String snaps if tension too high
    if (tension > 1.85 && !done) {
      tensionFlash = 0.5;
      game.audio.play('se_failure', 0.5);
      // Kite flies away
      kiteVX += 200;
      kiteVY -= 200;
    }
    if (kiteY < -200 && !done) {
      done = true;
      setTimeout(function(){ game.end.failure(); }, 500);
    }

    // Kite particles (ribbon)
    if (!done && Math.random() < 0.3) {
      particles.push({ x:kiteX + (Math.random()-0.5)*30, y:kiteY+60, vx:kiteVX*0.3+(Math.random()-0.5)*30, vy:kiteVY*0.1+30, life:0.8+Math.random()*0.4, col:KITE_COLOR });
    }

    // Clouds move
    for (var ci2 = 0; ci2 < clouds.length; ci2++) {
      clouds[ci2].x += clouds[ci2].speed * dt;
      if (clouds[ci2].x > W + 200) clouds[ci2].x = -200;
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // Kite angle (visual tilt based on velocity)
    kiteAngle += (kiteVX*0.002 - kiteAngle) * 5*dt;

    // ---- draw ----
    // Sky gradient
    game.draw.rect(0, 0, W, H, C.skyTop, 0.9);
    game.draw.rect(0, H*0.3, W, H*0.7, C.sky, 0.7);

    // Clouds
    for (var ci3 = 0; ci3 < clouds.length; ci3++) {
      var cl = clouds[ci3];
      game.draw.circle(cl.x, cl.y, cl.w*0.4, C.cloud, 0.3);
      game.draw.circle(cl.x+cl.w*0.25, cl.y+8, cl.w*0.3, C.cloud, 0.25);
      game.draw.circle(cl.x-cl.w*0.25, cl.y+12, cl.w*0.28, C.cloud, 0.22);
    }

    // String
    var tenCol = tension > 1.6 ? C.danger : C.string;
    var tenAlpha = 0.5 + tension*0.3;
    // Draw string as curved line (approximate with segments)
    var segments = 12;
    var prevX = PLAYER_X, prevY = PLAYER_Y;
    for (var si = 1; si <= segments; si++) {
      var t = si/segments;
      var lx = PLAYER_X + (kiteX-PLAYER_X)*t;
      var ly = PLAYER_Y + (kiteY-PLAYER_Y)*t + Math.sin(t*Math.PI)*20*(1-tension*0.5);
      game.draw.line(prevX, prevY, lx, ly, tenCol, tension > 1.6 ? 4 : 2);
      prevX = lx; prevY = ly;
    }

    // Tail/ribbon particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.6);
    }

    // Kite (diamond shape using 4 triangles)
    var kw = 60, kh = 80;
    var ca = Math.cos(kiteAngle), sa = Math.sin(kiteAngle);
    // 4 color quadrants
    game.draw.circle(kiteX, kiteY, kw+6, '#000', 0.2);
    game.draw.circle(kiteX, kiteY, kw, KITE_COLOR, 0.9);
    game.draw.circle(kiteX, kiteY, kw*0.5, C.kite1, 0.7);
    game.draw.circle(kiteX, kiteY, kw*0.2, '#fff', 0.8);

    // Tension flash
    if (tensionFlash > 0) game.draw.rect(0, 0, W, H, C.danger, tensionFlash*0.15);

    // Player holder
    game.draw.circle(PLAYER_X, PLAYER_Y, 28, C.cloud, 0.9);
    game.draw.circle(PLAYER_X, PLAYER_Y, 18, C.cloudHi, 0.9);

    // Altitude bar
    var altRatio = Math.min(1, altitude/MAX_ALT);
    var barH2 = H * 0.6;
    var barX = W - 60;
    var barY = H * 0.18;
    game.draw.rect(barX-8, barY, 16, barH2, '#0f172a', 0.8);
    game.draw.rect(barX-8, barY+barH2*(1-altRatio), 16, barH2*altRatio, C.wind, 0.85);
    game.draw.text(Math.floor(altitude)+'m', barX, barY-20, { size: 32, color: C.wind });
    game.draw.text('2000m', barX, barY-50, { size: 28, color: C.ui });

    // Tension indicator
    var tensionColor = tension > 1.6 ? C.danger : (tension > 1.2 ? C.kite1 : C.wind);
    game.draw.text('張力: ' + Math.round(tension*100)+'%', W/2, H*0.93, { size: 36, color: tensionColor });

    game.draw.text(Math.floor(altitude) + ' / ' + MAX_ALT + 'm', W/2, 148, { size: 52, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio2, 72, ratio2 > 0.3 ? C.wind : C.danger);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    updateWind();
  });
})(game);
