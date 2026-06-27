// 618-clock-sync.js
// クロックシンク — 時計の針をぴったり合わせろ
// 操作: タップで針を止める、指示された時刻に一致させる
// 成功: 10回正確に一致  失敗: 8回外れ or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04040c',
    face:    '#0d0d20',
    faceHi:  '#1a1a35',
    rim:     '#334488',
    rimHi:   '#5566aa',
    hour:    '#ff6b2b',
    hourHi:  '#ffaa88',
    minute:  '#22d3ee',
    minuteHi:'#a5f3fc',
    tick:    '#334466',
    correct: '#22c55e',
    wrong:   '#ef4444',
    target:  '#fbbf24',
    text:    '#f1f5f9',
    ui:      '#0a0a1a'
  };

  var CX = W / 2, CY = H * 0.42;
  var CLOCK_R = 280;

  var hourAngle = 0;    // current spinning angle (radians, 0=12)
  var minuteAngle = 0;
  var hourSpeed = 0.8;  // rad/s
  var minuteSpeed = 2.4;

  var targetHour = 0;   // target angle
  var targetMinute = 0;
  var hourStopped = false;
  var minuteStopped = false;
  var phase = 'hour';   // 'hour' | 'minute' | 'check'

  var successes = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultText = '';
  var resultTimer = 0;
  var checkTimer = 0;

  function nextRound() {
    // Random target time
    var h = Math.floor(Math.random() * 12);
    var m = Math.floor(Math.random() * 12) * 5; // 0,5,10,...55
    targetHour = (h / 12) * Math.PI * 2 - Math.PI / 2;
    targetMinute = (m / 60) * Math.PI * 2 - Math.PI / 2;
    // Randomize starting angles
    hourAngle = Math.random() * Math.PI * 2;
    minuteAngle = Math.random() * Math.PI * 2;
    hourStopped = false;
    minuteStopped = false;
    phase = 'hour';
    // Vary speeds
    hourSpeed = 0.6 + Math.random() * 0.5 + successes * 0.04;
    minuteSpeed = 1.8 + Math.random() * 1.2 + successes * 0.08;
  }

  function angleDiff(a, b) {
    var d = ((a - b) + Math.PI * 2) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'hour' && !hourStopped) {
      hourStopped = true;
      phase = 'minute';
      game.audio.play('se_tap', 0.25);
    } else if (phase === 'minute' && !minuteStopped) {
      minuteStopped = true;
      phase = 'check';
      // Evaluate
      var hDiff = angleDiff(hourAngle, targetHour);
      var mDiff = angleDiff(minuteAngle, targetMinute);
      var threshold = 0.25; // ~14 degrees
      var success = hDiff < threshold && mDiff < threshold;
      if (success) {
        successes++;
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = '正確!';
        resultTimer = 0.8;
        game.audio.play('se_success', 0.7);
        for (var p = 0; p < 10; p++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: CX, y: CY, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.correct });
        }
        if (successes >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(successes * 500 + Math.ceil(timeLeft) * 100); }, 800);
        }
      } else {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        var miss = Math.max(hDiff, mDiff);
        resultText = Math.round(miss * 180 / Math.PI) + '°ずれ';
        resultTimer = 0.8;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
      setTimeout(function() { if (!done) nextRound(); }, 1200);
    }
  });

  function drawHand(angle, length, width, col, colHi) {
    var x2 = CX + Math.cos(angle) * length;
    var y2 = CY + Math.sin(angle) * length;
    game.draw.line(CX, CY, x2, y2, colHi, width + 4);
    game.draw.line(CX, CY, x2, y2, col, width);
    // Back tip
    var bx = CX - Math.cos(angle) * length * 0.2;
    var by = CY - Math.sin(angle) * length * 0.2;
    game.draw.line(CX, CY, bx, by, col, width * 0.6);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (!hourStopped) hourAngle += hourSpeed * dt;
    if (!minuteStopped) minuteAngle += minuteSpeed * dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Clock face
    game.draw.circle(CX, CY, CLOCK_R + 16, C.rim, 0.8);
    game.draw.circle(CX, CY, CLOCK_R + 8, C.rimHi, 0.5);
    game.draw.circle(CX, CY, CLOCK_R, C.face, 1);

    // Hour markers
    for (var hi = 0; hi < 12; hi++) {
      var a = (hi / 12) * Math.PI * 2 - Math.PI / 2;
      var r1 = CLOCK_R - 30, r2 = CLOCK_R - 10;
      var mx1 = CX + Math.cos(a) * r1, my1 = CY + Math.sin(a) * r1;
      var mx2 = CX + Math.cos(a) * r2, my2 = CY + Math.sin(a) * r2;
      game.draw.line(mx1, my1, mx2, my2, C.rimHi, hi % 3 === 0 ? 6 : 3);
    }

    // Target hour indicator (dashed arc/dot)
    var thx = CX + Math.cos(targetHour) * (CLOCK_R - 50);
    var thy = CY + Math.sin(targetHour) * (CLOCK_R - 50);
    game.draw.circle(thx, thy, 14, C.target, 0.5 + Math.sin(elapsed * 6) * 0.2);
    // Target minute indicator
    var tmx = CX + Math.cos(targetMinute) * (CLOCK_R - 20);
    var tmy = CY + Math.sin(targetMinute) * (CLOCK_R - 20);
    game.draw.circle(tmx, tmy, 10, C.minute, 0.5 + Math.sin(elapsed * 6 + 1) * 0.2);

    // Hour hand
    drawHand(hourAngle, CLOCK_R * 0.52, 12, C.hour, C.hourHi);
    // Minute hand
    drawHand(minuteAngle, CLOCK_R * 0.78, 8, C.minute, C.minuteHi);

    // Center cap
    game.draw.circle(CX, CY, 18, C.rimHi, 0.9);
    game.draw.circle(CX, CY, 10, C.faceHi, 0.8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Phase instruction
    var inst = phase === 'hour' ? '時針を止めろ!' : (phase === 'minute' ? '分針を止めろ!' : '');
    if (inst) game.draw.text(inst, W / 2, CY + CLOCK_R + 80, { size: 48, color: phase === 'hour' ? C.hour : C.minute, bold: true });
    if (resultTimer > 0) game.draw.text(resultText, W / 2, CY + CLOCK_R + 80, { size: 56, color: flashCol, bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.rimHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    nextRound();
  });
})(game);
