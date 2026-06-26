// 574-magnet-sort.js
// マグネットソート — 磁力で引き合う球を同色でまとめてゾーンに入れる
// 操作: タップで磁石の極性を切り替え、引力/斥力を制御
// 成功: 4色×5球をそれぞれのゾーンに整列  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06060e',
    zone0:  '#ef4444',
    zone1:  '#3b82f6',
    zone2:  '#22c55e',
    zone3:  '#f59e0b',
    text:   '#f1f5f9',
    ui:     '#374151',
    win:    '#22c55e',
    magnet: '#aaaacc',
    magnetHi:'#ccccff'
  };

  var BALL_COLORS = [C.zone0, C.zone1, C.zone2, C.zone3];
  var ZONE_COLORS = [C.zone0, C.zone1, C.zone2, C.zone3];

  var ZONE_R = 80;
  var ZONES = [
    { x: 180, y: H * 0.25, colorIdx: 0 },
    { x: W - 180, y: H * 0.25, colorIdx: 1 },
    { x: 180, y: H * 0.75, colorIdx: 2 },
    { x: W - 180, y: H * 0.75, colorIdx: 3 }
  ];

  var BALL_R = 32;
  var balls = [];
  var magnetPolarity = 1; // 1 = attract same, -1 = attract different
  var magnetX = W / 2, magnetY = H / 2;
  var magnetActive = false;
  var magnetTimer = 0;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var score = 0;

  function initBalls() {
    balls = [];
    var colors = 4, perColor = 5;
    for (var c = 0; c < colors; c++) {
      for (var n = 0; n < perColor; n++) {
        var angle = Math.random() * Math.PI * 2;
        var r = 100 + Math.random() * 300;
        balls.push({
          x: W / 2 + Math.cos(angle) * r,
          y: H / 2 + Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100,
          colorIdx: c,
          inZone: false
        });
      }
    }
  }

  function checkZones() {
    var total = 0;
    for (var bi = 0; bi < balls.length; bi++) {
      var b = balls[bi];
      b.inZone = false;
      for (var zi = 0; zi < ZONES.length; zi++) {
        var z = ZONES[zi];
        var dx = b.x - z.x, dy = b.y - z.y;
        if (Math.sqrt(dx * dx + dy * dy) < ZONE_R && b.colorIdx === z.colorIdx) {
          b.inZone = true;
          total++;
          break;
        }
      }
    }
    return total;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    magnetPolarity *= -1;
    magnetX = tx;
    magnetY = ty;
    magnetActive = true;
    magnetTimer = 0.8;
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    magnetX = (x1 + x2) / 2;
    magnetY = (y1 + y2) / 2;
    magnetActive = true;
    magnetTimer = 0.5;
    game.audio.play('se_tap', 0.15);
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
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (magnetTimer > 0) magnetTimer -= dt;
    if (magnetTimer <= 0) magnetActive = false;

    // Physics
    for (var bi = 0; bi < balls.length; bi++) {
      var b = balls[bi];

      // Magnet force
      if (magnetActive) {
        var dx = magnetX - b.x, dy = magnetY - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10 && dist < 400) {
          var force = magnetPolarity * 2000 / (dist * dist) * 40;
          b.vx += (dx / dist) * force * dt;
          b.vy += (dy / dist) * force * dt;
        }
      }

      // Zone attraction (pull matching balls toward their zone)
      for (var zi = 0; zi < ZONES.length; zi++) {
        var z = ZONES[zi];
        if (b.colorIdx === z.colorIdx) {
          var zdx = z.x - b.x, zdy = z.y - b.y;
          var zdist = Math.sqrt(zdx * zdx + zdy * zdy);
          if (zdist > ZONE_R && zdist < 500) {
            b.vx += (zdx / zdist) * 30 * dt;
            b.vy += (zdy / zdist) * 30 * dt;
          }
        }
      }

      // Ball-ball repulsion
      for (var bj = bi + 1; bj < balls.length; bj++) {
        var b2 = balls[bj];
        var bx = b.x - b2.x, by = b.y - b2.y;
        var bd = Math.sqrt(bx * bx + by * by);
        if (bd < BALL_R * 2.5 && bd > 0.1) {
          var push = (BALL_R * 2.5 - bd) * 0.5;
          b.vx += (bx / bd) * push * dt * 20;
          b.vy += (by / bd) * push * dt * 20;
          b2.vx -= (bx / bd) * push * dt * 20;
          b2.vy -= (by / bd) * push * dt * 20;
        }
      }

      // Damping
      b.vx *= Math.pow(0.3, dt);
      b.vy *= Math.pow(0.3, dt);
      b.vx = Math.max(-300, Math.min(300, b.vx));
      b.vy = Math.max(-300, Math.min(300, b.vy));
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Boundary
      b.x = Math.max(BALL_R, Math.min(W - BALL_R, b.x));
      b.y = Math.max(BALL_R, Math.min(H - BALL_R, b.y));
    }

    score = checkZones();
    if (score >= balls.length && !done) {
      done = true;
      flashAnim = 0.6;
      game.audio.play('se_success', 0.9);
      for (var pi = 0; pi < 20; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(ang) * 350, vy: Math.sin(ang) * 350, life: 0.6, col: BALL_COLORS[Math.floor(Math.random() * 4)] });
      }
      setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 200); }, 800);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Zones
    for (var zi2 = 0; zi2 < ZONES.length; zi2++) {
      var z2 = ZONES[zi2];
      var zCol = ZONE_COLORS[z2.colorIdx];
      game.draw.circle(z2.x, z2.y, ZONE_R + 10, zCol, 0.1 + Math.sin(elapsed * 2 + zi2) * 0.04);
      game.draw.circle(z2.x, z2.y, ZONE_R, zCol, 0.2);
      // Count balls in zone
      var inCount = 0;
      for (var bi2 = 0; bi2 < balls.length; bi2++) {
        if (balls[bi2].inZone && balls[bi2].colorIdx === z2.colorIdx) inCount++;
      }
      game.draw.text(inCount + '/5', z2.x, z2.y + 14, { size: 36, color: zCol, bold: true });
    }

    // Balls
    for (var bi3 = 0; bi3 < balls.length; bi3++) {
      var b3 = balls[bi3];
      var bc = BALL_COLORS[b3.colorIdx];
      game.draw.circle(b3.x + 4, b3.y + 4, BALL_R, '#000', 0.2);
      game.draw.circle(b3.x, b3.y, BALL_R, bc, b3.inZone ? 0.95 : 0.8);
      game.draw.circle(b3.x - 8, b3.y - 8, BALL_R * 0.3, '#fff', 0.4);
    }

    // Magnet
    if (magnetActive) {
      var mPulse = 1 + Math.sin(elapsed * 10) * 0.15;
      var mCol = magnetPolarity > 0 ? '#ff8844' : '#4488ff';
      game.draw.circle(magnetX, magnetY, 60 * mPulse, mCol, 0.2);
      game.draw.circle(magnetX, magnetY, 30 * mPulse, mCol, 0.6);
      game.draw.text(magnetPolarity > 0 ? 'N' : 'S', magnetX, magnetY + 14, { size: 36, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.win, flashAnim * 0.1);

    game.draw.text(score + ' / ' + balls.length, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text(magnetPolarity > 0 ? '引力モード' : '斥力モード', W / 2, 210, { size: 36, color: magnetPolarity > 0 ? '#ff8844' : '#4488ff' });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.magnetHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initBalls();
  });
})(game);
