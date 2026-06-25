// 167-tempo-keeper.js
// テンポキーパー — メトロノームのテンポを体で感じて正確に再現する音楽感覚ゲーム
// 操作: タップでビートを刻む
// 成功: 8回連続でジャスト判定  失敗: 外れが5回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06040c',
    metro:  '#374151',
    metroHi:'#6b7280',
    arm:    '#9ca3af',
    armHi:  '#f1f5f9',
    beat:   '#7c3aed',
    beatHi: '#a78bfa',
    perfect:'#fef08a',
    good:   '#22c55e',
    wrong:  '#ef4444',
    ui:     '#334155'
  };

  var BPM = 80; // target tempo
  var BEAT = 60 / BPM;
  var metroTimer = 0;
  var metroAngle = 0;
  var metroVel = 2.8; // radians per second
  var MAX_ANG = 0.7;
  var metroDir = 1;

  var expectedBeat = 0; // time of next expected tap
  var firstTap = false;
  var tapCount = 0;
  var PERFECT_WINDOW = 0.08; // ±80ms = perfect
  var GOOD_WINDOW = 0.15;    // ±150ms = good

  var streak = 0;
  var neededStreak = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackKind = 0; // 2=perfect, 1=good, 0=wrong
  var beatFlash = 0;
  var tapRings = [];

  // Guide beats counter
  var guideBeat = 0;
  var GUIDE_BEATS = 4; // play 4 metronome beats before player starts
  var guidePhase = true;

  game.onTap(function() {
    if (done) return;
    if (guidePhase) return; // Wait for guide to finish

    var now = metroTimer;
    // First tap sets expected rhythm
    if (!firstTap) {
      firstTap = true;
      expectedBeat = now + BEAT;
      tapCount++;
      feedbackKind = 1; feedback = 0.4;
      game.audio.play('se_tap', 0.8);
      tapRings.push({ x: W / 2, y: H * 0.55, r: 0, life: 0.6 });
      return;
    }

    var diff = Math.abs(now - expectedBeat);
    if (diff < PERFECT_WINDOW) {
      feedbackKind = 2; feedback = 0.5; streak++; game.audio.play('se_success', 1.0);
    } else if (diff < GOOD_WINDOW) {
      feedbackKind = 1; feedback = 0.4; streak++; game.audio.play('se_tap', 0.7);
    } else {
      feedbackKind = 0; feedback = 0.5; streak = 0; misses++;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); return; }
    }

    tapRings.push({ x: W / 2, y: H * 0.55, r: 0, life: 0.5, kind: feedbackKind });
    expectedBeat = now + BEAT;
    tapCount++;

    if (streak >= neededStreak && !done) {
      done = true;
      setTimeout(function() { game.end.success(streak * 80 + Math.ceil(timeLeft) * 25); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    metroTimer += dt;
    metroAngle += metroVel * metroDir * dt;
    if (Math.abs(metroAngle) >= MAX_ANG) {
      metroDir *= -1;
      metroAngle = MAX_ANG * metroDir;
      beatFlash = 0.15;
      if (guidePhase) {
        game.audio.play('se_tap', 0.3);
        guideBeat++;
        if (guideBeat >= GUIDE_BEATS * 2) {
          guidePhase = false;
          metroTimer = 0;
          firstTap = false;
        }
      }
    }
    if (beatFlash > 0) beatFlash -= dt;

    for (var ri = tapRings.length - 1; ri >= 0; ri--) {
      tapRings[ri].r += 300 * dt;
      tapRings[ri].life -= dt;
      if (tapRings[ri].life <= 0) tapRings.splice(ri, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Metronome body
    var mCX = W / 2;
    var mBaseY = H * 0.72;
    var mTopY = H * 0.22;

    // Body trapezoid
    game.draw.rect(mCX - 160, mBaseY - 40, 320, 40, C.metro, 0.9);
    game.draw.rect(mCX - 140, mTopY, 280, mBaseY - mTopY - 40, C.metro, 0.8);
    game.draw.rect(mCX - 140, mTopY, 280, 12, C.metroHi, 0.5);

    // Pendulum arm
    var armLen = mBaseY - mTopY - 60;
    var armX = mCX + Math.sin(metroAngle) * 200;
    var armY = mBaseY - 40;
    game.draw.line(mCX, armY, armX, mTopY + 30, C.arm, 10);
    game.draw.line(mCX, armY, armX, mTopY + 30, C.armHi, 4);
    // Bob on pendulum
    var bobX = mCX + Math.sin(metroAngle) * 150;
    var bobY = mBaseY - 200;
    game.draw.circle(bobX, bobY, 28, C.beatHi, 0.9);
    game.draw.circle(bobX, bobY, 16, '#fff', 0.6);

    // Beat flash at extremes
    if (beatFlash > 0) {
      game.draw.circle(mCX + Math.sign(metroAngle) * 200, mTopY + 40, 40, C.beatHi, beatFlash * 2);
    }

    // Tap rings
    for (var ri2 = 0; ri2 < tapRings.length; ri2++) {
      var ring = tapRings[ri2];
      var col = ring.kind === 2 ? C.perfect : (ring.kind === 1 ? C.good : C.wrong);
      game.draw.circle(ring.x, ring.y, ring.r, col, ring.life * 0.5);
    }

    // BPM display
    game.draw.text(BPM + ' BPM', mCX, mTopY - 50, { size: 48, color: C.metroHi, bold: true });

    // Guide phase overlay
    if (guidePhase) {
      game.draw.rect(0, H * 0.74, W, 160, C.bg, 0.7);
      game.draw.text('リズムを感じて...', W / 2, H * 0.78, { size: 48, color: C.beatHi });
      game.draw.text(Math.max(0, GUIDE_BEATS - Math.floor(guideBeat / 2)) + ' ...', W / 2, H * 0.84, { size: 56, color: C.beatHi, bold: true });
    } else {
      // Timing feedback
      if (feedback > 0) {
        var fbText = feedbackKind === 2 ? 'パーフェクト！' : (feedbackKind === 1 ? 'グッド' : 'ミス...');
        var fbCol = feedbackKind === 2 ? C.perfect : (feedbackKind === 1 ? C.good : C.wrong);
        game.draw.text(fbText, W / 2, H * 0.76, { size: 52, color: fbCol, bold: true });
      }
      game.draw.text('タップでビートを刻む！', W / 2, H * 0.83, { size: 40, color: C.ui });

      // Streak display
      var streakCol = streak >= neededStreak * 0.5 ? C.good : C.ui;
      game.draw.text('連続: ' + streak + ' / ' + neededStreak, W / 2, H * 0.89, { size: 44, color: streakCol, bold: streak > 0 });
    }

    // Misses
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 2) * 52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }
    game.draw.text('', W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beat : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
