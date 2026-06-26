// 498-laser-bounce.js
// レーザーバウンス — 反射するレーザー光線の角度をスワイプで調整してターゲット破壊
// 操作: スワイプ上下でミラー角度を変え、レーザーをターゲットに当てる
// 成功: 12ターゲット破壊  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#000810',
    panel:    '#000a18',
    laser:    '#ef4444',
    laserHi:  '#fca5a5',
    mirror:   '#93c5fd',
    mirrorHi: '#dbeafe',
    target:   '#f59e0b',
    targetHi: '#fef08a',
    hit:      '#22c55e',
    beam:     '#fee2e2',
    text:     '#f1f5f9',
    ui:       '#374151',
    wall:     '#1e293b'
  };

  var mirrorAngle = Math.PI / 4; // 45 degrees default
  var mirrorX = W / 2;
  var mirrorY = H * 0.55;
  var mirrorLen = 220;

  var targets = [];
  var destroyed = 0;
  var NEEDED = 12;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var laserPath = [];
  var hitTarget = -1;
  var hitTimer = 0;

  // Laser source: top left
  var srcX = 80;
  var srcY = H * 0.25;

  function spawnTarget() {
    targets = [];
    var positions = [
      { x: W * 0.75, y: H * 0.22 },
      { x: W * 0.8,  y: H * 0.4  },
      { x: W * 0.7,  y: H * 0.55 },
      { x: W * 0.85, y: H * 0.68 },
      { x: W * 0.6,  y: H * 0.75 },
      { x: W * 0.9,  y: H * 0.32 }
    ];
    var ti = Math.floor(Math.random() * positions.length);
    var pos = positions[ti];
    targets.push({ x: pos.x, y: pos.y, r: 50, hit: false, hitAnim: 0 });
  }

  function traceLaser() {
    laserPath = [];
    hitTarget = -1;

    // Ray from source, hits mirror first
    var ray = { x: srcX, y: srcY, dx: 1, dy: 0 };

    // Find mirror intersection
    var mx = mirrorX, my = mirrorY;
    var mcos = Math.cos(mirrorAngle), msin = Math.sin(mirrorAngle);
    // Mirror as segment
    var mx1 = mx - mcos * mirrorLen / 2, my1 = my - msin * mirrorLen / 2;
    var mx2 = mx + mcos * mirrorLen / 2, my2 = my + msin * mirrorLen / 2;

    // Parametric intersection of ray with mirror line
    // Ray: (srcX + t, srcY)  (horizontal from srcX to mirrorX)
    // For simplicity, laser goes right from src until hitting mirror x
    var t1 = mx - srcX;
    if (t1 <= 0) { laserPath = [[srcX, srcY, W, srcY]]; return; }

    var hitX = srcX + t1;
    var hitY = srcY;

    // Check if hitY is within mirror segment
    // Mirror is at (mx,my) tilted at mirrorAngle
    // The mirror is vertical to the laser direction; find the y span
    var dy_span = msin * mirrorLen / 2;
    if (hitY < my - Math.abs(dy_span) - 20 || hitY > my + Math.abs(dy_span) + 20) {
      // Missed mirror - ray goes to wall
      laserPath = [[srcX, srcY, W + 10, srcY]];
      return;
    }

    laserPath.push([srcX, srcY, hitX, hitY]);

    // Reflect: incoming dir is (1,0), mirror normal is perpendicular to mirror direction
    // Mirror direction: (mcos, msin), normal: (-msin, mcos)
    var nx = -msin, ny = mcos;
    // Reflect (1,0) around normal
    var dot = nx * 1 + ny * 0;
    var rx = 1 - 2 * dot * nx;
    var ry = 0 - 2 * dot * ny;

    // Trace reflected ray until it hits a target or wall
    var steps = 0;
    var cx = hitX, cy = hitY;
    var len = 0;
    var MAX_LEN = 2000;
    while (len < MAX_LEN) {
      // Check targets
      for (var ti2 = 0; ti2 < targets.length; ti2++) {
        if (targets[ti2].hit) continue;
        var tx2 = targets[ti2].x - cx;
        var ty2 = targets[ti2].y - cy;
        var tpar = tx2 * rx + ty2 * ry;
        if (tpar > 0) {
          var perp2 = Math.abs(tx2 * ry - ty2 * rx);
          if (perp2 <= targets[ti2].r && tpar < MAX_LEN) {
            var endX = cx + rx * tpar;
            var endY = cy + ry * tpar;
            laserPath.push([cx, cy, endX, endY]);
            hitTarget = ti2;
            return;
          }
        }
      }
      len += 20;
      steps++;
      if (steps > 100) break;
    }
    // No target hit
    var endX2 = cx + rx * MAX_LEN;
    var endY2 = cy + ry * MAX_LEN;
    laserPath.push([cx, cy, endX2, endY2]);
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') mirrorAngle -= 0.12;
    else if (dir === 'down') mirrorAngle += 0.12;
    mirrorAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mirrorAngle));
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    var cy2 = ty - mirrorY;
    if (ty < mirrorY) mirrorAngle -= 0.1;
    else mirrorAngle += 0.1;
    mirrorAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mirrorAngle));
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

    if (hitTimer > 0) hitTimer -= dt;

    traceLaser();

    // Check hit
    if (hitTarget >= 0 && !targets[hitTarget].hit) {
      hitTimer += dt;
      if (hitTimer > 0.6) {
        targets[hitTarget].hit = true;
        targets[hitTarget].hitAnim = 1.0;
        destroyed++;
        game.audio.play('se_success', 0.7);
        var tg = targets[hitTarget];
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: tg.x, y: tg.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.6, col: C.targetHi });
        }
        hitTimer = 0;
        if (destroyed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(destroyed * 400 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { spawnTarget(); }, 400);
        }
      }
    } else if (hitTarget < 0) {
      hitTimer = 0;
    }

    // Animate target hit
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      if (targets[ti3].hit && targets[ti3].hitAnim > 0) targets[ti3].hitAnim -= dt * 3;
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 0, 20, H, C.wall, 0.9);
    game.draw.rect(W - 20, 0, 20, H, C.wall, 0.9);
    game.draw.rect(0, 0, W, 20, C.wall, 0.9);
    game.draw.rect(0, H - 20, W, 20, C.wall, 0.9);

    // Laser source
    game.draw.circle(srcX, srcY, 30, C.laser, 0.3);
    game.draw.circle(srcX, srcY, 18, C.laser, 0.9);
    game.draw.circle(srcX, srcY, 8, C.laserHi, 1.0);

    // Draw laser path
    for (var li = 0; li < laserPath.length; li++) {
      var seg = laserPath[li];
      game.draw.line(seg[0], seg[1], seg[2], seg[3], C.laserHi, 6);
      game.draw.line(seg[0], seg[1], seg[2], seg[3], C.laser, 3);
    }

    // Mirror
    var mcos2 = Math.cos(mirrorAngle), msin2 = Math.sin(mirrorAngle);
    var mx1b = mirrorX - mcos2 * mirrorLen / 2, my1b = mirrorY - msin2 * mirrorLen / 2;
    var mx2b = mirrorX + mcos2 * mirrorLen / 2, my2b = mirrorY + msin2 * mirrorLen / 2;
    game.draw.line(mx1b, my1b, mx2b, my2b, C.mirrorHi, 12);
    game.draw.line(mx1b, my1b, mx2b, my2b, C.mirror, 6);
    game.draw.circle(mirrorX, mirrorY, 16, C.mirrorHi, 0.9);

    // Holding indicator
    if (hitTarget >= 0 && hitTimer > 0) {
      var prog = hitTimer / 0.6;
      game.draw.circle(targets[hitTarget].x, targets[hitTarget].y, targets[hitTarget].r + 20, C.hit, 0.3);
      game.draw.circle(targets[hitTarget].x, targets[hitTarget].y, targets[hitTarget].r + 20, C.hit, prog * 0.4);
    }

    // Targets
    for (var ti4 = 0; ti4 < targets.length; ti4++) {
      var tgt = targets[ti4];
      if (tgt.hit) {
        if (tgt.hitAnim > 0) {
          game.draw.circle(tgt.x, tgt.y, tgt.r * (1 + tgt.hitAnim), C.hit, tgt.hitAnim * 0.5);
        }
        continue;
      }
      var pulse = Math.sin(elapsed * 4 + ti4 * 2) * 8 + 8;
      game.draw.circle(tgt.x, tgt.y, tgt.r + pulse, C.target, 0.2);
      game.draw.circle(tgt.x, tgt.y, tgt.r, C.target, 0.85);
      game.draw.circle(tgt.x - tgt.r * 0.25, tgt.y - tgt.r * 0.25, tgt.r * 0.2, '#fff', 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Mirror angle indicator
    var angleDegs = Math.round(mirrorAngle * 180 / Math.PI);
    game.draw.text(angleDegs + '°', mirrorX + 130, mirrorY, { size: 40, color: C.mirror });

    game.draw.text(destroyed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.laser : C.laserHi);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnTarget();
  });
})(game);
