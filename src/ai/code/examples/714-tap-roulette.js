// 714-tap-roulette.js
// タップルーレット — ルーレットが目標数字に止まるようにタップで減速させろ
// 操作: タップで回転速度を落とす（何回かタップで止める）
// 成功: 15回目標に止める  失敗: 10回外す or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060210',
    wheel:   '#1e1b4b',
    wheelHi: '#312e81',
    needle:  '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080418'
  };

  var SEGMENTS = 8;
  var SEG_COLORS = ['#dc2626','#d97706','#16a34a','#0ea5e9','#7c3aed','#db2777','#0d9488','#b45309'];
  var SEG_LABELS = ['1','2','3','4','5','6','7','8'];

  var CX = W / 2;
  var CY = H * 0.42;
  var WHEEL_R = 280;
  var NEEDLE_Y = CY - WHEEL_R - 20;

  var angle = 0;
  var spinSpeed = 6.0; // radians per second
  var MIN_SPEED = 0.3;
  var DECEL = 1.2; // natural deceleration
  var TAP_DECEL = 2.5; // deceleration per tap

  var targetSeg = 0; // 0-indexed segment that must be at top (needle)
  var spinning = true;
  var resultWait = 0;

  var score = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function getTopSeg() {
    // Needle points up = angle 0 at top
    // Segment at top = the one whose center is nearest to angle π*3/2 (pointing up after offset)
    var normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var segAngle = Math.PI * 2 / SEGMENTS;
    // Needle at top = angle 0 relative to wheel being straight up
    var topAngle = (Math.PI * 3 / 2 - normalizedAngle + Math.PI * 2) % (Math.PI * 2);
    var seg = Math.floor(topAngle / segAngle) % SEGMENTS;
    return seg;
  }

  function pickTarget() {
    targetSeg = Math.floor(Math.random() * SEGMENTS);
    spinSpeed = 5 + Math.random() * 4;
    spinning = true;
    resultWait = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || !spinning) return;
    // Each tap slows it down
    spinSpeed = Math.max(MIN_SPEED, spinSpeed - TAP_DECEL);
    game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 3; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: CX + Math.cos(pa) * WHEEL_R, y: CY + Math.sin(pa) * WHEEL_R, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 100, life: 0.3, col: '#ffffff44' });
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

    if (resultWait > 0) {
      resultWait -= dt;
      if (resultWait <= 0) pickTarget();
    }

    if (spinning) {
      // Natural deceleration
      spinSpeed = Math.max(MIN_SPEED, spinSpeed - DECEL * dt);
      angle += spinSpeed * dt;

      // Wheel stopped
      if (spinSpeed <= MIN_SPEED) {
        spinning = false;
        var landedSeg = getTopSeg();
        if (landedSeg === targetSeg) {
          score++;
          flashCol = C.correct;
          flashAnim = 0.35;
          resultText = '当たり！';
          resultTimer = 0.7;
          game.audio.play('se_success', 0.65);
          for (var p2 = 0; p2 < 8; p2++) {
            var pa2 = Math.random() * Math.PI * 2;
            particles.push({ x: CX, y: CY, vx: Math.cos(pa2) * 260, vy: Math.sin(pa2) * 260, life: 0.6, col: SEG_COLORS[targetSeg] });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 80); }, 700);
          } else {
            resultWait = 0.9;
          }
        } else {
          misses++;
          flashCol = C.wrong;
          flashAnim = 0.35;
          resultText = 'ハズレ！(' + SEG_LABELS[landedSeg] + ')';
          resultTimer = 0.7;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            resultWait = 0.9;
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Wheel segments
    var segAngle2 = Math.PI * 2 / SEGMENTS;
    for (var seg = 0; seg < SEGMENTS; seg++) {
      var a1 = angle + seg * segAngle2;
      var a2 = a1 + segAngle2;
      var midA = (a1 + a2) / 2;
      // Approximate segment with a large circle arc via multiple rectangles/circles
      // Draw pie slice using fan of triangles (via overlapping rects toward center)
      for (var r2 = 0; r2 < WHEEL_R; r2 += 20) {
        var arcLen = r2 * segAngle2;
        var cos1 = Math.cos(midA), sin1 = Math.sin(midA);
        game.draw.rect(CX + cos1 * r2 - 10, CY + sin1 * r2 - 10, 20, 20, SEG_COLORS[seg], 0.9);
      }
    }

    // Wheel border
    for (var s2 = 0; s2 < SEGMENTS; s2++) {
      var la = angle + s2 * segAngle2;
      var lx = CX + Math.cos(la) * WHEEL_R;
      var ly = CY + Math.sin(la) * WHEEL_R;
      game.draw.line(CX, CY, lx, ly, '#000000', 4);
    }
    game.draw.circle(CX, CY, WHEEL_R, C.wheel, 0);
    // Outer ring
    for (var os = 0; os < 36; os++) {
      var oa = os * Math.PI * 2 / 36;
      game.draw.circle(CX + Math.cos(oa) * WHEEL_R, CY + Math.sin(oa) * WHEEL_R, 8, '#000', 0.5);
    }

    // Segment labels
    for (var sl = 0; sl < SEGMENTS; sl++) {
      var la2 = angle + sl * segAngle2 + segAngle2 / 2;
      var lx2 = CX + Math.cos(la2) * WHEEL_R * 0.65;
      var ly2 = CY + Math.sin(la2) * WHEEL_R * 0.65;
      game.draw.text(SEG_LABELS[sl], lx2, ly2 + 14, { size: 48, color: '#fff', bold: true });
    }

    // Center hub
    game.draw.circle(CX, CY, 32, '#111', 0.9);
    game.draw.circle(CX, CY, 18, '#334155', 0.9);

    // Needle (pointing up)
    game.draw.line(CX, NEEDLE_Y - 20, CX, NEEDLE_Y + 40, C.needle, 6);
    game.draw.circle(CX, NEEDLE_Y - 20, 14, C.needle, 0.95);

    // Target segment display
    game.draw.rect(W * 0.7, CY - 80, 200, 160, SEG_COLORS[targetSeg], 0.85);
    game.draw.text('目標', W * 0.7 + 100, CY - 45, { size: 34, color: '#fff' });
    game.draw.text(SEG_LABELS[targetSeg], W * 0.7 + 100, CY + 30, { size: 80, color: '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 60, color: flashCol, bold: true });
    }

    // Speed indicator
    var speedRatio = Math.min(1, spinSpeed / 9);
    game.draw.rect(40, H * 0.73, 40, 200, C.ui, 0.7);
    game.draw.rect(40, H * 0.73 + 200 * (1 - speedRatio), 40, 200 * speedRatio, spinning ? '#fbbf24' : C.correct, 0.85);
    game.draw.text('速', 60, H * 0.73 - 20, { size: 30, color: '#ffffff44' });

    for (var mi = 0; mi < MAX_MISS; mi += 2) {
      game.draw.circle(W / 2 - (MAX_MISS / 2 - 1) * 52 + (mi / 2) * 104, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    pickTarget();
  });
})(game);
