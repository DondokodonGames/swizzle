// 607-photon-bounce.js
// フォトンバウンス — 光の粒子を鏡で反射させてターゲットに当てる
// 操作: タップで鏡を回転させて反射角を調整
// 成功: 12ターゲット撃破  失敗: 8回外れ or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000510',
    photon:  '#00ffee',
    photonHi:'#ffffff',
    mirror:  '#88aacc',
    mirrorHi:'#ccddee',
    target:  '#ff6622',
    targetHi:'#ffaa66',
    hit:     '#22c55e',
    hitHi:   '#86efac',
    miss:    '#ef4444',
    beam:    '#00ffee44',
    text:    '#f1f5f9',
    ui:      '#0a1a2a'
  };

  var EMITTER_X = W / 2;
  var EMITTER_Y = H * 0.85;

  var mirrors = []; // { x, y, angle } rotatable
  var target = null;
  var hits = 0;
  var NEEDED = 12;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var resultText = '';
  var resultTimer = 0;
  var photonFired = false;
  var photonX, photonY, photonVX, photonVY;
  var photonBounces = 0;
  var MAX_BOUNCES = 5;
  var photonTrail = [];
  var photonSpeed = 600;

  function spawnPuzzle() {
    mirrors = [];
    var numMirrors = 2 + Math.floor(hits / 4);
    for (var i = 0; i < numMirrors; i++) {
      mirrors.push({
        x: 100 + Math.random() * (W - 200),
        y: H * 0.2 + Math.random() * (H * 0.5),
        angle: Math.random() * Math.PI,
        len: 80
      });
    }
    target = {
      x: 80 + Math.random() * (W - 160),
      y: H * 0.12 + Math.random() * (H * 0.3),
      r: 36,
      phase: Math.random() * Math.PI * 2
    };
    photonFired = false;
    photonTrail = [];
  }

  function reflectVector(vx, vy, nx, ny) {
    // Reflect velocity around normal n
    var dot = vx * nx + vy * ny;
    return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny };
  }

  function firePhoron() {
    photonX = EMITTER_X;
    photonY = EMITTER_Y;
    // Fire toward center-ish upward
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    photonVX = Math.cos(ang) * photonSpeed;
    photonVY = Math.sin(ang) * photonSpeed;
    photonFired = true;
    photonBounces = 0;
    photonTrail = [];
    game.audio.play('se_tap', 0.3);
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (photonFired) return;

    // Find closest mirror and rotate it
    var hitMirror = -1, bestDist = 80;
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var dx = tx - m.x, dy = ty - m.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; hitMirror = mi; }
    }

    if (hitMirror >= 0) {
      mirrors[hitMirror].angle += Math.PI / 6; // rotate 30 degrees
      game.audio.play('se_tap', 0.2);
    } else {
      // Fire photon
      firePhoron();
    }
  });

  game.onSwipe(function(dir, x1, y1) {
    if (done || photonFired) return;
    // Swipe on mirror to rotate
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var dx = x1 - m.x, dy = y1 - m.y;
      if (dx * dx + dy * dy < 80 * 80) {
        if (dir === 'left' || dir === 'up') m.angle -= Math.PI / 8;
        else m.angle += Math.PI / 8;
        game.audio.play('se_tap', 0.15);
        return;
      }
    }
    // Swipe elsewhere = fire
    firePhoron();
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (target) target.phase += dt * 3;

    // Photon physics
    if (photonFired) {
      var steps = 10;
      var stepDT = dt / steps;
      var escaped = false;

      for (var step = 0; step < steps && photonFired; step++) {
        photonTrail.push({ x: photonX, y: photonY, life: 0.4 });
        photonX += photonVX * stepDT;
        photonY += photonVY * stepDT;

        // Check target hit
        if (target) {
          var dx = photonX - target.x, dy = photonY - target.y;
          if (dx * dx + dy * dy < target.r * target.r) {
            // Hit!
            hits++;
            flashCol = C.hit;
            flashAnim = 0.3;
            resultText = '命中!';
            resultTimer = 0.5;
            game.audio.play('se_success', 0.8);
            for (var pi = 0; pi < 12; pi++) {
              var ang = Math.random() * Math.PI * 2;
              particles.push({ x: target.x, y: target.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5, col: C.hitHi });
            }
            photonFired = false;
            if (hits >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(hits * 400 + Math.ceil(timeLeft) * 100); }, 700);
            } else {
              setTimeout(function() { if (!done) spawnPuzzle(); }, 900);
            }
            break;
          }
        }

        // Check mirror reflections
        for (var mi = 0; mi < mirrors.length; mi++) {
          var m = mirrors[mi];
          var cos = Math.cos(m.angle), sin = Math.sin(m.angle);
          var mx = photonX - m.x, my = photonY - m.y;
          // Distance to mirror line
          var perp = Math.abs(-sin * mx + cos * my);
          var along = cos * mx + sin * my;
          if (perp < 12 && Math.abs(along) < m.len / 2 && photonBounces < MAX_BOUNCES) {
            // Reflect
            var nx = -sin, ny = cos;
            var ref = reflectVector(photonVX, photonVY, nx, ny);
            photonVX = ref.vx; photonVY = ref.vy;
            photonBounces++;
            game.audio.play('se_tap', 0.15);
            break;
          }
        }

        // Off screen check
        if (photonX < -50 || photonX > W + 50 || photonY < -50 || photonY > H + 50) {
          misses++;
          flashCol = C.miss;
          flashAnim = 0.25;
          resultText = 'はずれ';
          resultTimer = 0.5;
          game.audio.play('se_failure', 0.3);
          photonFired = false;
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          break;
        }
      }
    }

    // Trail decay
    for (var tri = photonTrail.length - 1; tri >= 0; tri--) {
      photonTrail[tri].life -= dt * 3;
      if (photonTrail[tri].life <= 0) photonTrail.splice(tri, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target
    if (target) {
      var pulse = 1 + Math.sin(target.phase) * 0.1;
      game.draw.circle(target.x, target.y, target.r * pulse + 12, C.target, 0.15);
      game.draw.circle(target.x, target.y, target.r * pulse, C.target, 0.85);
      game.draw.circle(target.x - 10, target.y - 10, target.r * 0.3, C.targetHi, 0.5);
      // Crosshair
      game.draw.line(target.x - target.r, target.y, target.x + target.r, target.y, C.targetHi, 2);
      game.draw.line(target.x, target.y - target.r, target.x, target.y + target.r, C.targetHi, 2);
    }

    // Mirrors
    for (var mi2 = 0; mi2 < mirrors.length; mi2++) {
      var m2 = mirrors[mi2];
      var cos2 = Math.cos(m2.angle), sin2 = Math.sin(m2.angle);
      var hlen = m2.len / 2;
      var x1 = m2.x - cos2 * hlen, y1 = m2.y - sin2 * hlen;
      var x2 = m2.x + cos2 * hlen, y2 = m2.y + sin2 * hlen;
      game.draw.circle(m2.x, m2.y, 20, C.mirrorHi, 0.2);
      game.draw.line(x1, y1, x2, y2, C.mirrorHi, 8);
      game.draw.line(x1, y1, x2, y2, C.mirror, 4);
    }

    // Photon trail
    for (var tri2 = 0; tri2 < photonTrail.length; tri2++) {
      var tp = photonTrail[tri2];
      game.draw.circle(tp.x, tp.y, 6 * (tp.life / 0.4), C.beam.slice(0, 7), tp.life * 0.8);
    }

    // Photon
    if (photonFired) {
      game.draw.circle(photonX, photonY, 14, C.photonHi, 0.9);
      game.draw.circle(photonX, photonY, 28, C.photon, 0.3);
    }

    // Emitter
    game.draw.circle(EMITTER_X, EMITTER_Y, 20, C.photon, 0.7);
    game.draw.circle(EMITTER_X, EMITTER_Y, 30, C.photon, 0.2 + Math.sin(elapsed * 4) * 0.1);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    } else if (!photonFired) {
      game.draw.text('スワイプorタップで発射', W / 2, H * 0.88, { size: 36, color: C.ui });
    }

    // Miss dots
    for (var mi3 = 0; mi3 < MAX_MISS; mi3++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi3 * 88, H * 0.955, 18, mi3 < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.photon : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnPuzzle();
  });
})(game);
