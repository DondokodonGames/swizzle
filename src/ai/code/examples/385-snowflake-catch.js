// 385-snowflake-catch.js
// 雪の結晶キャッチ — 舌を伸ばして雪の結晶をキャッチする
// 操作: タップで舌を上へ伸ばす
// 成功: 20個キャッチ  失敗: 30個逃す or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c18',
    sky:    '#0c1f3d',
    snow:   '#e0f2fe',
    snowHi: '#f0f9ff',
    flake:  '#bae6fd',
    flakeHi:'#e0f2fe',
    tongue: '#f9a8d4',
    tongueHi:'#fce7f3',
    face:   '#fde68a',
    faceHi: '#fff',
    mouth:  '#dc2626',
    caught: '#22c55e',
    missed: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FACE_X = W / 2;
  var FACE_Y = H * 0.78;
  var FACE_R = 100;

  var tongueOut = false;
  var tongueLen = 0;
  var TONGUE_SPEED = 1800;
  var MAX_TONGUE = 600;

  var flakes = [];
  var spawnTimer = 0;
  var caught = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 30;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var catchAnim = 0;
  var windPhase = 0;

  function spawnFlake() {
    flakes.push({
      x: 60 + Math.random() * (W - 120),
      y: -30,
      size: 16 + Math.random() * 20,
      spin: (Math.random() - 0.5) * 3,
      angle: 0,
      speed: 60 + Math.random() * 80,
      wave: Math.random() * Math.PI * 2
    });
  }

  function drawFlake(x, y, size, angle, alpha) {
    var arms = 6;
    for (var i = 0; i < arms; i++) {
      var a = angle + i * (Math.PI * 2 / arms);
      game.draw.line(x, y, x + Math.cos(a) * size, y + Math.sin(a) * size, C.flake, 3);
      // Sub-branches
      var mx = x + Math.cos(a) * size * 0.5;
      var my = y + Math.sin(a) * size * 0.5;
      var ba1 = a + Math.PI / 3;
      var ba2 = a - Math.PI / 3;
      game.draw.line(mx, my, mx + Math.cos(ba1) * size * 0.3, my + Math.sin(ba1) * size * 0.3, C.flakeHi, 2);
      game.draw.line(mx, my, mx + Math.cos(ba2) * size * 0.3, my + Math.sin(ba2) * size * 0.3, C.flakeHi, 2);
    }
    game.draw.circle(x, y, 5, C.flakeHi, alpha * 0.9);
  }

  game.onTap(function() {
    if (done || tongueOut) return;
    tongueOut = true;
    tongueLen = 0;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    windPhase += dt * 0.5;
    if (catchAnim > 0) catchAnim -= dt * 3;

    // Tongue
    if (tongueOut) {
      tongueLen += TONGUE_SPEED * dt;
      if (tongueLen >= MAX_TONGUE) {
        tongueLen = MAX_TONGUE;
        tongueOut = false;
      }
    } else if (tongueLen > 0) {
      tongueLen -= TONGUE_SPEED * dt;
      if (tongueLen < 0) tongueLen = 0;
    }

    var tongueTopY = FACE_Y - FACE_R - tongueLen;
    var tongueTipX = FACE_X;
    var tongueTipY = tongueTopY;

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnFlake();
      spawnTimer = 0.5 + Math.random() * 0.4;
    }

    // Update flakes
    for (var fi = flakes.length - 1; fi >= 0; fi--) {
      var f = flakes[fi];
      f.angle += f.spin * dt;
      f.x += Math.sin(windPhase + f.wave) * 30 * dt;
      f.y += f.speed * dt;

      // Tongue tip catch
      if (tongueLen > 20 && Math.hypot(f.x - tongueTipX, f.y - tongueTipY) < f.size + 20) {
        caught++;
        catchAnim = 0.5;
        game.audio.play('se_success', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100, life:0.5, col: C.flakeHi });
        }
        flakes.splice(fi, 1);
        tongueOut = false;  // retract after catch
        if (caught >= NEEDED && !done) {
          done = true;
          game.end.success(caught * 200 + Math.ceil(timeLeft) * 80);
        }
        continue;
      }

      if (f.y > H + 40) {
        missed++;
        game.audio.play('se_failure', 0.1);
        flakes.splice(fi, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 300);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.8);

    // Snow background
    for (var si = 0; si < 40; si++) {
      var sx = (si * 87 + elapsed * 15) % W;
      var sy = (si * 133 + elapsed * 30) % H;
      game.draw.circle(sx, sy, 2, C.snow, 0.2);
    }

    // Flakes
    for (var fi2 = 0; fi2 < flakes.length; fi2++) {
      drawFlake(flakes[fi2].x, flakes[fi2].y, flakes[fi2].size, flakes[fi2].angle, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Tongue
    if (tongueLen > 0) {
      game.draw.line(FACE_X, FACE_Y - FACE_R, FACE_X, FACE_Y - FACE_R - tongueLen, C.tongue, 20);
      game.draw.circle(FACE_X, FACE_Y - FACE_R - tongueLen, 18, C.tongueHi, 0.9);
    }

    // Face
    game.draw.circle(FACE_X, FACE_Y, FACE_R + 12, C.face, 0.15);
    game.draw.circle(FACE_X, FACE_Y, FACE_R, C.face, 0.9);
    // Eyes
    game.draw.circle(FACE_X - 36, FACE_Y - 28, 18, '#fff', 0.9);
    game.draw.circle(FACE_X + 36, FACE_Y - 28, 18, '#fff', 0.9);
    game.draw.circle(FACE_X - 36, FACE_Y - 28, 10, '#1a1a2e', 0.9);
    game.draw.circle(FACE_X + 36, FACE_Y - 28, 10, '#1a1a2e', 0.9);
    // Rosy cheeks
    game.draw.circle(FACE_X - 60, FACE_Y + 20, 22, '#fca5a5', 0.4);
    game.draw.circle(FACE_X + 60, FACE_Y + 20, 22, '#fca5a5', 0.4);
    // Mouth (open upward)
    game.draw.rect(FACE_X - 30, FACE_Y + 42, 60, 22, C.mouth, 0.9);
    if (catchAnim > 0) {
      game.draw.circle(FACE_X, FACE_Y, FACE_R + 20, C.caught, catchAnim * 0.3);
    }

    // Progress display
    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('逃し: ' + missed, W / 2, H * 0.93, { size: 38, color: missed > MAX_MISS * 0.6 ? C.missed : C.ui });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.flake : C.missed);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.5;
  });
})(game);
