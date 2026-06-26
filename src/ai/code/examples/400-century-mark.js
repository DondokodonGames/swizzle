// 400-century-mark.js
// 400本記念 — 400という数字に向かって球を放つ記念ゲーム
// 操作: タップで4方向に弾を発射、400個の星を全て点灯させる
// 成功: 全ての星を点灯  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02010a',
    star:   '#1e1b4b',
    starOn: '#fbbf24',
    starHi: '#fef3c7',
    ball:   '#f97316',
    ballHi: '#fed7aa',
    trail:  '#a855f7',
    text:   '#f1f5f9',
    accent: '#22d3ee',
    glow:   '#7c3aed',
    num:    '#f0abfc'
  };

  // Create a 20x20 grid of stars
  var GRID_COLS = 20;
  var GRID_ROWS = 20;
  var TOTAL = GRID_COLS * GRID_ROWS;
  var CELL_W = W / GRID_COLS;
  var CELL_H = (H * 0.78) / GRID_ROWS;
  var GRID_Y = H * 0.1;

  var stars = [];
  for (var row = 0; row < GRID_ROWS; row++) {
    for (var col = 0; col < GRID_COLS; col++) {
      stars.push({ col: col, row: row, lit: false, litAnim: 0 });
    }
  }

  var balls = [];
  var lit = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var celebAnim = 0;
  var tapCount = 0;

  var CENTER_X = W / 2;
  var CENTER_Y = H * 0.88;

  var DIRS = [
    {dx:0,dy:-1},{dx:1,dy:-1},{dx:1,dy:0},{dx:1,dy:1},
    {dx:0,dy:1},{dx:-1,dy:1},{dx:-1,dy:0},{dx:-1,dy:-1}
  ];

  game.onTap(function(tx, ty) {
    if (done) return;
    var dir = DIRS[tapCount % DIRS.length];
    balls.push({ x:CENTER_X, y:CENTER_Y, vx:dir.dx*600, vy:dir.dy*600, life:2.0, trail:[] });
    tapCount++;
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    var d = {dx:0,dy:0};
    if (dir === 'up') d = {dx:0,dy:-1};
    else if (dir === 'down') d = {dx:0,dy:1};
    else if (dir === 'left') d = {dx:-1,dy:0};
    else if (dir === 'right') d = {dx:1,dy:0};
    balls.push({ x:CENTER_X, y:CENTER_Y, vx:d.dx*700, vy:d.dy*700, life:2.0, trail:[] });
    game.audio.play('se_tap', 0.35);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (celebAnim > 0) celebAnim -= dt * 1.5;

    // Update stars animation
    for (var si = 0; si < stars.length; si++) {
      if (stars[si].lit && stars[si].litAnim < 1) stars[si].litAnim = Math.min(1, stars[si].litAnim + dt*4);
    }

    // Update balls
    for (var bi = balls.length-1; bi >= 0; bi--) {
      var b = balls[bi];
      b.trail.push({x:b.x, y:b.y, life:0.4});
      if (b.trail.length > 12) b.trail.shift();

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Bounce off walls
      if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); }
      if (b.x > W) { b.x = W; b.vx = -Math.abs(b.vx); }
      if (b.y < GRID_Y) { b.y = GRID_Y; b.vy = Math.abs(b.vy); }
      if (b.y > GRID_Y + GRID_ROWS*CELL_H) { b.y = GRID_Y + GRID_ROWS*CELL_H; b.vy = -Math.abs(b.vy); }

      // Light stars
      var hitCol = Math.floor((b.x - 0) / CELL_W);
      var hitRow = Math.floor((b.y - GRID_Y) / CELL_H);
      hitCol = Math.max(0, Math.min(GRID_COLS-1, hitCol));
      hitRow = Math.max(0, Math.min(GRID_ROWS-1, hitRow));
      var idx = hitRow * GRID_COLS + hitCol;
      if (idx >= 0 && idx < stars.length && !stars[idx].lit) {
        stars[idx].lit = true;
        lit++;
        for (var pi = 0; pi < 4; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x:b.x, y:b.y, vx:Math.cos(ang)*120, vy:Math.sin(ang)*120, life:0.4, col:C.starOn });
        }
        if (lit >= TOTAL && !done) {
          done = true;
          celebAnim = 2.0;
          game.audio.play('se_success', 0.8);
          setTimeout(function(){ game.end.success(lit*10+Math.ceil(timeLeft)*80); }, 1200);
        }
      }

      for (var ti = b.trail.length-1; ti >= 0; ti--) b.trail[ti].life -= dt*2;

      if (b.life <= 0) balls.splice(bi, 1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars grid
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      var sx = s.col * CELL_W + CELL_W/2;
      var sy = GRID_Y + s.row * CELL_H + CELL_H/2;
      var r = 8 + s.litAnim * 10;
      if (s.lit) {
        game.draw.circle(sx, sy, r+8, C.starOn, s.litAnim*0.2);
        game.draw.circle(sx, sy, r, C.starOn, 0.9);
        game.draw.circle(sx, sy, r*0.5, C.starHi, 0.9);
      } else {
        game.draw.circle(sx, sy, 8, C.star, 0.8);
      }
    }

    // Ball trails
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      for (var ti2 = 0; ti2 < b2.trail.length; ti2++) {
        var t = b2.trail[ti2];
        if (t.life > 0) game.draw.circle(t.x, t.y, 14*t.life, C.trail, t.life*0.5);
      }
    }

    // Balls
    for (var bi3 = 0; bi3 < balls.length; bi3++) {
      var b3 = balls[bi3];
      game.draw.circle(b3.x, b3.y, 22, C.ball, 0.9);
      game.draw.circle(b3.x-7, b3.y-7, 9, C.ballHi, 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.9);
    }

    // Launcher at center bottom
    game.draw.circle(CENTER_X, CENTER_Y, 36, C.accent, 0.85);
    game.draw.circle(CENTER_X, CENTER_Y, 22, '#fff', 0.9);
    game.draw.text('→', CENTER_X, CENTER_Y+14, { size: 44 });

    // Celebration
    if (celebAnim > 0) {
      game.draw.rect(0, 0, W, H, C.starOn, celebAnim*0.15);
      game.draw.text('🎉 400本達成！', W/2, H/2, { size: 64, color: C.starHi, bold: true });
    }

    game.draw.text(lit + ' / ' + TOTAL, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.glow : C.ball);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);
