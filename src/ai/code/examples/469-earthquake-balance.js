// 469-earthquake-balance.js
// 地震バランス — 揺れる台の上でオブジェクトを落とさないように保つ
// 操作: 左右タップで台を傾けて重心を調整
// 成功: 30秒間オブジェクトを落とさず維持  失敗: 5個落下 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0808',
    ground: '#1c1008',
    plat:   '#8b5e1a',
    platHi: '#c4892a',
    obj0:   '#ef4444',
    obj1:   '#3b82f6',
    obj2:   '#22c55e',
    obj3:   '#f59e0b',
    obj4:   '#a855f7',
    crack:  '#78350f',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444'
  };

  var PLAT_W = 700;
  var PLAT_H = 30;
  var PLAT_X = W / 2;
  var PLAT_Y = H * 0.62;
  var platAngle = 0;
  var platAngVel = 0;

  var OBJ_COLORS = [C.obj0, C.obj1, C.obj2, C.obj3, C.obj4];
  var objects = [];
  var falls = 0;
  var MAX_FALLS = 5;
  var done = false;
  var survived = 0;
  var NEEDED = 30;
  var timeLeft = 60;
  var elapsed = 0;
  var quakeTimer = 0;
  var nextQuake = 2;
  var particles = [];
  var tiltDir = 0; // -1 left, 0 none, 1 right
  var tiltTimer = 0;

  function spawnObject() {
    var r = 28 + Math.random() * 20;
    var ox = (Math.random() - 0.5) * (PLAT_W - r * 2);
    objects.push({
      x: ox, y: -r - 10,
      vx: 0, vy: 0,
      r: r,
      col: OBJ_COLORS[Math.floor(Math.random() * OBJ_COLORS.length)],
      onPlat: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      tiltDir = -1;
    } else {
      tiltDir = 1;
    }
    tiltTimer = 0.25;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived += dt;
      if (survived >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(Math.ceil(survived) * 200 + (MAX_FALLS - falls) * 300); }, 700);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    // Quake events
    quakeTimer -= dt;
    if (quakeTimer <= 0 && !done) {
      platAngVel += (Math.random() - 0.5) * 2.5;
      quakeTimer = nextQuake;
      nextQuake = 1.2 + Math.random() * 2;
    }

    // Tilt input
    if (tiltTimer > 0) {
      tiltTimer -= dt;
      platAngVel += tiltDir * 1.5 * dt;
    }

    // Platform physics (pendulum-like)
    var spring = -platAngle * 3.0;
    var damp = -platAngVel * 1.8;
    platAngVel += (spring + damp) * dt;
    platAngle += platAngVel * dt;
    platAngle = Math.max(-0.8, Math.min(0.8, platAngle));

    // Object physics
    var gx = Math.sin(platAngle) * 600;
    var gy = 700;

    for (var oi = objects.length - 1; oi >= 0; oi--) {
      var obj = objects[oi];

      // Gravity
      obj.vx += gx * dt;
      obj.vy += gy * dt;
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Platform surface collision
      // Transform object to platform local coords
      var cos = Math.cos(platAngle);
      var sin = Math.sin(platAngle);
      var dx = obj.x - 0; // relative to platform center
      var dy = obj.y - (PLAT_Y - PLAT_H / 2 - W / 2);
      // Simple: check if near platform surface
      var localX = dx * cos + dy * sin;
      var localY = -dx * sin + dy * cos;
      // Platform top surface is at localY = 0 (roughly), within width
      var platTop = PLAT_Y - PLAT_H / 2;
      // World coords of platform top at object's x
      var ptWorldY = PLAT_Y - PLAT_H / 2 - Math.tan(platAngle) * (obj.x - PLAT_X);
      if (obj.y + obj.r >= ptWorldY && obj.y - obj.r < ptWorldY + 60 && Math.abs(obj.x - PLAT_X) < PLAT_W / 2) {
        obj.y = ptWorldY - obj.r;
        obj.vy = -obj.vy * 0.3;
        obj.vx *= 0.85;
        obj.onPlat = true;
      } else {
        obj.onPlat = false;
      }

      // Fell off
      if (obj.y > H + 100) {
        objects.splice(oi, 1);
        falls++;
        game.audio.play('se_failure', 0.4);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: obj.x + PLAT_X, y: H - 100, vx: Math.cos(ang) * 100, vy: -Math.random() * 200, life: 0.6, col: obj.col });
        }
        if (falls >= MAX_FALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
      }
    }

    // Spawn objects
    if (objects.length < 4 && Math.random() < dt * 0.6 && !done) {
      spawnObject();
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, H * 0.92, W, H * 0.08, C.ground, 0.9);

    // Platform (rotated via manual drawing)
    var cos2 = Math.cos(platAngle);
    var sin2 = Math.sin(platAngle);
    var hw = PLAT_W / 2;
    var hh = PLAT_H / 2;
    // Draw as a line representing platform top
    var lx1 = PLAT_X - hw * cos2;
    var ly1 = PLAT_Y - hw * sin2;
    var lx2 = PLAT_X + hw * cos2;
    var ly2 = PLAT_Y + hw * sin2;
    game.draw.line(lx1, ly1, lx2, ly2, C.platHi, PLAT_H + 10);
    game.draw.line(lx1, ly1, lx2, ly2, C.plat, PLAT_H);

    // Objects
    for (var oi2 = 0; oi2 < objects.length; oi2++) {
      var o2 = objects[oi2];
      var wx = o2.x + PLAT_X;
      var wy = o2.y + PLAT_Y - 100;
      game.draw.circle(wx, wy, o2.r + 6, o2.col, 0.2);
      game.draw.circle(wx, wy, o2.r, o2.col, 0.9);
      game.draw.circle(wx - o2.r * 0.25, wy - o2.r * 0.25, o2.r * 0.35, '#fff', 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life);
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 44 + fi * 88, H * 0.955, 18, fi < falls ? C.wrong : C.ui, 0.9);
    }

    // Tilt indicators
    game.draw.text('←', W * 0.15, PLAT_Y + 100, { size: 72, color: tiltTimer > 0 && tiltDir === -1 ? '#fff' : C.ui, bold: true });
    game.draw.text('→', W * 0.85, PLAT_Y + 100, { size: 72, color: tiltTimer > 0 && tiltDir === 1 ? '#fff' : C.ui, bold: true });

    var survRatio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, H * 0.88, W * survRatio, 12, C.obj2, 0.8);
    game.draw.text(Math.floor(survived) + 's / ' + NEEDED + 's', W / 2, H * 0.86, { size: 44, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.platHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnObject();
    spawnObject();
  });
})(game);
