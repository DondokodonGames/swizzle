// 414-meteor-dodge.js
// 隕石回避 — 宇宙船を操って隕石の雨を避ける
// 操作: タップした方向に宇宙船が移動
// 成功: 40秒生き残る  失敗: 衝突

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020408',
    space:  '#050812',
    ship:   '#22d3ee',
    shipHi: '#cffafe',
    engine: '#f97316',
    meteor0:'#6b7280',
    meteor1:'#78350f',
    meteor2:'#4b5563',
    meteor3:'#92400e',
    shield: '#3b82f6',
    debris: '#9ca3af',
    text:   '#f1f5f9',
    ui:     '#475569',
    star:   '#f1f5f9'
  };

  var METEOR_COLORS = [C.meteor0, C.meteor1, C.meteor2, C.meteor3];

  var shipX = W/2;
  var shipY = H*0.75;
  var shipVX = 0, shipVY = 0;
  var SHIP_SPEED = 700;
  var engineFlicker = 0;
  var trail = [];

  var meteors = [];
  var stars = [];
  for (var si = 0; si < 80; si++) {
    stars.push({ x:Math.random()*W, y:Math.random()*H, r:0.5+Math.random()*2, speed:30+Math.random()*80 });
  }

  var spawnTimer = 0.5;
  var spawnInterval = 0.5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var invincible = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - shipX, dy = ty - shipY;
    var len = Math.sqrt(dx*dx+dy*dy);
    if (len < 1) return;
    shipVX = dx/len * SHIP_SPEED;
    shipVY = dy/len * SHIP_SPEED;
  });

  game.onSwipe(function(dir) {
    if (done) return;
    var speed = SHIP_SPEED*1.2;
    if (dir === 'left') shipVX = -speed;
    else if (dir === 'right') shipVX = speed;
    else if (dir === 'up') shipVY = -speed;
    else if (dir === 'down') shipVY = speed;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_success', 0.8); game.end.success(Math.ceil(elapsed*100)); return; }
    }

    engineFlicker += dt * 15;
    if (invincible > 0) invincible -= dt;

    // Ship movement
    shipX += shipVX * dt;
    shipY += shipVY * dt;
    shipVX *= (1 - 3*dt);
    shipVY *= (1 - 3*dt);
    // Clamp to screen
    shipX = Math.max(50, Math.min(W-50, shipX));
    shipY = Math.max(50, Math.min(H-100, shipY));

    // Trail
    trail.push({ x:shipX, y:shipY+20, life:0.6 });
    if (trail.length > 15) trail.shift();
    for (var ti = trail.length-1; ti >= 0; ti--) trail[ti].life -= dt*2;

    // Stars scroll
    for (var si2 = 0; si2 < stars.length; si2++) {
      stars[si2].y += stars[si2].speed * dt;
      if (stars[si2].y > H) stars[si2].y = -4;
    }

    // Spawn meteors
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      var col = METEOR_COLORS[Math.floor(Math.random()*4)];
      var r = 20+Math.random()*50;
      var mx = Math.random()*W;
      // Sometimes aim at player
      var target = Math.random() < 0.4;
      var angle = target ? Math.atan2(shipY - (-80), shipX - mx) : Math.PI/2 + (Math.random()-0.5)*0.8;
      var speed2 = 250+Math.random()*300+elapsed*4;
      meteors.push({ x:mx, y:-80, vx:Math.cos(angle)*speed2, vy:Math.sin(angle)*speed2, r:r, col:col, rot:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*4 });
      spawnInterval = Math.max(0.25, 0.55-elapsed*0.005);
      spawnTimer = spawnInterval;
    }

    // Update meteors
    for (var mi = meteors.length-1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.rotSpeed * dt;

      // Collision
      if (invincible <= 0 && Math.hypot(m.x-shipX, m.y-shipY) < m.r + 30) {
        if (!done) {
          done = true;
          game.audio.play('se_failure', 0.7);
          for (var pi = 0; pi < 20; pi++) {
            var ang = Math.random()*Math.PI*2;
            particles.push({ x:shipX, y:shipY, vx:Math.cos(ang)*300, vy:Math.sin(ang)*300, life:0.8, col:Math.random()<0.5?C.ship:C.engine });
          }
          setTimeout(function(){ game.end.failure(); }, 700);
        }
        meteors.splice(mi,1);
        continue;
      }

      if (m.y > H+100 || m.x < -200 || m.x > W+200) meteors.splice(mi,1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.space, 0.7);

    // Stars
    for (var si3 = 0; si3 < stars.length; si3++) {
      var s = stars[si3];
      game.draw.circle(s.x, s.y, s.r, C.star, 0.5+Math.random()*0.3);
    }

    // Meteors
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      game.draw.circle(m2.x, m2.y, m2.r+4, m2.col, 0.15);
      game.draw.circle(m2.x, m2.y, m2.r, m2.col, 0.9);
      // Surface detail
      game.draw.circle(m2.x+Math.cos(m2.rot)*m2.r*0.4, m2.y+Math.sin(m2.rot)*m2.r*0.4, m2.r*0.25, C.debris, 0.3);
      // Trail
      game.draw.line(m2.x, m2.y, m2.x-m2.vx*0.1, m2.y-m2.vy*0.1, C.debris, 3);
    }

    // Engine trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      if (t.life > 0) game.draw.circle(t.x, t.y, 16*t.life, C.engine, t.life*0.7);
    }

    // Ship
    if (invincible <= 0 || Math.sin(elapsed*20) > 0) {
      game.draw.circle(shipX, shipY, 36, C.shipHi, 0.12);
      // Ship body (triangle-ish using circles)
      game.draw.circle(shipX, shipY-14, 24, C.ship, 0.9);
      game.draw.circle(shipX-16, shipY+12, 18, C.ship, 0.8);
      game.draw.circle(shipX+16, shipY+12, 18, C.ship, 0.8);
      game.draw.circle(shipX, shipY-24, 14, C.shipHi, 0.8);
      // Engine glow
      var eFlick = Math.sin(engineFlicker)*0.2;
      game.draw.circle(shipX, shipY+24, 12+eFlick*8, C.engine, 0.8+eFlick);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10*p.life, p.col, p.life*0.8);
    }

    game.draw.text(Math.ceil(timeLeft)+'秒', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*(1-ratio), 72, ratio > 0.3 ? C.ship : C.engine);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
