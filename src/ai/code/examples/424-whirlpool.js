// 424-whirlpool.js
// 渦巻き脱出 — 渦に引き込まれる前にスワイプで脱出する
// 操作: スワイプで渦の引力に抗って外へ逃げる
// 成功: 120秒生き残る  失敗: 中心に吸い込まれる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030a18',
    water0: '#1e3a5f',
    water1: '#1d4ed8',
    water2: '#2563eb',
    water3: '#3b82f6',
    water4: '#60a5fa',
    center: '#7c3aed',
    centerHi:'#a78bfa',
    boat:   '#f59e0b',
    boatHi: '#fde68a',
    foam:   '#e0f2fe',
    danger: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var CX = W / 2;
  var CY = H / 2;
  var MAX_R = Math.min(W, H) * 0.42;

  var boatX = CX + MAX_R * 0.7;
  var boatY = CY;
  var boatVX = 0, boatVY = 0;

  var whirlAngle = 0;
  var PULL_BASE = 60;   // base pull force
  var survived = 0;
  var NEEDED = 120;     // seconds
  var done = false;
  var timeLeft = NEEDED;
  var elapsed = 0;
  var particles = [];
  var foam = [];
  var danger = 0;

  game.onSwipe(function(dir) {
    if (done) return;
    var force = 550;
    if (dir === 'up') boatVY -= force;
    else if (dir === 'down') boatVY += force;
    else if (dir === 'left') boatVX -= force;
    else if (dir === 'right') boatVX += force;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - boatX;
    var dy = ty - boatY;
    var dist = Math.sqrt(dx*dx+dy*dy);
    if (dist < 1) return;
    boatVX += (dx/dist) * 400;
    boatVY += (dy/dist) * 400;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        game.end.success(Math.round(elapsed * 100));
        return;
      }
    }

    whirlAngle += dt * 2.5;

    // Whirlpool pull
    var dx = CX - boatX;
    var dy = CY - boatY;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var pull = PULL_BASE * (1 + (1 - dist/MAX_R) * 3) * (1 + elapsed * 0.003);

    // Circular current component
    var tangX = -dy / dist;
    var tangY = dx / dist;
    boatVX += (dx/dist * pull + tangX * pull * 0.8) * dt;
    boatVY += (dy/dist * pull + tangY * pull * 0.8) * dt;

    // Drag
    boatVX *= (1 - dt * 2);
    boatVY *= (1 - dt * 2);
    boatX += boatVX * dt;
    boatY += boatVY * dt;

    danger = 1 - Math.min(1, dist / (MAX_R * 0.4));

    // Sucked in
    if (dist < 40 && !done) {
      done = true;
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: boatX, y: boatY, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.7, col: C.boat });
      }
      game.audio.play('se_failure', 0.9);
      setTimeout(function() { game.end.failure(); }, 700);
    }

    // Foam on whirlpool edge
    if (Math.random() < 0.3) {
      var fa = Math.random() * Math.PI * 2;
      var fr = MAX_R * (0.3 + Math.random() * 0.7);
      foam.push({ x: CX + Math.cos(fa)*fr, y: CY + Math.sin(fa)*fr, life: 1.5, angle: fa });
    }
    for (var fi = foam.length-1; fi >= 0; fi--) {
      foam[fi].angle += dt * (1 + (MAX_R - Math.sqrt(Math.pow(foam[fi].x-CX,2)+Math.pow(foam[fi].y-CY,2)))/MAX_R * 3);
      var fDist = Math.sqrt(Math.pow(foam[fi].x-CX,2)+Math.pow(foam[fi].y-CY,2));
      foam[fi].x = CX + Math.cos(foam[fi].angle) * fDist * (1 - dt * 0.2);
      foam[fi].y = CY + Math.sin(foam[fi].angle) * fDist * (1 - dt * 0.2);
      foam[fi].life -= dt;
      if (foam[fi].life <= 0) foam.splice(fi, 1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Whirlpool rings
    for (var ri = 5; ri >= 1; ri--) {
      var r = MAX_R * ri / 5;
      var wCol = ri > 3 ? C.water3 : ri > 2 ? C.water2 : ri > 1 ? C.water1 : C.water0;
      game.draw.circle(CX, CY, r, wCol, 0.3);
    }

    // Rotating spiral lines
    for (var si = 0; si < 6; si++) {
      var sAng = whirlAngle + si * Math.PI / 3;
      for (var sk = 1; sk <= 4; sk++) {
        var sR = MAX_R * sk / 5;
        var sX = CX + Math.cos(sAng + sk * 0.5) * sR;
        var sY = CY + Math.sin(sAng + sk * 0.5) * sR;
        var eX = CX + Math.cos(sAng + sk * 0.5 + 0.4) * sR * 0.8;
        var eY = CY + Math.sin(sAng + sk * 0.5 + 0.4) * sR * 0.8;
        game.draw.line(sX, sY, eX, eY, C.water4, 3);
      }
    }

    // Foam
    for (var fi2 = 0; fi2 < foam.length; fi2++) {
      var f = foam[fi2];
      game.draw.circle(f.x, f.y, 6, C.foam, f.life * 0.5);
    }

    // Center vortex
    game.draw.circle(CX, CY, 60, C.center, 0.8);
    game.draw.circle(CX, CY, 35, C.centerHi, 0.6);
    game.draw.circle(CX, CY, 16, '#fff', 0.5);

    // Danger zone indicator
    if (danger > 0) {
      game.draw.circle(CX, CY, 180, C.danger, danger * 0.15);
    }

    // Boat
    game.draw.circle(boatX, boatY, 28, C.boatHi, 0.15);
    game.draw.circle(boatX, boatY, 22, C.boat, 0.9);
    game.draw.circle(boatX - 6, boatY - 8, 9, C.boatHi, 0.7);
    // Wake
    var wakeLen = Math.sqrt(boatVX*boatVX+boatVY*boatVY) * 0.05;
    if (wakeLen > 5) {
      game.draw.line(boatX, boatY, boatX - boatVX*0.05, boatY - boatVY*0.05, C.foam, 4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Progress arc
    var progRatio = 1 - timeLeft / NEEDED;
    game.draw.circle(W*0.82, H*0.2, 65, C.water1, 0.3);
    game.draw.circle(W*0.82, H*0.2, 55, C.water3, progRatio * 0.7);
    game.draw.text(Math.ceil(timeLeft) + '秒', W*0.82, H*0.2 + 14, { size: 36, color: C.text, bold: true });

    var ratio2 = Math.max(0, timeLeft / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * (1 - ratio2), 72, ratio2 > 0.3 ? C.water3 : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
