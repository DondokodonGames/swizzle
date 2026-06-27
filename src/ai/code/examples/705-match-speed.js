// 705-match-speed.js
// 速度合わせ — 流れるラインのスピードに合わせてタップのリズムを同期せよ
// 操作: タップで速度をリセット（ラインが消えた瞬間に合わせて）
// 成功: 20回同期  失敗: 10回ずれる or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a14',
    line:    '#0ea5e9',
    lineHi:  '#38bdf8',
    zone:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040c18'
  };

  // A vertical line scrolls from top to bottom
  // A "sync zone" exists at a target position (bottom ~80%)
  // When the line enters the zone, player should tap
  // Multiple lines scroll at constant interval

  var LINE_SPEED = 600; // px per second
  var LINE_INTERVAL = H * 0.55; // distance between lines
  var ZONE_Y = H * 0.78;
  var ZONE_H = 80;

  var lines = []; // { y }
  var lastLineY = 0;
  var syncs = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var hitFlash = 0;
  var tapY = 0;

  // Initialize lines
  lines.push({ y: H * 0.1 });
  lines.push({ y: H * 0.1 - LINE_INTERVAL });
  lines.push({ y: H * 0.1 - LINE_INTERVAL * 2 });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if any line is in the zone
    var hit = false;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].y >= ZONE_Y - ZONE_H / 2 && lines[i].y <= ZONE_Y + ZONE_H / 2) {
        hit = true;
        tapY = lines[i].y;
        // How close to center?
        var err = Math.abs(lines[i].y - ZONE_Y);
        var accuracy = 1 - err / (ZONE_H / 2);
        syncs++;
        hitFlash = 0.3;
        flashCol = C.correct;
        flashAnim = 0.25;
        if (accuracy > 0.7) {
          resultText = 'ぴったり！';
        } else {
          resultText = 'いい感じ！';
        }
        resultTimer = 0.4;
        game.audio.play('se_tap', 0.12 + accuracy * 0.1);
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2 + (Math.random() - 0.5) * 400, y: ZONE_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.zone });
        }
        if (syncs >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(syncs * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
        break;
      }
    }
    if (!hit) {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ズレた！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (hitFlash > 0) hitFlash -= dt * 4;

    // Move lines
    for (var i = 0; i < lines.length; i++) {
      lines[i].y += LINE_SPEED * dt;
    }

    // Recycle lines that pass the bottom
    for (var i2 = lines.length - 1; i2 >= 0; i2--) {
      if (lines[i2].y > H + 60) {
        // Did it miss the zone (wasn't tapped in zone)?
        // We just recycle
        lines[i2].y = lines[i2].y - lines.length * LINE_INTERVAL;
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

    // Background vertical channel
    game.draw.rect(W / 2 - 20, 0, 40, H, '#0a1a2a', 0.6);

    // Zone
    game.draw.rect(0, ZONE_Y - ZONE_H / 2, W, ZONE_H, C.zone, 0.06);
    game.draw.line(0, ZONE_Y - ZONE_H / 2, W, ZONE_Y - ZONE_H / 2, C.zone, 3);
    game.draw.line(0, ZONE_Y + ZONE_H / 2, W, ZONE_Y + ZONE_H / 2, C.zone, 3);
    game.draw.text('ZONE', W / 2, ZONE_Y + 16, { size: 36, color: C.zone + '88', bold: true });

    if (hitFlash > 0) {
      game.draw.rect(0, ZONE_Y - ZONE_H / 2, W, ZONE_H, C.zone, hitFlash * 0.3);
    }

    // Lines
    for (var li = 0; li < lines.length; li++) {
      var ly = lines[li].y;
      if (ly < -10 || ly > H + 10) continue;
      var inZone = ly >= ZONE_Y - ZONE_H / 2 && ly <= ZONE_Y + ZONE_H / 2;
      var lCol = inZone ? C.lineHi : C.line;
      var lAlpha = inZone ? 0.95 : 0.7;
      // Glow
      game.draw.rect(0, ly - 6, W, 12, lCol, lAlpha * 0.15);
      // Main line
      game.draw.rect(0, ly - 3, W, 6, lCol, lAlpha);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 60, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx = W / 2 - (MAX_MISS - 1) * 40 + mi * 80;
      game.draw.circle(mx, H * 0.955, 16, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(syncs + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
