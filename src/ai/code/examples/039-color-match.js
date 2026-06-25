// 039-color-match.js
// カラーマッチ — 混色で目標カラーを作る色彩感覚ゲーム
// 操作: 上下スワイプで赤/青/緑の配合を変える、タップで決定
// 成功: 目標色との差異20%以内で3回マッチ  失敗: 3回外す or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a0a',
    panel:  '#111111',
    good:   '#22c55e',
    miss:   '#ef4444',
    ui:     '#475569'
  };

  var channels = ['R', 'G', 'B'];
  var values = [128, 128, 128]; // 0..255 each
  var target = [0, 0, 0];
  var selectedChannel = 0; // which channel is being adjusted (swipe L/R to switch)
  var STEP = 16;

  var score = 0;
  var needed = 3;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 25;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function rgb(r, g, b) {
    var rh = ('0' + Math.min(255, Math.max(0, Math.round(r))).toString(16)).slice(-2);
    var gh = ('0' + Math.min(255, Math.max(0, Math.round(g))).toString(16)).slice(-2);
    var bh = ('0' + Math.min(255, Math.max(0, Math.round(b))).toString(16)).slice(-2);
    return '#' + rh + gh + bh;
  }

  function colorDiff(a, b) {
    var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr*dr + dg*dg + db*db) / Math.sqrt(3 * 255 * 255);
  }

  function newTarget() {
    target = [
      Math.floor(Math.random() * 8) * 32,
      Math.floor(Math.random() * 8) * 32,
      Math.floor(Math.random() * 8) * 32
    ];
    // Ensure it's not too dark (interesting colors)
    if (target[0] + target[1] + target[2] < 96) target[0] = 128;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') {
      values[selectedChannel] = Math.min(255, values[selectedChannel] + STEP);
    } else if (dir === 'down') {
      values[selectedChannel] = Math.max(0, values[selectedChannel] - STEP);
    } else if (dir === 'right') {
      selectedChannel = (selectedChannel + 1) % 3;
      game.audio.play('se_tap', 0.4);
    } else if (dir === 'left') {
      selectedChannel = (selectedChannel + 2) % 3;
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onTap(function(x, y) {
    if (done || feedback > 0) return;

    var diff = colorDiff(values, target);
    feedback = 0.6;

    if (diff <= 0.18) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 30 + Math.ceil(timeLeft) * 5);
        }, 700);
        return;
      }
      setTimeout(function() { newTarget(); }, 650);
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 700);
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
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0a0a0a');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score pips
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed-1)/2) * 80;
      game.draw.circle(sx, 128, 26, s < score ? C.good : '#1a1a1a');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses-1)/2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.miss : '#1a1a1a');
    }

    // Target color swatch
    var targetColor = rgb(target[0], target[1], target[2]);
    game.draw.rect(W * 0.08, H * 0.26, W * 0.38, W * 0.38, '#1a1a1a');
    game.draw.rect(W * 0.1, H * 0.28, W * 0.34, W * 0.34, targetColor);
    game.draw.text('目標', W * 0.27, H * 0.26 - 30, { size: 40, color: '#9ca3af' });

    // Current color swatch
    var currColor = rgb(values[0], values[1], values[2]);
    game.draw.rect(W * 0.54, H * 0.26, W * 0.38, W * 0.38, '#1a1a1a');
    game.draw.rect(W * 0.56, H * 0.28, W * 0.34, W * 0.34, currColor);
    game.draw.text('現在', W * 0.73, H * 0.26 - 30, { size: 40, color: '#9ca3af' });

    // Difference display
    var diff2 = colorDiff(values, target);
    var diffPct = Math.floor(diff2 * 100);
    var diffColor = diff2 <= 0.18 ? C.good : (diff2 <= 0.35 ? '#f59e0b' : C.miss);
    game.draw.text('差異: ' + diffPct + '%', W / 2, H * 0.56, { size: 56, color: diffColor, bold: true });

    // RGB sliders
    var SLIDER_Y = H * 0.63;
    var SLIDER_H = H * 0.19;
    var channelColors = ['#ef4444', '#22c55e', '#3b82f6'];
    var labels = ['R  赤', 'G  緑', 'B  青'];

    for (var ch = 0; ch < 3; ch++) {
      var cx3 = W * (0.15 + ch * 0.28);
      var isSelected = ch === selectedChannel;

      // Slider track
      game.draw.rect(cx3 - 6, SLIDER_Y, 12 + (isSelected ? 8 : 0), SLIDER_H, isSelected ? channelColors[ch] : '#1a1a1a', isSelected ? 0.3 : 1);
      game.draw.rect(cx3 - 2, SLIDER_Y, 4, SLIDER_H, '#2a2a2a');
      // Slider thumb
      var thumbY = SLIDER_Y + SLIDER_H * (1 - values[ch] / 255);
      game.draw.circle(cx3, thumbY, isSelected ? 28 : 20, channelColors[ch]);
      if (isSelected) {
        game.draw.circle(cx3, thumbY, 16, '#fff', 0.6);
        // Selection arrows
        game.draw.text('↑', cx3, SLIDER_Y - 40, { size: 44, color: channelColors[ch], bold: true });
        game.draw.text('↓', cx3, SLIDER_Y + SLIDER_H + 50, { size: 44, color: channelColors[ch], bold: true });
      }
      // Label
      game.draw.text(labels[ch], cx3, SLIDER_Y + SLIDER_H + 100, { size: 36, color: isSelected ? channelColors[ch] : '#475569' });
      // Value
      game.draw.text(values[ch].toString(), cx3, thumbY + (values[ch] < 128 ? -50 : 50), { size: 36, color: '#fff', bold: true });
    }

    // Feedback overlay
    if (feedback > 0) {
      var prog = 1 - feedback / 0.6;
      if (feedbackOk) {
        game.draw.text('マッチ！', W / 2, H * 0.44 - prog * 60, { size: 88, color: C.good, bold: true });
        game.draw.rect(0, 0, W, H, C.good, feedback / 0.6 * 0.12);
      } else {
        var missed = Math.floor(diff2 * 100);
        game.draw.text('差異 ' + missed + '%', W / 2, H * 0.44, { size: 80, color: C.miss, bold: true });
        game.draw.rect(0, 0, W, H, C.miss, feedback / 0.6 * 0.1);
      }
    }

    // Guide
    game.draw.text('スワイプ↑↓で調整 / L・Rで切替', W / 2, H - 220, { size: 40, color: C.ui });
    game.draw.text('タップで決定！', W / 2, H - 155, { size: 48, color: '#6b7280', bold: false });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newTarget();
  });
})(game);
