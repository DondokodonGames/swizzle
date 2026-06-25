// 219-tempo-tap.js
// テンポタップ — 変化するBPMに合わせてリズムよくタップし続ける音楽的忍耐ゲーム
// 操作: ビートに合わせてタップ
// 成功: 20連続パーフェクト  失敗: 3回大きくズレる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060a',
    ring:    '#1e3a5f',
    ringHi:  '#3b82f6',
    perfect: '#22c55e',
    good:    '#f59e0b',
    miss:    '#ef4444',
    beat:    '#a855f7',
    beatHi:  '#d8b4fe',
    ui:      '#475569'
  };

  var BPM = 100;
  var beatInterval = 60 / BPM;
  var beatTimer = 0;
  var beatPhase = 0;   // 0–1 within beat
  var combo = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var lastBeatTime = 0;
  var feedback = '';
  var feedbackTimer = 0;
  var feedbackCol = '#fff';
  var bpmChanging = false;
  var bpmChangeTimer = 8.0;
  var rings = []; // visual ring pulses
  var beatFlash = 0;
  var bpmLabel = BPM + ' BPM';

  function changeBPM() {
    var options = [80, 100, 120, 90, 110, 140];
    BPM = options[Math.floor(Math.random() * options.length)];
    beatInterval = 60 / BPM;
    bpmLabel = BPM + ' BPM';
    bpmChanging = true;
    setTimeout(function() { bpmChanging = false; }, 800);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var timeSinceBeat = elapsed - lastBeatTime;
    var timeToNextBeat = beatInterval - timeSinceBeat;
    // Closest beat distance
    var diff = Math.min(timeSinceBeat, timeToNextBeat);

    if (diff < 0.06) {
      // Perfect
      combo++;
      feedback = 'PERFECT!';
      feedbackCol = C.perfect;
      feedbackTimer = 0.5;
      game.audio.play('se_success', 0.6);
      rings.push({ r: 40, maxR: 200, life: 0.5 });
      if (combo >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(combo * 100 + Math.ceil(timeLeft) * 40); }, 400);
      }
    } else if (diff < 0.14) {
      // Good — partial combo credit
      feedback = 'GOOD';
      feedbackCol = C.good;
      feedbackTimer = 0.4;
      game.audio.play('se_tap', 0.5);
    } else {
      // Miss
      misses++;
      combo = 0;
      feedback = 'MISS';
      feedbackCol = C.miss;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // Beat advance
    beatTimer += dt;
    beatPhase = (beatTimer % beatInterval) / beatInterval;
    if (beatTimer >= beatInterval) {
      beatTimer -= beatInterval;
      lastBeatTime = elapsed;
      beatFlash = 1.0;
    }
    beatFlash = Math.max(0, beatFlash - dt * 5);

    // BPM change
    bpmChangeTimer -= dt;
    if (bpmChangeTimer <= 0) {
      changeBPM();
      bpmChangeTimer = 6.0 + Math.random() * 5.0;
    }

    // Rings
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      rings[ri].r += 300 * dt;
      rings[ri].life -= dt;
      if (rings[ri].life <= 0) rings.splice(ri, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat rings
    for (var ri2 = 0; ri2 < rings.length; ri2++) {
      var rg = rings[ri2];
      game.draw.circle(W / 2, H * 0.5, rg.r, C.perfect, rg.life * 0.5);
    }

    // Main beat circle
    var CX = W / 2, CY = H * 0.5;
    var R = 160;
    var shrink = 1 - beatPhase * 0.15;
    game.draw.circle(CX, CY, R * shrink + 20, C.ringHi, 0.1 + beatFlash * 0.3);
    game.draw.circle(CX, CY, R * shrink, C.ring, 0.8);

    // Beat indicator arc
    var arcEnd = beatPhase * Math.PI * 2 - Math.PI / 2;
    for (var a = -Math.PI / 2; a < arcEnd; a += 0.05) {
      game.draw.circle(CX + Math.cos(a) * R, CY + Math.sin(a) * R, 6, C.beat, 0.7);
    }

    // Hit zone markers (12 o'clock)
    var hzCol = beatFlash > 0.5 ? C.beatHi : C.beat;
    game.draw.circle(CX, CY - R, 20, hzCol, 0.9);
    game.draw.text('●', CX, CY - R, { size: 28, color: '#fff', bold: true });

    // BPM display
    var bpmPulse = bpmChanging ? (0.5 + 0.5 * Math.abs(Math.sin(elapsed * 10))) : 1.0;
    game.draw.text(bpmLabel, CX, CY - 20, { size: 52, color: C.beat, bold: true });
    game.draw.text('BPM', CX, CY + 40, { size: 36, color: C.ui });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, CX, CY + 130, { size: 64, color: feedbackCol, bold: true });
    }

    // Combo
    game.draw.text('COMBO: ' + combo, CX, H * 0.82, { size: 52, color: combo > 0 ? C.perfect : C.ui, bold: combo > 0 });
    game.draw.text(combo + ' / ' + NEEDED, CX, 148, { size: 60, color: '#f1f5f9', bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(CX - (MAX_MISS - 1) * 30 + mi * 60, H * 0.88, 18, mi < misses ? C.miss : '#0a0a14');
    }

    game.draw.text('ビートでタップ！', CX, H * 0.93, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beat : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    beatTimer = 0;
    lastBeatTime = 0;
  });
})(game);
