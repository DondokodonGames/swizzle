// 023-freeze-frame.js
// フリーズフレーム — 激しく動く的を「今だ！」の瞬間に止める写真家の目
// 操作: タップでシャッターを切る（的が中央の枠に入った瞬間）
// 成功: 4枚完璧に撮影  失敗: 3枚ブレる or 18秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0a14',
    frame:   '#1e293b',
    frameHi: '#38bdf8',
    subject: '#f97316',
    subjectT:'#fed7aa',
    flash:   '#ffffff',
    good:    '#22c55e',
    blurred: '#ef4444',
    ui:      '#475569'
  };

  // Subject bounces around with erratic motion
  var sx = W / 2, sy = H / 2;
  var svx = 580, svy = 420;  // velocity
  var subR = 80;

  // Target zone (viewfinder frame)
  var FRAME_W = 340;
  var FRAME_H = 340;
  var FRAME_X = (W - FRAME_W) / 2;
  var FRAME_Y = (H - FRAME_H) / 2;

  var score = 0;
  var needed = 4;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 18;
  var done = false;

  var flashTimer = 0;
  var feedbackOk = false;
  var cooldown = 0;

  function inFrame() {
    return sx > FRAME_X + subR && sx < FRAME_X + FRAME_W - subR &&
           sy > FRAME_Y + subR && sy < FRAME_Y + FRAME_H - subR;
  }

  game.onTap(function(x, y) {
    if (done || cooldown > 0) return;

    cooldown = 0.5;
    flashTimer = 0.3;

    if (inFrame()) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 25 + Math.ceil(timeLeft) * 6);
        }, 400);
      }
      // Subject changes direction for excitement
      svx *= -1.1;
      svy *= -0.9;
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
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

    // Move subject with acceleration variation
    var speed = 1.0 + (18 - timeLeft) * 0.04;
    sx += svx * speed * dt;
    sy += svy * speed * dt;

    // Bounce off walls (keep in play area)
    if (sx < subR + 40)  { sx = subR + 40;  svx = Math.abs(svx); }
    if (sx > W - subR - 40) { sx = W - subR - 40; svx = -Math.abs(svx); }
    if (sy < subR + 80)  { sy = subR + 80;  svy = Math.abs(svy); }
    if (sy > H - subR - 80) { sy = H - subR - 80; svy = -Math.abs(svy); }

    // Occasional random kick
    if (Math.random() < dt * 0.4) {
      svx += (Math.random() - 0.5) * 300;
      svy += (Math.random() - 0.5) * 300;
      var spd = Math.sqrt(svx*svx + svy*svy);
      if (spd > 900) { svx = svx/spd*900; svy = svy/spd*900; }
      if (spd < 300) { svx = svx/spd*400; svy = svy/spd*400; }
    }

    if (flashTimer > 0) flashTimer -= dt;
    if (cooldown > 0) cooldown -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Motion blur trail
    for (var t = 1; t <= 5; t++) {
      var trailX = sx - svx * dt * t * 0.4;
      var trailY = sy - svy * dt * t * 0.4;
      game.draw.circle(trailX, trailY, subR * (1 - t * 0.15), C.subject, 0.08);
    }

    // Subject
    var subColor = inFrame() ? C.good : C.subject;
    game.draw.circle(sx, sy, subR + 10, subColor, 0.2);
    game.draw.circle(sx, sy, subR, subColor);
    game.draw.circle(sx, sy, subR * 0.55, C.subjectT, 0.8);
    game.draw.circle(sx, sy, subR * 0.25, '#fff', 0.9);

    // Viewfinder frame
    var frameAlpha = inFrame() ? 0.9 : 0.5;
    var frameColor = inFrame() ? C.frameHi : '#475569';
    // frame corners
    var fc = 80; // corner length
    game.draw.rect(FRAME_X, FRAME_Y, fc, 8, frameColor, frameAlpha);              // TL horiz
    game.draw.rect(FRAME_X, FRAME_Y, 8, fc, frameColor, frameAlpha);              // TL vert
    game.draw.rect(FRAME_X + FRAME_W - fc, FRAME_Y, fc, 8, frameColor, frameAlpha); // TR horiz
    game.draw.rect(FRAME_X + FRAME_W - 8, FRAME_Y, 8, fc, frameColor, frameAlpha);  // TR vert
    game.draw.rect(FRAME_X, FRAME_Y + FRAME_H - 8, fc, 8, frameColor, frameAlpha); // BL horiz
    game.draw.rect(FRAME_X, FRAME_Y + FRAME_H - fc, 8, fc, frameColor, frameAlpha); // BL vert
    game.draw.rect(FRAME_X + FRAME_W - fc, FRAME_Y + FRAME_H - 8, fc, 8, frameColor, frameAlpha); // BR h
    game.draw.rect(FRAME_X + FRAME_W - 8, FRAME_Y + FRAME_H - fc, 8, fc, frameColor, frameAlpha); // BR v
    // crosshair
    game.draw.rect(W / 2 - 30, H / 2 - 2, 60, 4, frameColor, frameAlpha * 0.5);
    game.draw.rect(W / 2 - 2, H / 2 - 30, 4, 60, frameColor, frameAlpha * 0.5);

    // Flash effect
    if (flashTimer > 0) {
      var fa = flashTimer / 0.3;
      game.draw.rect(0, 0, W, H, C.flash, fa * 0.85);
      var resultText = feedbackOk ? 'SNAP!!' : 'BLURRED';
      var resultColor = feedbackOk ? C.good : C.blurred;
      if (fa > 0.3) {
        game.draw.text(resultText, W / 2, H / 2, { size: 120, color: resultColor, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 18);
    game.draw.rect(0, 0, W, 72, '#0a0a18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#0891b2' : C.blurred);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.frameHi, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.blurred : '#1e293b');
    }

    // "IN FRAME" label
    if (inFrame() && cooldown <= 0) {
      var pulse = 0.7 + 0.3 * Math.sin(game.time.elapsed * 12);
      game.draw.text('IN FRAME', W / 2, FRAME_Y - 60, { size: 52, color: C.frameHi, bold: true });
    }

    // Guide
    game.draw.text('枠に入ったらタップ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);
