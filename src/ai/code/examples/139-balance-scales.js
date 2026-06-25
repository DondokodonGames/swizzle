// 139-balance-scales.js
// 天秤 — 積み重なるおもりを見て重い方を素早く選ぶ直感的な重さ判定ゲーム
// 操作: タップ左/右で重い方を選択
// 成功: 12問正解  失敗: 4回ミス or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040a',
    beam:    '#6b4c1a',
    beamHi:  '#d97706',
    pan:     '#4a3010',
    panHi:   '#92600e',
    weight:  '#475569',
    weightHi:'#94a3b8',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Balance variables
  var BEAM_X = W / 2;
  var BEAM_Y = H * 0.4;
  var BEAM_L = W * 0.38; // half-length
  var PAN_W = 180;
  var PAN_H = 16;
  var ROPE_L = 120;

  var leftWeight = 0, rightWeight = 0;
  var tilt = 0; // positive = right heavy (tilts right), negative = left heavy
  var TILT_SPEED = 2.0;
  var MAX_TILT = 0.35; // radians

  var score = 0;
  var needed = 12;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var revealTimer = 0;
  var REVEAL_TIME = 0.8; // time to show answer before next round

  function genRound() {
    leftWeight = Math.floor(Math.random() * 8) + 1;
    rightWeight = Math.floor(Math.random() * 8) + 1;
    // Make sure they're different
    while (rightWeight === leftWeight) rightWeight = Math.floor(Math.random() * 8) + 1;
    revealTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || feedback > 0) return;
    // Left side = left pan, right side = right pan
    var pickedLeft = tx < W / 2;
    var actualHeavier = leftWeight > rightWeight ? 'left' : 'right';
    var correct = (pickedLeft && actualHeavier === 'left') || (!pickedLeft && actualHeavier === 'right');

    if (correct) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      game.audio.play('se_success');
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score*40 + Math.ceil(timeLeft)*12); }, 500);
        return;
      }
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.5;
      game.audio.play('se_failure');
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    revealTimer = REVEAL_TIME;
    setTimeout(function() { genRound(); }, REVEAL_TIME * 1000);
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

    // Animate tilt toward weight difference
    var targetTilt = (rightWeight - leftWeight) / 8 * MAX_TILT;
    tilt += (targetTilt - tilt) * dt * TILT_SPEED;

    if (feedback > 0) feedback -= dt;
    if (revealTimer > 0) revealTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Pivot post
    game.draw.rect(BEAM_X - 8, BEAM_Y - 20, 16, H*0.35, C.beam);
    game.draw.circle(BEAM_X, BEAM_Y - 20, 20, C.beamHi, 0.6);
    game.draw.circle(BEAM_X, BEAM_Y - 20, 10, C.beamHi);

    // Beam
    var bl = BEAM_L * Math.cos(tilt);
    var bh = BEAM_L * Math.sin(tilt);
    var leftBeamX = BEAM_X - bl, leftBeamY = BEAM_Y - bh;
    var rightBeamX = BEAM_X + bl, rightBeamY = BEAM_Y + bh;
    game.draw.line(leftBeamX, leftBeamY, rightBeamX, rightBeamY, C.beam, 16);
    game.draw.line(leftBeamX, leftBeamY, rightBeamX, rightBeamY, C.beamHi, 4);

    // Left pan
    var leftPanX = leftBeamX, leftPanY = leftBeamY + ROPE_L;
    game.draw.line(leftBeamX, leftBeamY, leftPanX - PAN_W/2 + 16, leftPanY, C.beam, 4);
    game.draw.line(leftBeamX, leftBeamY, leftPanX + PAN_W/2 - 16, leftPanY, C.beam, 4);
    game.draw.rect(leftPanX - PAN_W/2, leftPanY, PAN_W, PAN_H, C.pan);
    game.draw.rect(leftPanX - PAN_W/2, leftPanY, PAN_W, 6, C.panHi);

    // Right pan
    var rightPanX = rightBeamX, rightPanY = rightBeamY + ROPE_L;
    game.draw.line(rightBeamX, rightBeamY, rightPanX - PAN_W/2 + 16, rightPanY, C.beam, 4);
    game.draw.line(rightBeamX, rightBeamY, rightPanX + PAN_W/2 - 16, rightPanY, C.beam, 4);
    game.draw.rect(rightPanX - PAN_W/2, rightPanY, PAN_W, PAN_H, C.pan);
    game.draw.rect(rightPanX - PAN_W/2, rightPanY, PAN_W, 6, C.panHi);

    // Weights on pans
    var wSize = 32;
    for (var li = 0; li < leftWeight; li++) {
      var row = Math.floor(li / 3), col = li % 3;
      var wx = leftPanX - 32 + col * 40;
      var wy = leftPanY - wSize - row * (wSize + 4);
      game.draw.rect(wx - wSize/2, wy, wSize, wSize, C.weight);
      game.draw.rect(wx - wSize/2, wy, wSize, 6, C.weightHi);
    }
    for (var ri = 0; ri < rightWeight; ri++) {
      var row2 = Math.floor(ri / 3), col2 = ri % 3;
      var wx2 = rightPanX - 32 + col2 * 40;
      var wy2 = rightPanY - wSize - row2 * (wSize + 4);
      game.draw.rect(wx2 - wSize/2, wy2, wSize, wSize, C.weight);
      game.draw.rect(wx2 - wSize/2, wy2, wSize, 6, C.weightHi);
    }

    // Weight number labels
    game.draw.text(leftWeight + '', leftPanX, leftPanY + PAN_H + 48, { size: 72, color: '#f1f5f9', bold: true });
    game.draw.text(rightWeight + '', rightPanX, rightPanY + PAN_H + 48, { size: 72, color: '#f1f5f9', bold: true });

    // Arrows showing which to tap
    game.draw.text('← 左が重い？', W*0.25, H*0.87, { size: 36, color: C.ui });
    game.draw.text('右が重い？ →', W*0.75, H*0.87, { size: 36, color: C.ui });

    // Feedback
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.18);
      game.draw.text(feedbackOk ? '正解！' : '不正解…', W/2, H*0.2, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score + misses
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-(maxMisses-1)/2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.beamHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    genRound();
  });
})(game);
