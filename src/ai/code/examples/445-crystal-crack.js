// 445-crystal-crack.js
// クリスタル割り — 正確な角度でクリスタルを叩いて割る
// 操作: スワイプしてハンマーの角度を決めてクリスタルを叩く
// 成功: 8個割る  失敗: 3回外れ or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04091a',
    crystal:'#67e8f9',
    crystalHi:'#e0f2fe',
    crystalDk:'#0891b2',
    crack:  '#f0f9ff',
    target: '#fbbf24',
    targetHi:'#fef3c7',
    hammer: '#94a3b8',
    hammerHi:'#e2e8f0',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    spark:  '#fff'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var CRYSTAL_R = 120;

  var targetAngle = 0;
  var cracks = [];
  var particles = [];
  var phase = 'aim';  // aim, cracking, result
  var swipeAngle = null;
  var resultTimer = 0;
  var hammerAngle = 0;
  var hammerAnim = 0;

  var broken = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 45;
  var flashAnim = 0;
  var flashCol = C.correct;

  function newCrystal() {
    targetAngle = Math.floor(Math.random() * 8) * Math.PI / 4 + (Math.random() - 0.5) * 0.3;
    cracks = [];
    phase = 'aim';
    swipeAngle = null;
    hammerAnim = 0;
  }

  function angleDiff(a, b) {
    var d = ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return Math.abs(d);
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || phase !== 'aim') return;
    var dx = x2 - x1;
    var dy = y2 - y1;
    swipeAngle = Math.atan2(dy, dx);
    hammerAngle = swipeAngle;
    hammerAnim = 0.4;
    phase = 'cracking';
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (hammerAnim > 0) hammerAnim -= dt * 3;

    if (phase === 'cracking') {
      // Check result after animation
      if (hammerAnim <= 0) {
        var diff = angleDiff(swipeAngle, targetAngle);
        var success = diff < Math.PI / 8;
        phase = 'result';
        resultTimer = 0;

        if (success) {
          broken++;
          flashCol = C.correct;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          // Generate crack lines
          for (var ci = 0; ci < 6; ci++) {
            var cAngle = targetAngle + (Math.random() - 0.5) * 0.8;
            cracks.push({ angle: cAngle, len: 40 + Math.random() * 80 });
          }
          for (var pi = 0; pi < 14; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var tx = CX + Math.cos(targetAngle) * CRYSTAL_R * 0.7;
            var ty = CY + Math.sin(targetAngle) * CRYSTAL_R * 0.7;
            particles.push({ x: tx, y: ty, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.6, col: C.crystalHi });
          }
          if (broken >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(broken * 500 + Math.ceil(timeLeft) * 80); }, 700);
          }
        } else {
          misses++;
          flashCol = C.wrong;
          flashAnim = 0.7;
          game.audio.play('se_failure', 0.5);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    if (phase === 'result') {
      resultTimer += dt;
      if (resultTimer > 1.0 && !done) {
        newCrystal();
      }
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

    // Crystal glow
    game.draw.circle(CX, CY, CRYSTAL_R + 40, C.crystalDk, 0.15);
    game.draw.circle(CX, CY, CRYSTAL_R + 20, C.crystalDk, 0.2);

    // Crystal facets (hexagon-ish)
    for (var fi = 0; fi < 6; fi++) {
      var fa = fi * Math.PI / 3;
      var fa2 = (fi + 1) * Math.PI / 3;
      var fx1 = CX + Math.cos(fa) * CRYSTAL_R;
      var fy1 = CY + Math.sin(fa) * CRYSTAL_R;
      var fx2 = CX + Math.cos(fa2) * CRYSTAL_R;
      var fy2 = CY + Math.sin(fa2) * CRYSTAL_R;
      game.draw.line(CX, CY, fx1, fy1, C.crystal, 3);
      game.draw.line(fx1, fy1, fx2, fy2, C.crystal, 5);
    }
    game.draw.circle(CX, CY, CRYSTAL_R, C.crystal, 0.2);
    game.draw.circle(CX - CRYSTAL_R * 0.25, CY - CRYSTAL_R * 0.25, CRYSTAL_R * 0.2, C.crystalHi, 0.3);

    // Target angle indicator
    var tx2 = CX + Math.cos(targetAngle) * (CRYSTAL_R + 60);
    var ty2 = CY + Math.sin(targetAngle) * (CRYSTAL_R + 60);
    game.draw.circle(tx2, ty2, 30, C.target, 0.9);
    game.draw.circle(tx2, ty2, 20, C.targetHi, 0.7);
    game.draw.line(CX + Math.cos(targetAngle) * CRYSTAL_R, CY + Math.sin(targetAngle) * CRYSTAL_R, tx2, ty2, C.target, 4);

    // Cracks
    for (var cr = 0; cr < cracks.length; cr++) {
      var c = cracks[cr];
      var cx2 = CX + Math.cos(targetAngle) * CRYSTAL_R * 0.3;
      var cy2 = CY + Math.sin(targetAngle) * CRYSTAL_R * 0.3;
      game.draw.line(cx2, cy2, cx2 + Math.cos(c.angle) * c.len, cy2 + Math.sin(c.angle) * c.len, C.crack, 3);
    }

    // Hammer
    if (phase !== 'aim') {
      var hDist = 200 + hammerAnim * 150;
      var hx = CX + Math.cos(hammerAngle) * hDist;
      var hy = CY + Math.sin(hammerAngle) * hDist;
      game.draw.circle(hx, hy, 40, C.hammer, 0.9);
      game.draw.circle(hx, hy, 28, C.hammerHi, 0.6);
      game.draw.line(CX, CY, hx, hy, C.hammerHi, 8);
    }

    // Aim instruction
    if (phase === 'aim') {
      game.draw.text('スワイプで叩く！', W/2, H*0.82, { size: 48, color: C.target, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(broken + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.crystal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    newCrystal();
  });
})(game);
