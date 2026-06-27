// 649-spin-match.js
// スピンマッチ — 回転する輪の色を揃えろ、タイミングが命
// 操作: タップで輪を停止させる
// 成功: 10回すべての色を合わせる  失敗: 8ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050508',
    ring1:   '#ef4444',
    ring2:   '#3b82f6',
    ring3:   '#22c55e',
    ring4:   '#f59e0b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0a14',
    glow:    '#ffffff22'
  };

  var RING_COLORS = [C.ring1, C.ring2, C.ring3, C.ring4];
  var RING_NAMES = ['赤', '青', '緑', '黄'];

  var CX = W / 2;
  var CY = H * 0.48;

  var NUM_RINGS = 4;
  var rings = [];
  var targets = [];
  var stopped = [];

  var correct = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0;
  var resultText = '';
  var checking = false;

  function SEGMENT_COUNT() { return RING_COLORS.length; }
  var SEG = 2 * Math.PI / SEGMENT_COUNT();

  function initRound() {
    rings = [];
    targets = [];
    stopped = [];
    checking = false;
    for (var i = 0; i < NUM_RINGS; i++) {
      var dir = Math.random() > 0.5 ? 1 : -1;
      rings.push({
        angle: Math.random() * Math.PI * 2,
        speed: (1.5 + Math.random() * 2 + i * 0.3) * dir,
        r: 120 + i * 100,
        stopped: false
      });
      targets.push(Math.floor(Math.random() * RING_COLORS.length));
      stopped.push(false);
    }
  }

  function getColorAtTop(angle) {
    // The color segment at angle 0 (top = -PI/2 from x-axis) normalized
    var normalized = ((-Math.PI / 2 - angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return Math.floor(normalized / SEG) % RING_COLORS.length;
  }

  function checkAll() {
    var allStopped = true;
    for (var i = 0; i < NUM_RINGS; i++) {
      if (!rings[i].stopped) { allStopped = false; break; }
    }
    if (!allStopped) return;

    checking = true;
    var allCorrect = true;
    for (var i2 = 0; i2 < NUM_RINGS; i2++) {
      var colorAtTop = getColorAtTop(rings[i2].angle);
      if (colorAtTop !== targets[i2]) { allCorrect = false; break; }
    }

    if (allCorrect) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '完璧！';
      resultTimer = 0.7;
      game.audio.play('se_success', 0.7);
      for (var p = 0; p < 10; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX + Math.cos(pa) * 200, y: CY + Math.sin(pa) * 200, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.6, col: RING_COLORS[Math.floor(Math.random() * 4)] });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 80); }, 800);
        return;
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '不正解！';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.35);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    setTimeout(initRound, 800);
  }

  game.onTap(function(tx, ty) {
    if (done || checking) return;
    // Stop the ring closest to tap
    var bestDist = Infinity;
    var bestIdx = -1;
    for (var i = 0; i < NUM_RINGS; i++) {
      if (rings[i].stopped) continue;
      var d = Math.abs(Math.sqrt((tx - CX) * (tx - CX) + (ty - CY) * (ty - CY)) - rings[i].r);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestDist < 80) {
      rings[bestIdx].stopped = true;
      game.audio.play('se_tap', 0.2);
      checkAll();
    }
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

    for (var i = 0; i < NUM_RINGS; i++) {
      if (!rings[i].stopped) {
        rings[i].angle += rings[i].speed * dt;
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

    // Center
    game.draw.circle(CX, CY, 30, C.ui, 0.9);

    // Rings
    for (var ri = 0; ri < NUM_RINGS; ri++) {
      var ring = rings[ri];
      var r = ring.r;
      // Draw ring as 4 colored arcs
      for (var si = 0; si < SEGMENT_COUNT(); si++) {
        var startA = ring.angle + si * SEG;
        var endA = startA + SEG;
        var midA = (startA + endA) / 2;
        // Draw segment as many points along arc
        for (var arc = 0; arc <= 12; arc++) {
          var a3 = startA + (arc / 12) * SEG;
          var ax = CX + Math.cos(a3) * r;
          var ay = CY + Math.sin(a3) * r;
          var alpha = ring.stopped ? 0.9 : 0.7;
          game.draw.circle(ax, ay, 22, RING_COLORS[si % RING_COLORS.length], alpha);
        }
      }
      // Target indicator at top
      var tAngle = -Math.PI / 2;
      var tx2 = CX + Math.cos(tAngle) * r;
      var ty2 = CY + Math.sin(tAngle) * r;
      game.draw.circle(tx2, ty2, 20, '#fff', 0.3);
      game.draw.text('▼', tx2, CY - r + 60, { size: 28, color: '#ffffff88' });

      if (ring.stopped) {
        game.draw.circle(tx2, ty2, 16, '#fff', 0.6);
      }
    }

    // Target colors display
    game.draw.text('合わせろ:', W / 2, H * 0.88, { size: 36, color: '#ffffff88' });
    for (var ti = 0; ti < NUM_RINGS; ti++) {
      var tgx = W / 2 + (ti - (NUM_RINGS - 1) / 2) * 120;
      game.draw.circle(tgx, H * 0.92, 32, RING_COLORS[targets[ti]], 0.85);
      game.draw.text(RING_NAMES[targets[ti]], tgx, H * 0.92 + 52, { size: 28, color: RING_COLORS[targets[ti]] });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 12 * p2.life, p2.col, p2.life);
    }

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 72, color: flashCol, bold: true });
    }
    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.965, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? RING_COLORS[0] : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    initRound();
  });
})(game);
