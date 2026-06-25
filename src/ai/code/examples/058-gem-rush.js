// 058-gem-rush.js
// ジェムラッシュ — 特定の色の宝石だけを素早くタップして集める採掘レース
// 操作: タップで宝石を収集（ターゲット色のみ）、違う色は-1点
// 成功: 15個収集  失敗: -5点 or 15秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#0a0610',
    ui:    '#475569'
  };

  var GEM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  var GEM_NAMES  = ['赤', 'オレン', '黄', '緑', '青', '紫', 'ピンク'];
  var GEM_R = 52;
  var MAX_GEMS = 12;

  var targetColor = 0; // index into GEM_COLORS
  var gems = [];
  var score = 0;
  var needed = 15;
  var penalties = 0;
  var maxPenalties = 5;
  var timeLeft = 15;
  var done = false;

  var feedback = [];

  function spawnGem() {
    var margin = GEM_R + 40;
    var x = margin + Math.random() * (W - margin * 2);
    var y = 280 + Math.random() * (H * 0.62);
    var colorIdx = Math.floor(Math.random() * GEM_COLORS.length);
    var lifespan = 1.8 + Math.random() * 1.4;
    gems.push({
      x: x, y: y,
      colorIdx: colorIdx,
      life: lifespan,
      maxLife: lifespan,
      scale: 0
    });
  }

  // Rotate target color every 4 seconds
  var colorTimer = 4;

  game.onTap(function(x, y) {
    if (done) return;
    for (var i = gems.length - 1; i >= 0; i--) {
      var g = gems[i];
      var dx = x - g.x, dy = y - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < GEM_R + 16) {
        if (g.colorIdx === targetColor) {
          score++;
          feedback.push({ x: g.x, y: g.y, text: '+1', color: '#22c55e', life: 0.6 });
          game.audio.play('se_tap', 0.7);
          gems.splice(i, 1);
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 15 + Math.ceil(timeLeft) * 8); }, 400);
          }
        } else {
          penalties++;
          feedback.push({ x: g.x, y: g.y, text: '-1', color: '#ef4444', life: 0.6 });
          game.audio.play('se_failure', 0.4);
          gems.splice(i, 1);
          if (penalties >= maxPenalties && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        break;
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

    // Cycle target color
    colorTimer -= dt;
    if (colorTimer <= 0) {
      targetColor = (targetColor + 1) % GEM_COLORS.length;
      colorTimer = 4;
      game.audio.play('se_tap', 0.3);
    }

    // Manage gems
    if (gems.length < MAX_GEMS) {
      spawnGem();
    }
    for (var i = gems.length - 1; i >= 0; i--) {
      gems[i].life -= dt;
      if (gems[i].scale < 1) gems[i].scale = Math.min(1, gems[i].scale + dt * 5);
      if (gems[i].life <= 0) gems.splice(i, 1);
    }

    // Feedback floaters
    for (var f = feedback.length - 1; f >= 0; f--) {
      feedback[f].life -= dt;
      feedback[f].y -= 80 * dt;
      if (feedback[f].life <= 0) feedback.splice(f, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Gems
    for (var j = 0; j < gems.length; j++) {
      var g = gems[j];
      var col = GEM_COLORS[g.colorIdx];
      var isTarget = g.colorIdx === targetColor;
      var alpha = g.life / g.maxLife;
      var s = g.scale;
      var r = GEM_R * s;

      if (isTarget) {
        // Pulsing glow for target gems
        var gPulse = 0.2 + 0.2 * Math.sin(game.time.elapsed * 8);
        game.draw.circle(g.x, g.y, r + 20, col, gPulse * alpha);
      }

      game.draw.circle(g.x, g.y, r, col, alpha);

      // Diamond facets
      if (r > 20) {
        game.draw.circle(g.x - r * 0.3, g.y - r * 0.3, r * 0.25, '#fff', alpha * 0.4);
        game.draw.line(g.x - r * 0.5, g.y, g.x + r * 0.5, g.y, '#fff', 2);
        game.draw.line(g.x, g.y - r * 0.5, g.x, g.y + r * 0.5, '#fff', 2);
      }

      // Fade warning
      if (alpha < 0.3) {
        game.draw.circle(g.x, g.y, r + 8, '#ef4444', 0.3 * (1 - alpha / 0.3));
      }
    }

    // Feedback floaters
    for (var fp = 0; fp < feedback.length; fp++) {
      var fb = feedback[fp];
      game.draw.text(fb.text, fb.x, fb.y, { size: 56, color: fb.color, bold: true });
    }

    // Target color display (big prominent indicator)
    var targetPulse = 0.6 + 0.4 * Math.sin(game.time.elapsed * 4);
    game.draw.rect(0, 168, W, 192, GEM_COLORS[targetColor], 0.08);
    game.draw.circle(W / 2, 256, 64, GEM_COLORS[targetColor], targetPulse);
    game.draw.circle(W / 2 - 18, 244, 22, '#fff', 0.4);
    game.draw.text(GEM_NAMES[targetColor] + ' を集めろ！', W / 2, 360, { size: 52, color: GEM_COLORS[targetColor], bold: true });

    // Color timer bar (how long until color changes)
    var ctRatio = Math.max(0, colorTimer / 4);
    game.draw.rect(0, 388, W, 16, '#0a0610');
    game.draw.rect(0, 388, W * ctRatio, 16, GEM_COLORS[targetColor], 0.7);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#0a0610');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6d28d9' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: '#a78bfa', bold: true });

    // Penalty pips
    for (var p = 0; p < maxPenalties; p++) {
      var px = W / 2 + (p - 2) * 56;
      game.draw.circle(px, 136, 16, p < penalties ? '#ef4444' : '#1a0f28');
    }

    // Guide
    game.draw.text('正しい色だけタップ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    targetColor = Math.floor(Math.random() * GEM_COLORS.length);
    for (var i = 0; i < 6; i++) spawnGem();
  });
})(game);
