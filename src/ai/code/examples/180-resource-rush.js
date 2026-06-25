// 180-resource-rush.js
// 資源管理 — 3つのゲージが別々の速度で減っていく、底をつく前にタップして補充
// 操作: タップで対応するゲージを補充
// 成功: 35秒全ゲージを維持  失敗: どれかが0になる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#06040c',
    res:   ['#3b82f6', '#22c55e', '#ef4444'],
    resHi: ['#93c5fd', '#86efac', '#fca5a5'],
    panel: '#0f1020',
    warn:  '#f59e0b',
    dead:  '#7f1d1d',
    ui:    '#334155'
  };

  var LABEL = ['水', '食', '電'];
  var DRAIN_RATE = [0.018, 0.025, 0.014]; // per second
  var levels = [0.8, 0.8, 0.8];
  var FILL_AMOUNT = 0.4;

  var GAUGE_W = 200;
  var GAUGE_H = 600;
  var GAUGE_X = [W * 0.2, W * 0.5, W * 0.8];
  var GAUGE_Y = H * 0.2;

  var survived = 0;
  var NEEDED = 35;
  var timeLeft = NEEDED;
  var done = false;
  var flashTimers = [0, 0, 0];

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var i = 0; i < 3; i++) {
      var gx = GAUGE_X[i] - GAUGE_W / 2;
      if (tx > gx && tx < gx + GAUGE_W && ty > GAUGE_Y && ty < GAUGE_Y + GAUGE_H + 80) {
        levels[i] = Math.min(1, levels[i] + FILL_AMOUNT);
        flashTimers[i] = 0.3;
        game.audio.play('se_tap', 0.4);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 70 + 500); }, 400);
        return;
      }
    }

    // Progress adjusts drain rates over time
    var progress = survived / NEEDED;
    for (var i = 0; i < 3; i++) {
      levels[i] = Math.max(0, levels[i] - DRAIN_RATE[i] * (1 + progress * 0.8) * dt);
      if (flashTimers[i] > 0) flashTimers[i] -= dt;

      // Check failure
      if (levels[i] <= 0 && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Gauges
    for (var gi = 0; gi < 3; gi++) {
      var gx = GAUGE_X[gi] - GAUGE_W / 2;
      var level = levels[gi];
      var isLow = level < 0.25;
      var isCritical = level < 0.1;
      var col = C.res[gi];
      var hiCol = C.resHi[gi];

      // Panel background
      game.draw.rect(gx - 12, GAUGE_Y - 12, GAUGE_W + 24, GAUGE_H + 110, C.panel, 0.9);

      // Gauge track
      game.draw.rect(gx, GAUGE_Y, GAUGE_W, GAUGE_H, '#0a0a14', 0.9);

      // Level fill
      var fillH = GAUGE_H * level;
      var fillY = GAUGE_Y + (GAUGE_H - fillH);
      if (flashTimers[gi] > 0) {
        game.draw.rect(gx, fillY, GAUGE_W, fillH, hiCol, 0.9);
      } else {
        game.draw.rect(gx, fillY, GAUGE_W, fillH, col, isLow ? 0.6 + Math.abs(Math.sin(survived * 6)) * 0.35 : 0.85);
      }

      // Top shine
      if (fillH > 12) {
        game.draw.rect(gx, fillY, GAUGE_W, 12, hiCol, 0.4);
      }

      // Border
      game.draw.rect(gx, GAUGE_Y, GAUGE_W, 8, hiCol, 0.5);
      game.draw.rect(gx, GAUGE_Y + GAUGE_H - 8, GAUGE_W, 8, col, 0.3);

      // Warning
      if (isCritical) {
        game.draw.rect(gx - 12, GAUGE_Y - 12, GAUGE_W + 24, GAUGE_H + 110, C.dead, 0.15 + Math.abs(Math.sin(survived * 8)) * 0.2);
        game.draw.text('!', GAUGE_X[gi], GAUGE_Y - 50, { size: 60, color: C.warn, bold: true });
      } else if (isLow) {
        game.draw.rect(gx - 8, GAUGE_Y - 8, GAUGE_W + 16, GAUGE_H + 100, C.warn, 0.08);
      }

      // Label
      game.draw.text(LABEL[gi], GAUGE_X[gi], GAUGE_Y + GAUGE_H + 50, { size: 64, color: hiCol, bold: true });

      // Percent
      game.draw.text(Math.round(level * 100) + '%', GAUGE_X[gi], GAUGE_Y + GAUGE_H + 95, { size: 36, color: isLow ? C.warn : '#64748b' });
    }

    // Tap zone labels
    for (var li = 0; li < 3; li++) {
      var lx = GAUGE_X[li] - GAUGE_W / 2;
      game.draw.rect(lx, GAUGE_Y + GAUGE_H + 110, GAUGE_W, 70, C.res[li], 0.7);
      game.draw.text('補充', GAUGE_X[li], GAUGE_Y + GAUGE_H + 148, { size: 40, color: '#fff', bold: true });
    }

    game.draw.text('ゼロになったら終了！', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.res[1] : C.res[2]);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
