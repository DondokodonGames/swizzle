// 064-lens-focus.js
// レンズフォーカス — 素早くピントを合わせて被写体をくっきり捉える撮影ゲーム
// 操作: スワイプ上下でフォーカス距離を調整、タップでシャッター
// 成功: 5枚ピントの合った写真を撮る  失敗: 5回ぼけたまま撮る or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#080a0c',
    lens:     '#1e3a5f',
    lensHi:   '#3b82f6',
    subject:  '#22c55e',
    blur:     '#0f1520',
    ui:       '#475569',
    perfect:  '#fbbf24',
    good:     '#22c55e',
    miss:     '#ef4444'
  };

  // Focus is 0.0 to 1.0; subject is at a random focus distance
  var focusPos = 0.5;       // player's current focus setting
  var subjectFocus = 0.5;   // where subject is in focus
  var FOCUS_RANGE = 0.12;   // ±this = in focus
  var PERFECT_RANGE = 0.05; // ±this = perfect

  var subjectMoving = false;
  var subjectVel = 0;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 20;
  var done = false;

  var feedback = 0;
  var feedbackText = '';
  var feedbackColor = '#fff';
  var shutterFlash = 0;

  function newSubject() {
    // Random focus distance for next subject
    subjectFocus = 0.15 + Math.random() * 0.7;
    subjectMoving = Math.random() < 0.35;
    subjectVel = (Math.random() - 0.5) * 0.3;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var amount = 0.12;
    if (dir === 'up') focusPos = Math.min(1, focusPos + amount);
    else if (dir === 'down') focusPos = Math.max(0, focusPos - amount);
  });

  game.onTap(function(x, y) {
    if (done) return;
    var diff = Math.abs(focusPos - subjectFocus);
    shutterFlash = 0.15;

    if (diff <= PERFECT_RANGE) {
      score++;
      feedbackText = '完璧！';
      feedbackColor = C.perfect;
      game.audio.play('se_tap', 1.0);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 30 + Math.ceil(timeLeft) * 8); }, 400);
        return;
      }
      newSubject();
    } else if (diff <= FOCUS_RANGE) {
      score++;
      feedbackText = 'グッド！';
      feedbackColor = C.good;
      game.audio.play('se_tap', 0.8);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 6); }, 400);
        return;
      }
      newSubject();
    } else {
      misses++;
      feedbackText = 'ぼけた！';
      feedbackColor = C.miss;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }
    feedback = 0.5;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (subjectMoving) {
      subjectFocus += subjectVel * dt;
      if (subjectFocus > 0.85 || subjectFocus < 0.15) subjectVel = -subjectVel;
    }

    if (feedback > 0) feedback -= dt;
    if (shutterFlash > 0) shutterFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Viewfinder
    var VX = 80, VY = H * 0.18, VW = W - 160, VH = H * 0.52;

    // Blur overlay based on focus distance
    var diff = Math.abs(focusPos - subjectFocus);
    var blurAmt = Math.min(1, diff / 0.3);

    // Background (blurred)
    game.draw.rect(VX, VY, VW, VH, '#0a1428');

    // Subject (sharp or blurry based on focus)
    var subjectY = VY + VH * 0.5;
    var subjectX = VX + VW * 0.5;
    var sharp = 1 - blurAmt;

    // Blurry version (always)
    var blurR = 60 + blurAmt * 120;
    game.draw.circle(subjectX, subjectY, blurR, C.subject, blurAmt * 0.3);

    // Sharp details
    game.draw.circle(subjectX, subjectY, 60, C.subject, sharp);
    game.draw.circle(subjectX - 16, subjectY - 16, 20, '#fff', sharp * 0.5);
    if (sharp > 0.5) {
      game.draw.line(subjectX - 40, subjectY, subjectX + 40, subjectY, '#86efac', 2 * sharp);
      game.draw.line(subjectX, subjectY - 40, subjectX, subjectY + 40, '#86efac', 2 * sharp);
    }

    // Viewfinder corners
    var cc = diff < FOCUS_RANGE ? (diff < PERFECT_RANGE ? C.perfect : C.good) : '#475569';
    var cLen = 40;
    game.draw.rect(VX, VY, cLen, 6, cc);
    game.draw.rect(VX, VY, 6, cLen, cc);
    game.draw.rect(VX + VW - cLen, VY, cLen, 6, cc);
    game.draw.rect(VX + VW - 6, VY, 6, cLen, cc);
    game.draw.rect(VX, VY + VH - 6, cLen, 6, cc);
    game.draw.rect(VX, VY + VH - cLen, 6, cLen, cc);
    game.draw.rect(VX + VW - cLen, VY + VH - 6, cLen, 6, cc);
    game.draw.rect(VX + VW - 6, VY + VH - cLen, 6, cLen, cc);

    // Center cross
    game.draw.line(subjectX - 30, subjectY, subjectX + 30, subjectY, cc, 2);
    game.draw.line(subjectX, subjectY - 30, subjectX, subjectY + 30, cc, 2);

    // Shutter flash
    if (shutterFlash > 0) {
      game.draw.rect(VX, VY, VW, VH, '#fff', shutterFlash / 0.15 * 0.8);
    }

    // Focus slider (right side)
    var SX = VX + VW + 32;
    var SY = VY;
    var SH = VH;
    var SW = 40;

    game.draw.rect(SX, SY, SW, SH, '#0a1428');
    // Subject position indicator
    game.draw.rect(SX - 16, SY + SH * (1 - subjectFocus) - 4, SW + 16, 8, C.subject, 0.6);
    // Player focus indicator
    game.draw.rect(SX - 8, SY + SH * (1 - focusPos) - 6, SW + 8, 12, C.lensHi);
    // In-focus zone
    var zoneTop = SY + SH * (1 - (subjectFocus + FOCUS_RANGE));
    var zoneH = SH * FOCUS_RANGE * 2;
    game.draw.rect(SX, zoneTop, SW, zoneH, C.good, 0.2);
    var perfTop = SY + SH * (1 - (subjectFocus + PERFECT_RANGE));
    var perfH = SH * PERFECT_RANGE * 2;
    game.draw.rect(SX, perfTop, SW, perfH, C.perfect, 0.3);

    // Labels
    game.draw.text('NEAR', SX + SW / 2, SY - 40, { size: 28, color: '#334155' });
    game.draw.text('FAR', SX + SW / 2, SY + SH + 36, { size: 28, color: '#334155' });

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackText, W / 2, VY + VH + 80, { size: 80, color: feedbackColor, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#080a0c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lensHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: C.perfect, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - 2) * 56;
      game.draw.circle(mx, 212, 18, m < misses ? C.miss : '#1a1428');
    }

    // Guide
    game.draw.text('上下スワイプでピント調整→タップ！', W / 2, H - 200, { size: 40, color: C.ui });
    if (subjectMoving) {
      game.draw.text('被写体が動いている！', W / 2, H - 140, { size: 40, color: '#d97706' });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newSubject();
  });
})(game);
