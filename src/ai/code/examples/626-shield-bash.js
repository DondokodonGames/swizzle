// 626-shield-bash.js
// シールドバッシュ — 飛んでくる岩をタイミングよく弾き返せ
// 操作: スワイプ方向で盾を向けて岩を受け止める
// 成功: 20回弾き返し  失敗: 5回被弾 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0408',
    player:   '#4ade80',
    playerHi: '#bbf7d0',
    shield:   '#60a5fa',
    shieldHi: '#bfdbfe',
    rock:     '#a8a29e',
    rockHi:   '#d6d3d1',
    hit:      '#22c55e',
    bash:     '#fbbf24',
    miss:     '#ef4444',
    text:     '#f1f5f9',
    ui:       '#1a0a14'
  };

  var CX = W / 2, CY = H * 0.65;
  var SHIELD_DIRS = ['up', 'right', 'down', 'left'];
  var SHIELD_ANGLES = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

  var shieldDir = 'right';
  var shieldAnim = 0;
  var rocks = [];
  var blocked = 0;
  var NEEDED = 20;
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var spawnTimer = 0;
  var shieldGlow = 0;

  function spawnRock() {
    var ang = Math.random() * Math.PI * 2;
    var spawnR = 600;
    var rx = CX + Math.cos(ang) * spawnR;
    var ry = CY + Math.sin(ang) * spawnR;
    var speed = 280 + Math.random() * 120 + elapsed * 3;
    var dx = CX - rx, dy = CY - ry;
    var dist = Math.sqrt(dx * dx + dy * dy);
    rocks.push({
      x: rx, y: ry,
      vx: dx / dist * speed,
      vy: dy / dist * speed,
      r: 28 + Math.random() * 18,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 5
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    shieldDir = dir;
    shieldAnim = 0.2;
    shieldGlow = 0.3;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap: cycle shield direction
    var dirs = SHIELD_DIRS;
    var idx = dirs.indexOf(shieldDir);
    shieldDir = dirs[(idx + 1) % dirs.length];
    shieldAnim = 0.15;
    shieldGlow = 0.2;
    game.audio.play('se_tap', 0.15);
  });

  function getShieldBounds() {
    var ang = SHIELD_ANGLES[shieldDir];
    var SHIELD_LEN = 130;
    var SHIELD_DIST = 90;
    var sx = CX + Math.cos(ang) * SHIELD_DIST;
    var sy = CY + Math.sin(ang) * SHIELD_DIST;
    var nx = Math.cos(ang + Math.PI / 2) * SHIELD_LEN / 2;
    var ny = Math.sin(ang + Math.PI / 2) * SHIELD_LEN / 2;
    return {
      x: sx, y: sy,
      ang: ang,
      p1x: sx + nx, p1y: sy + ny,
      p2x: sx - nx, p2y: sy - ny,
      normalX: Math.cos(ang), normalY: Math.sin(ang)
    };
  }

  function distToSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    var projX = ax + t * dx, projY = ay + t * dy;
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }

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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (shieldAnim > 0) shieldAnim -= dt * 3;
    if (shieldGlow > 0) shieldGlow -= dt * 2;

    spawnTimer += dt;
    if (spawnTimer > Math.max(0.7, 1.8 - elapsed * 0.02)) {
      spawnTimer = 0;
      spawnRock();
    }

    var shield = getShieldBounds();

    for (var ri = rocks.length - 1; ri >= 0; ri--) {
      var r = rocks[ri];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.rotV * dt;

      // Shield collision
      var d = distToSegment(r.x, r.y, shield.p1x, shield.p1y, shield.p2x, shield.p2y);
      if (d < r.r + 10) {
        // Check coming toward shield (not away)
        var dot = r.vx * shield.normalX + r.vy * shield.normalY;
        if (dot < 0) {
          // Block!
          blocked++;
          shieldGlow = 0.5;
          flashCol = C.hit;
          flashAnim = 0.2;
          game.audio.play('se_success', 0.5);
          // Reflect
          r.vx -= 2 * dot * shield.normalX;
          r.vy -= 2 * dot * shield.normalY;
          r.vx *= 1.2; r.vy *= 1.2;
          for (var p = 0; p < 8; p++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: r.x, y: r.y, vx: Math.cos(ang2) * 180, vy: Math.sin(ang2) * 180, life: 0.4, col: C.shieldHi });
          }
          if (blocked >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(blocked * 300 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
      }

      // Player hit
      var pdx = r.x - CX, pdy = r.y - CY;
      if (pdx * pdx + pdy * pdy < (r.r + 40) * (r.r + 40)) {
        hits++;
        rocks.splice(ri, 1);
        flashCol = C.miss;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.5);
        for (var p2 = 0; p2 < 8; p2++) {
          var a2 = Math.random() * Math.PI * 2;
          particles.push({ x: CX, y: CY, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.4, col: C.playerHi });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }

      // Off-screen
      if (r.x < -100 || r.x > W + 100 || r.y < -100 || r.y > H + 100) {
        rocks.splice(ri, 1);
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

    // Rocks
    for (var ri2 = 0; ri2 < rocks.length; ri2++) {
      var r2 = rocks[ri2];
      game.draw.circle(r2.x, r2.y, r2.r + 4, C.rockHi, 0.1);
      game.draw.circle(r2.x, r2.y, r2.r, C.rock, 0.9);
      game.draw.circle(r2.x - r2.r * 0.3, r2.y - r2.r * 0.3, r2.r * 0.25, C.rockHi, 0.4);
    }

    // Player
    game.draw.circle(CX + 4, CY + 4, 44, '#000', 0.3);
    game.draw.circle(CX, CY, 44, C.player, 0.9);
    game.draw.circle(CX - 12, CY - 12, 16, C.playerHi, 0.5);

    // Shield
    var sh = getShieldBounds();
    var glowAlpha = 0.15 + shieldGlow;
    game.draw.line(sh.p1x, sh.p1y, sh.p2x, sh.p2y, C.shieldHi, 20 + shieldGlow * 10);
    game.draw.line(sh.p1x, sh.p1y, sh.p2x, sh.p2y, C.shield, 14);
    game.draw.line(sh.p1x, sh.p1y, sh.p2x, sh.p2y, C.shieldHi, 5);
    // Shield center gem
    game.draw.circle(sh.x, sh.y, 14, C.shieldHi, 0.8);

    // Direction arrows
    for (var di = 0; di < SHIELD_DIRS.length; di++) {
      var ddir = SHIELD_DIRS[di];
      var da = SHIELD_ANGLES[ddir];
      var ax = CX + Math.cos(da) * 160;
      var ay = CY + Math.sin(da) * 160;
      var isActive = ddir === shieldDir;
      game.draw.circle(ax, ay, isActive ? 22 : 14, isActive ? C.shieldHi : C.ui, isActive ? 0.7 : 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi * 104, H * 0.955, 22, hi < hits ? C.miss : C.ui, 0.9);
    }

    game.draw.text(blocked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.shield : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnRock();
    spawnRock();
  });
})(game);
