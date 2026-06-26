// 507-clock-hand.js
// クロックハンド — 回転する時計の針が指定の時刻を指した瞬間にタップ
// 操作: 針が目標の時刻角度に来たらタップ（精度でスコアが変わる）
// 成功: 15回成功  失敗: 10回ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030210',
    face:   '#0a0828',
    rim:    '#4338ca',
    rimHi:  '#818cf8',
    hand:   '#f1f5f9',
    handHi: '#fff',
    target: '#f59e0b',
    targetHi:'#fef08a',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    tick:   '#312e81'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var CLOCK_R = 320;
  var HAND_LEN = 240;

  var handAngle = 0; // current angle in radians (0 = 12 o'clock = -PI/2 in math)
  var handSpeed = Math.PI; // rad/s = 0.5 rotations/sec
  var targetAngle = 0; // target in normalized 0..2PI
  var tolerance = 0.25; // radians

  var hits = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.correct;
  var resultLife = 0;
  var flashAnim = 0;

  function newTarget() {
    // Random hour position (1-12)
    var hour = 1 + Math.floor(Math.random() * 12);
    targetAngle = (hour / 12) * Math.PI * 2;
  }

  function normalizeAngle(a) {
    while (a < 0) a += Math.PI * 2;
    while (a >= Math.PI * 2) a -= Math.PI * 2;
    return a;
  }

  function angleDiff(a, b) {
    var d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  function angleToXY(angle, len) {
    // 0 = top (12 o'clock), clockwise
    return {
      x: CX + Math.sin(angle) * len,
      y: CY - Math.cos(angle) * len
    };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var diff = angleDiff(handAngle, targetAngle);
    if (diff <= tolerance) {
      hits++;
      var accuracy = 1 - diff / tolerance;
      var pts = Math.floor(accuracy * 200 + 100);
      resultText = diff < 0.1 ? 'パーフェクト！' : 'グッド！';
      resultCol = C.correct;
      resultLife = 0.8;
      flashAnim = 0.4;
      game.audio.play('se_success', 0.7 + accuracy * 0.2);
      var pt = angleToXY(handAngle, HAND_LEN);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: pt.x, y: pt.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.targetHi });
      }
      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hits * 300 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        tolerance = Math.max(0.12, tolerance - 0.01);
        newTarget();
      }
    } else {
      misses++;
      resultText = 'ズレてる！';
      resultCol = C.wrong;
      resultLife = 0.7;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
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

    if (resultLife > 0) resultLife -= dt * 2;
    if (flashAnim > 0) flashAnim -= dt * 3;

    handAngle = normalizeAngle(handAngle + handSpeed * dt);
    // Speed increases with hits
    handSpeed = Math.PI + hits * 0.08;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Clock face
    game.draw.circle(CX, CY, CLOCK_R + 16, C.rimHi, 0.2);
    game.draw.circle(CX, CY, CLOCK_R, C.rim, 0.9);
    game.draw.circle(CX, CY, CLOCK_R - 18, C.face, 0.95);

    // Hour ticks
    for (var hi = 0; hi < 12; hi++) {
      var tickAngle = (hi / 12) * Math.PI * 2;
      var ot = angleToXY(tickAngle, CLOCK_R - 24);
      var it = angleToXY(tickAngle, CLOCK_R - 55);
      game.draw.line(ot.x, ot.y, it.x, it.y, C.tick, 8);
      // Hour number
      var numPt = angleToXY(tickAngle, CLOCK_R - 80);
      var hourNum = hi === 0 ? 12 : hi;
      game.draw.text(hourNum + '', numPt.x, numPt.y + 14, { size: 36, color: C.rimHi });
    }

    // Target indicator
    var tPt = angleToXY(targetAngle, CLOCK_R - 30);
    game.draw.circle(tPt.x, tPt.y, 28, C.target, 0.3 + Math.sin(elapsed * 5) * 0.1);
    game.draw.circle(tPt.x, tPt.y, 18, C.target, 0.9);
    // Target tolerance arc (subtle)
    var tInner = angleToXY(targetAngle - tolerance, CLOCK_R - 40);
    var tOuter = angleToXY(targetAngle + tolerance, CLOCK_R - 40);
    game.draw.line(tInner.x, tInner.y, tOuter.x, tOuter.y, C.target, 4);

    // Hand
    var handPt = angleToXY(handAngle, HAND_LEN);
    var handBase = angleToXY(handAngle + Math.PI, 40);
    game.draw.line(handBase.x, handBase.y, handPt.x, handPt.y, C.handHi, 8);
    game.draw.circle(handPt.x, handPt.y, 16, C.hand, 0.9);
    game.draw.circle(CX, CY, 24, C.hand, 0.9);

    // Proximity highlight
    var diff2 = angleDiff(handAngle, targetAngle);
    if (diff2 < tolerance) {
      game.draw.circle(CX, CY, CLOCK_R + 8, C.correct, 0.1 + (tolerance - diff2) / tolerance * 0.2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.12);

    // Target hour text
    var targetHour = Math.round(targetAngle / (Math.PI * 2) * 12);
    if (targetHour === 0) targetHour = 12;
    game.draw.text(targetHour + '時を狙え', W / 2, CY + CLOCK_R + 60, { size: 52, color: C.target, bold: true });

    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 64, color: resultCol, bold: true });
    }

    // Miss dots
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx2 = W * 0.1 + (mi % missPerRow) * (W * 0.8 / (missPerRow - 1));
      var my2 = mi < missPerRow ? H * 0.948 : H * 0.963;
      game.draw.circle(mx2, my2, 14, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.rim : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    newTarget();
  });
})(game);
