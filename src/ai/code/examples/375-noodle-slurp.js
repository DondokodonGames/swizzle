// 375-noodle-slurp.js
// ヌードルスラープ — 麺が飛んでくるタイミングにスワイプで吸い込む
// 操作: 上スワイプで麺を吸い込む
// 成功: 20本吸い込む  失敗: 5本逃す or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1c0a00',
    bowl:   '#7c2d12',
    bowlHi: '#b45309',
    broth:  '#d97706',
    brothHi:'#fbbf24',
    noodle: '#fef3c7',
    noodleHi:'#fff',
    slurp:  '#f97316',
    face:   '#fde68a',
    faceHi: '#fff',
    mouth:  '#7c2d12',
    missed: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#6b7280'
  };

  var noodles = [];
  var particles = [];
  var slurped = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var spawnTimer = 0;
  var slurpAnim = 0;
  var mouthOpen = 0;

  var BOWL_X = W / 2;
  var BOWL_Y = H * 0.82;
  var FACE_Y = H * 0.32;

  function spawnNoodle() {
    var side = Math.random() < 0.5 ? -1 : 1;
    noodles.push({
      x: W / 2 + side * (150 + Math.random() * 200),
      y: BOWL_Y - 60,
      vy: -300 - Math.random() * 200,
      vx: side * (-100 - Math.random() * 80),
      len: 80 + Math.random() * 80,
      angle: Math.random() * Math.PI,
      slurping: false,
      missed: false,
      alpha: 1
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir !== 'up') return;
    // Slurp! catch nearest noodle in zone
    mouthOpen = 0.6;
    var caught = false;
    for (var ni = noodles.length - 1; ni >= 0; ni--) {
      var n = noodles[ni];
      if (n.slurping || n.missed) continue;
      var distX = Math.abs(n.x - W / 2);
      var distY = n.y - FACE_Y;
      if (distX < 200 && distY > 0 && distY < H * 0.5) {
        n.slurping = true;
        caught = true;
        game.audio.play('se_success', 0.4);
        break;
      }
    }
    if (caught) {
      slurpAnim = 0.5;
    } else {
      game.audio.play('se_failure', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (slurpAnim > 0) slurpAnim -= dt * 3;
    if (mouthOpen > 0) mouthOpen -= dt * 3;

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnNoodle();
      spawnTimer = 0.8 + Math.random() * 0.6;
    }

    // Update noodles
    for (var ni = noodles.length - 1; ni >= 0; ni--) {
      var n = noodles[ni];
      if (n.slurping) {
        // Move toward mouth
        var dx = W / 2 - n.x, dy = FACE_Y - n.y;
        var dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 30) {
          // Eaten!
          slurped++;
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W/2, y: FACE_Y, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life:0.4, col: C.noodleHi });
          }
          noodles.splice(ni, 1);
          if (slurped >= NEEDED && !done) {
            done = true;
            game.end.success(slurped * 200 + Math.ceil(timeLeft) * 80);
          }
          continue;
        }
        n.x += (dx / dist) * 500 * dt;
        n.y += (dy / dist) * 500 * dt;
      } else {
        // Fly up then fall
        n.vy += 500 * dt;
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        n.angle += dt * 2;

        // Check if passed face level going up — window to catch
        if (n.y < FACE_Y - 100) {
          // Too high — missed
          if (!n.missed) {
            n.missed = true;
            missed++;
            game.audio.play('se_failure', 0.3);
            if (missed >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 400);
            }
          }
        }

        // Remove if off screen
        if (n.y > H + 100) {
          noodles.splice(ni, 1);
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

    // Bowl
    game.draw.circle(BOWL_X, BOWL_Y, 220, C.bowl, 0.9);
    game.draw.circle(BOWL_X, BOWL_Y, 200, C.broth, 0.85);
    // Broth surface shimmer
    game.draw.circle(BOWL_X - 60, BOWL_Y - 40, 40, C.brothHi, 0.4);
    game.draw.circle(BOWL_X + 80, BOWL_Y - 20, 25, C.brothHi, 0.3);

    // Noodles in bowl
    for (var ni2 = 0; ni2 < 5; ni2++) {
      var bx = BOWL_X + (ni2 - 2) * 55;
      game.draw.line(bx, BOWL_Y - 40, bx + Math.sin(elapsed + ni2) * 30, BOWL_Y + 40, C.noodle, 6);
    }

    // Noodles flying
    for (var ni3 = 0; ni3 < noodles.length; ni3++) {
      var n3 = noodles[ni3];
      var nx = n3.x + Math.cos(n3.angle) * n3.len / 2;
      var ny = n3.y + Math.sin(n3.angle) * n3.len / 2;
      var col = n3.missed ? C.missed : (n3.slurping ? C.slurp : C.noodle);
      game.draw.line(n3.x, n3.y, nx, ny, col, 10);
      game.draw.line(n3.x, n3.y, n3.x - Math.cos(n3.angle) * n3.len * 0.4, n3.y - Math.sin(n3.angle) * n3.len * 0.4, col, 8);
    }

    // Face
    // Head
    game.draw.circle(W / 2, FACE_Y, 120, C.face, 0.9);
    // Eyes
    game.draw.circle(W / 2 - 44, FACE_Y - 28, 20, '#fff', 0.9);
    game.draw.circle(W / 2 + 44, FACE_Y - 28, 20, '#fff', 0.9);
    game.draw.circle(W / 2 - 44, FACE_Y - 28, 12, '#1a1a2e', 0.9);
    game.draw.circle(W / 2 + 44, FACE_Y - 28, 12, '#1a1a2e', 0.9);
    // Cheeks
    game.draw.circle(W / 2 - 72, FACE_Y + 20, 24, '#fca5a5', 0.4);
    game.draw.circle(W / 2 + 72, FACE_Y + 20, 24, '#fca5a5', 0.4);
    // Mouth
    var mouthH = 18 + mouthOpen * 40;
    game.draw.rect(W / 2 - 44, FACE_Y + 44, 88, mouthH, C.mouth, 0.9);
    if (slurpAnim > 0) {
      game.draw.circle(W / 2, FACE_Y + 44 + mouthH / 2, 30 * slurpAnim, C.slurp, slurpAnim * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    // Instruction
    game.draw.text('上スワイプで吸い込む！', W / 2, H * 0.58, { size: 36, color: C.ui });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 32 + mi * 64, H * 0.935, 16, mi < missed ? C.missed : '#2a0f00', 0.9);
    }

    game.draw.text(slurped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.broth : C.missed);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
