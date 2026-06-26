// 394-juggle-act.js
// ジャグリング — 3つのボールを交互にタップして落とさない
// 操作: 空中のボールをタップして上に打ち返す
// 成功: 50回打ち返す  失敗: 1個でも床に落ちる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d0820',
    stage:  '#1a1040',
    ball0:  '#ef4444',
    ball1:  '#22c55e',
    ball2:  '#3b82f6',
    ballHi: '#fff',
    shadow: '#6d28d9',
    spark:  '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FLOOR_Y = H * 0.88;
  var LAUNCH_Y = H * 0.75;

  var balls = [
    { x: W*0.25, y: H*0.5, vx: 120, vy: -600, col: C.ball0, hiCol: C.ballHi, r: 52, hits: 0 },
    { x: W*0.5,  y: H*0.6, vx:-100, vy: -500, col: C.ball1, hiCol: C.ballHi, r: 52, hits: 0 },
    { x: W*0.75, y: H*0.55,vx: 80,  vy: -550, col: C.ball2, hiCol: C.ballHi, r: 52, hits: 0 }
  ];

  var totalHits = 0;
  var NEEDED = 50;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var flashBall = -1;
  var flashTimer = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx*dx+dy*dy) < b.r + 30) {
        b.vy = -(550 + Math.random()*150);
        b.vx += (Math.random()-0.5)*80;
        totalHits++;
        b.hits++;
        flashBall = i;
        flashTimer = 0.3;
        game.audio.play('se_tap', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x:b.x, y:b.y, vx:Math.cos(ang)*180, vy:Math.sin(ang)*180, life:0.5, col:b.col });
        }
        if (totalHits >= NEEDED && !done) {
          done = true;
          setTimeout(function(){ game.end.success(totalHits*100+Math.ceil(timeLeft)*80); }, 500);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashTimer > 0) flashTimer -= dt;

    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      b.vy += 700 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= (1 - 0.3*dt);

      // Wall bounce
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx)*0.8; }
      if (b.x > W-b.r) { b.x = W-b.r; b.vx = -Math.abs(b.vx)*0.8; }

      // Floor = fail
      if (b.y > FLOOR_Y && !done) {
        done = true;
        game.audio.play('se_failure', 0.6);
        for (var pi2 = 0; pi2 < 15; pi2++) {
          var ang2 = Math.random()*Math.PI;
          particles.push({ x:b.x, y:FLOOR_Y, vx:Math.cos(ang2)*300, vy:-Math.sin(ang2)*300, life:0.7, col:b.col });
        }
        setTimeout(function(){ game.end.failure(); }, 600);
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy += 400*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.stage, 0.5);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, H-FLOOR_Y, '#110820', 0.9);
    game.draw.line(0, FLOOR_Y, W, FLOOR_Y, C.shadow, 4);

    // Shadows on floor
    for (var i2 = 0; i2 < balls.length; i2++) {
      var b2 = balls[i2];
      var shadowW = Math.max(8, b2.r * (1 - (FLOOR_Y - b2.y) / FLOOR_Y * 0.8));
      game.draw.circle(b2.x, FLOOR_Y + 8, shadowW * 0.5, C.shadow, 0.3 - (FLOOR_Y - b2.y)/FLOOR_Y*0.25);
    }

    // Balls
    for (var i3 = 0; i3 < balls.length; i3++) {
      var b3 = balls[i3];
      var isFlash = (i3 === flashBall && flashTimer > 0);
      game.draw.circle(b3.x, b3.y, b3.r + 8, b3.col, 0.15 + (isFlash ? 0.2 : 0));
      game.draw.circle(b3.x, b3.y, b3.r, b3.col, 0.9);
      game.draw.circle(b3.x - b3.r*0.3, b3.y - b3.r*0.3, b3.r*0.28, b3.hiCol, 0.6);
      if (isFlash) game.draw.circle(b3.x, b3.y, b3.r + 16, b3.col, flashTimer * 0.5);
      // Hit count on ball
      game.draw.text(b3.hits+'', b3.x, b3.y + 14, { size: 44, color: b3.hiCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10*p.life, p.col, p.life*0.8);
    }

    game.draw.text(totalHits + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.ball1 : C.ball0);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
