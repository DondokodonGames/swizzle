// 793-tempo-tap.js
// テンポタップ — リズムに合わせてタップせよ。ビートを外すな
// 操作: タップ — 点滅するビートに合わせてタップ（±0.18秒以内）
// 成功: 30ビート完璧  失敗: 8回外す or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060208',
    beat:    '#a855f7',
    beatGlow:'#7e22ce',
    beatHi:  '#e879f9',
    onBeat:  '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080410'
  };

  var BPM = 90;
  var beatInterval = 60 / BPM;
  var beatTimer = 0;
  var beatPhase = 0; // 0 to 1 within a beat cycle
  var WINDOW = 0.18; // tap window in seconds
  var beatCount = 0; // total beats so far
  var lastBeatTime = 0;
  var waitingForTap = false;
  var beatAnswered = false;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var rings = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var particles = [];
  var hitAnim = 0;
  var consecutiveHits = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if within beat window
    var timeSinceBeat = elapsed - lastBeatTime;
    var inWindow = timeSinceBeat <= WINDOW || (beatInterval - timeSinceBeat) <= WINDOW;
    // Actually check proximity to nearest beat
    var timeToNextBeat = beatInterval - (elapsed % beatInterval);
    var timeFromLastBeat = elapsed % beatInterval;
    var nearestBeatDist = Math.min(timeFromLastBeat, timeToNextBeat);

    if (nearestBeatDist <= WINDOW) {
      // On beat!
      if (!beatAnswered) {
        score++;
        consecutiveHits++;
        beatAnswered = true;
        hitAnim = 0.4;
        var combo = consecutiveHits >= 5 ? '🔥' + consecutiveHits + 'コンボ！' : (consecutiveHits >= 3 ? consecutiveHits + 'コンボ！' : 'ビート！');
        flashCol = C.correct;
        flashAnim = 0.18;
        resultText = combo;
        resultTimer = 0.35;
        game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.44, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.35, col: C.onBeat });
        }
        rings.push({ r: 60, maxR: 320, life: 1.0 });
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 350 + consecutiveHits * 100 + Math.ceil(timeLeft) * 120); }, 700);
        }
      }
    } else {
      // Off beat
      errors++;
      consecutiveHits = 0;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = 'ズレた！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.28);
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

    // BPM increases with score
    BPM = Math.min(160, 90 + score * 1.5);
    beatInterval = 60 / BPM;

    beatTimer += dt;
    beatPhase = (elapsed % beatInterval) / beatInterval;

    // On each beat
    if (beatTimer >= beatInterval) {
      beatTimer -= beatInterval;
      beatCount++;
      lastBeatTime = elapsed;
      beatAnswered = false;
      game.audio.play('se_tap', 0.03);
    }

    // Check if beat was missed (window passed with no tap)
    if (!beatAnswered) {
      var timeFromBeat = elapsed - lastBeatTime;
      if (timeFromBeat > WINDOW + 0.05 && lastBeatTime > 0 && beatCount > 0) {
        if (timeFromBeat < beatInterval - WINDOW) {
          // This is valid "missed" territory
          // Only count once per beat
        }
      }
    }

    // Update rings
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      rings[ri].r += 500 * dt;
      rings[ri].life = 1 - rings[ri].r / rings[ri].maxR;
      if (rings[ri].life <= 0) rings.splice(ri, 1);
    }

    if (hitAnim > 0) hitAnim -= dt * 3;
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat pulse: main circle
    var CX = W / 2;
    var CY = H * 0.44;
    var beatPulse = Math.sin(beatPhase * Math.PI); // 0→1→0 each beat
    var pulse = 1 + beatPulse * 0.15;
    var mainR = 120 * pulse;

    // Glow
    game.draw.circle(CX, CY, mainR + 60 * beatPulse, C.beatGlow, beatPulse * 0.2);
    game.draw.circle(CX, CY, mainR, C.beat, 0.5 + beatPulse * 0.4);
    game.draw.circle(CX, CY, mainR * 0.6, C.beatHi, 0.3 + beatPulse * 0.6);
    game.draw.circle(CX, CY, mainR * 0.25, '#fff', beatPulse * 0.8);

    // Hit animation
    if (hitAnim > 0) {
      game.draw.circle(CX, CY, mainR * (1 + hitAnim * 0.5), C.onBeat, hitAnim * 0.25);
    }

    // Expanding rings
    for (var ri2 = 0; ri2 < rings.length; ri2++) {
      var rg = rings[ri2];
      for (var rj = 0; rj < 24; rj++) {
        if (rj % 3 === 2) continue;
        var ra = rj * Math.PI * 2 / 24;
        game.draw.circle(CX + Math.cos(ra) * rg.r, CY + Math.sin(ra) * rg.r, 7 * rg.life, C.correct, rg.life * 0.7);
      }
    }

    // Beat window indicator (arc)
    var windowFrac = WINDOW / beatInterval;
    for (var ai = 0; ai < 32; ai++) {
      var af = ai / 32;
      var inWindow2 = af < windowFrac || af > 1 - windowFrac;
      if (!inWindow2) continue;
      var aa = af * Math.PI * 2 - Math.PI / 2;
      game.draw.circle(CX + Math.cos(aa) * 180, CY + Math.sin(aa) * 180, 8, C.correct, 0.3);
    }

    // Current position on beat ring
    var curA = beatPhase * Math.PI * 2 - Math.PI / 2;
    game.draw.circle(CX + Math.cos(curA) * 180, CY + Math.sin(curA) * 180, 14, C.onBeat, 0.9);

    // Combo display
    if (consecutiveHits >= 3) {
      game.draw.text('×' + consecutiveHits, W / 2, H * 0.72, { size: 48, color: C.onBeat, bold: true });
    }

    // BPM display
    game.draw.text(Math.round(BPM) + ' BPM', W / 2, H * 0.79, { size: 34, color: C.beat + 'aa' });

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.855, { size: 48, color: flashCol, bold: true });
    }

    if (!done) {
      game.draw.text('ビートでタップ！', W / 2, H * 0.22, { size: 38, color: C.text + '44' });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
  });
})(game);
