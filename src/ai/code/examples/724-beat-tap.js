// 724-beat-tap.js
// ビートタップ — 点滅するビートに合わせてリズムよくタップせよ
// 操作: タップ — ビートが光ったタイミングに合わせる
// 成功: 30ビート命中  失敗: 12回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080208',
    beat:    '#c026d3',
    beatHi:  '#f0abfc',
    beatOn:  '#e879f9',
    ring:    '#7e22ce',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0e040f'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var BEAT_R = 140;
  var BEAT_DUR = 0.18;  // how long beat stays lit
  var WINDOW = 0.22;    // tap window around beat center
  var BPM = 90;         // beats per minute
  var BEAT_INTERVAL = 60 / BPM;

  var beatTimer = BEAT_INTERVAL;
  var beatLit = 0;       // countdown while beat is lit
  var beatPhase = 0;     // time into current beat (0..BEAT_INTERVAL)
  var beatCount = 0;
  var lastBeatTime = -999;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 12;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var hitRing = 0;

  // Outer expanding rings for visual beat
  var rings = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    var inWindow = beatLit > 0;
    if (inWindow) {
      score++;
      hitRing = 0.5;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = 'ビート！';
      resultTimer = 0.4;
      game.audio.play('se_tap', 0.15);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.beatHi });
      }
      beatLit = 0; // consume the beat
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.25;
      resultText = 'ズレた！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    // Beat logic
    beatTimer -= dt;
    beatPhase += dt;
    if (beatLit > 0) beatLit -= dt;

    if (beatTimer <= 0) {
      beatTimer = BEAT_INTERVAL;
      beatPhase = 0;
      beatLit = BEAT_DUR;
      beatCount++;
      // Emit expanding ring
      rings.push({ r: BEAT_R * 0.5, life: 0.5 });
      game.audio.play('se_tap', 0.05);
    }

    // Update rings
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      rings[ri].r += 300 * dt;
      rings[ri].life -= dt * 2;
      if (rings[ri].life <= 0) rings.splice(ri, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (hitRing > 0) hitRing -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var isLit = beatLit > 0;
    var approachRatio = 1 - Math.min(1, beatTimer / BEAT_INTERVAL); // 0=just fired, 1=about to fire

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Approaching indicator (shrinking ring around beat circle)
    var approachR = BEAT_R * 1.8 * (1 - approachRatio) + BEAT_R * 1.05;
    game.draw.circle(CX, CY, approachR, C.ring, 0.15 + approachRatio * 0.15);

    // Expanding rings from beats
    for (var ri2 = 0; ri2 < rings.length; ri2++) {
      game.draw.circle(CX, CY, rings[ri2].r, C.beat, rings[ri2].life * 0.4);
    }

    // Hit ring
    if (hitRing > 0) {
      game.draw.circle(CX, CY, BEAT_R + (1 - hitRing) * 100, C.correct, hitRing * 0.4);
    }

    // Main beat circle
    game.draw.circle(CX + 5, CY + 5, BEAT_R, '#000', 0.3);
    game.draw.circle(CX, CY, BEAT_R, isLit ? C.beatOn : C.beat, isLit ? 0.95 : 0.65);
    game.draw.circle(CX, CY, BEAT_R * 0.6, isLit ? C.beatHi : C.ring, isLit ? 0.4 : 0.2);
    game.draw.circle(CX - BEAT_R * 0.32, CY - BEAT_R * 0.32, BEAT_R * 0.18, '#fff', isLit ? 0.5 : 0.2);

    // BPM rhythm dots
    var dotCount = 4;
    for (var di = 0; di < dotCount; di++) {
      var da = -Math.PI / 2 + di * Math.PI * 2 / dotCount;
      var dx2 = CX + Math.cos(da) * (BEAT_R + 56);
      var dy2 = CY + Math.sin(da) * (BEAT_R + 56);
      var dActive = (beatCount % dotCount) === di;
      game.draw.circle(dx2, dy2, 18, dActive ? C.beatHi : C.ring, dActive ? 0.9 : 0.3);
    }

    // Tap label
    game.draw.text(isLit ? 'タップ！' : '待て...', W / 2, CY + BEAT_R + 70, { size: 48, color: isLit ? C.beatHi : '#ffffff44', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 40 + ei * 80, H * 0.955, 16, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
