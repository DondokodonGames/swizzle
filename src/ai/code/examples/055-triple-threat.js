// 055-triple-threat.js
// トリプルスレット — 3つの迫ってくる脅威を同時に管理する注意力分散ゲーム
// 操作: タップで最も危険な脅威をリセット（3つのゾーンのどこかをタップ）
// 成功: 30秒生き残る  失敗: いずれかの脅威がMAXに達する

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#05080f',
    safe:  '#22c55e',
    warn:  '#eab308',
    danger:'#ef4444',
    ui:    '#475569'
  };

  // Three threat bars, each filling from 0 to 1 at different rates
  var threats = [
    { level: 0, rate: 0.05, color: '#ef4444', label: '炎', icon: '🔥', x: W * 0.2 },
    { level: 0, rate: 0.038, color: '#3b82f6', label: '水', icon: '💧', x: W * 0.5 },
    { level: 0, rate: 0.045, color: '#eab308', label: '雷', icon: '⚡', x: W * 0.8 }
  ];

  var ZONE_W = W * 0.28;
  var BAR_W = 80;
  var BAR_H = H * 0.38;
  var BAR_Y = H * 0.28;

  var timeLeft = 30;
  var done = false;
  var flashIndex = -1;
  var flashTimer = 0;

  game.onTap(function(x, y) {
    if (done) return;
    // Find which zone was tapped
    for (var i = 0; i < threats.length; i++) {
      if (Math.abs(x - threats[i].x) < ZONE_W / 2) {
        var old = threats[i].level;
        threats[i].level = Math.max(0, threats[i].level - 0.55);
        flashIndex = i;
        flashTimer = 0.3;
        game.audio.play('se_tap', 0.6);
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + 50); }, 300);
        return;
      }
    }

    // Increase threats over time (gets faster as time runs out)
    var speedMult = 1 + (30 - timeLeft) * 0.04;
    for (var i = 0; i < threats.length; i++) {
      threats[i].level += threats[i].rate * speedMult * dt;
      if (threats[i].level >= 1.0 && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    if (flashTimer > 0) flashTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var j = 0; j < threats.length; j++) {
      var t = threats[j];
      var bx = t.x - BAR_W / 2;
      var level = t.level;
      var fillH = BAR_H * level;
      var fillY = BAR_Y + BAR_H - fillH;

      // Bar background
      game.draw.rect(bx - 8, BAR_Y - 8, BAR_W + 16, BAR_H + 16, '#0a0f1a');
      game.draw.rect(bx, BAR_Y, BAR_W, BAR_H, '#111827');

      // Color based on level
      var barColor = level < 0.5 ? C.safe : (level < 0.75 ? C.warn : C.danger);

      // Fill
      game.draw.rect(bx, fillY, BAR_W, fillH, t.color, level > 0.75 ? 1.0 : 0.8);
      if (fillH > 20) {
        game.draw.rect(bx + 8, fillY + 8, BAR_W - 16, 16, '#fff', 0.15);
      }

      // Danger pulse at top
      if (level > 0.75) {
        var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 12);
        game.draw.rect(bx, BAR_Y, BAR_W, BAR_H * 0.1, C.danger, pulse * 0.5);
      }

      // Flash on tap
      if (flashIndex === j && flashTimer > 0) {
        game.draw.rect(bx - 20, BAR_Y - 20, BAR_W + 40, BAR_H + 40, '#fff', flashTimer / 0.3 * 0.3);
      }

      // Label
      game.draw.text(t.label, t.x, BAR_Y + BAR_H + 60, { size: 52, color: t.color, bold: true });

      // Percentage
      game.draw.text(Math.floor(level * 100) + '%', t.x, BAR_Y + BAR_H + 140, {
        size: 44, color: level > 0.75 ? C.danger : '#64748b', bold: true
      });

      // Warning markers
      game.draw.line(bx - 20, BAR_Y + BAR_H * 0.25, bx, BAR_Y + BAR_H * 0.25, C.danger, 3);
      game.draw.line(bx - 20, BAR_Y + BAR_H * 0.5, bx, BAR_Y + BAR_H * 0.5, C.warn, 3);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#05080f');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('危ないゾーンをタップ！', W / 2, H - 200, { size: 52, color: C.ui });
    game.draw.text('全部MAX以下に保て', W / 2, H - 132, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    // Stagger initial levels
    threats[0].level = 0.1;
    threats[1].level = 0.25;
    threats[2].level = 0.15;
  });
})(game);
