// 021-coin-spin.js
// コインスピン — 倒れそうなコインが止まる瞬間を見極める賭け
// 操作: コインが表を向いた瞬間にタップ
// 成功: 5回表で止める  失敗: 裏で止める3回 or 15秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0a08',
    gold:    '#d97706',
    goldHi:  '#fbbf24',
    goldEdge:'#92400e',
    silver:  '#334155',
    silverHi:'#64748b',
    good:    '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var spinAngle = 0;   // 0 = heads, Math.PI = tails
  var spinSpeed = 4.5; // radians/sec — speed of "wobble" oscillation
  var done = false;
  var timeLeft = 15;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;

  var feedback = 0;
  var feedbackOk = false;
  var paused = false;
  var pauseTimer = 0;
  var phase = 'oscil'; // 'oscil' | 'stop'

  // "wobble" oscillation: angle = sin(t * spinSpeed) * Math.PI/2
  // heads visible when cos(angle) > 0

  function isHeads() {
    return Math.cos(spinAngle) > 0;
  }

  game.onTap(function(x, y) {
    if (done || paused) return;

    feedback = 0.4;
    paused = true;
    pauseTimer = 0.42;

    if (isHeads()) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 0.9);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.ceil(timeLeft) * 5);
        }, 500);
      }
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    if (paused) {
      pauseTimer -= dt;
      if (pauseTimer <= 0) paused = false;
    } else {
      // Speed increases with score
      var speed = spinSpeed + score * 0.6;
      spinAngle += speed * dt;
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // table surface
    game.draw.rect(0, H * 0.7, W, H * 0.3, '#0e0c0a');
    game.draw.rect(0, H * 0.7, W, 6, '#1c1814');

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#110e08');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gold : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 130, { size: 56, color: C.goldHi, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.wrong : '#1a1614');
    }

    // Coin center
    var cx = W / 2;
    var cy = H * 0.45;

    // Calculate apparent width based on spin angle (perspective squish)
    var cosA = Math.cos(spinAngle);
    var apparentW = Math.abs(cosA);  // 0 to 1, width multiplier
    var heads = cosA > 0;

    var R = 280;
    var sqW = Math.floor(R * apparentW);

    // Coin shadow
    game.draw.rect(cx - sqW + 10, cy + R - 30, sqW * 2, 40, '#000', 0.5);

    if (sqW > 4) {
      if (heads) {
        // Heads side (gold)
        game.draw.rect(cx - sqW, cy - R, sqW * 2, R * 2, C.gold);
        game.draw.rect(cx - sqW, cy - R, sqW * 2, 20, C.goldHi, 0.5);
        // ¥ symbol (heads)
        if (sqW > 100) {
          game.draw.circle(cx, cy, sqW * 0.7, C.goldEdge, 0.3);
          game.draw.text('¥', cx, cy, { size: Math.floor(sqW * 1.4), color: C.goldHi, bold: true });
        }
        // edge glint
        game.draw.rect(cx + sqW - 16, cy - R + 20, 12, R * 2 - 40, C.goldHi, 0.4);
      } else {
        // Tails side (silver)
        game.draw.rect(cx - sqW, cy - R, sqW * 2, R * 2, C.silver);
        game.draw.rect(cx - sqW, cy - R, sqW * 2, 20, C.silverHi, 0.4);
        if (sqW > 100) {
          game.draw.circle(cx, cy, sqW * 0.7, '#1e2a3a', 0.4);
          game.draw.text('♦', cx, cy, { size: Math.floor(sqW * 1.2), color: C.silverHi, bold: true });
        }
        game.draw.rect(cx + sqW - 16, cy - R + 20, 12, R * 2 - 40, C.silverHi, 0.3);
      }

      // Coin rim (top/bottom arcs approximated as rects)
      game.draw.rect(cx - sqW, cy - R, sqW * 2, 20, heads ? C.goldEdge : '#475569');
      game.draw.rect(cx - sqW, cy + R - 20, sqW * 2, 20, heads ? C.goldEdge : '#475569');
    }

    // Feedback
    if (feedback > 0) {
      var prog = 1 - feedback / 0.4;
      if (feedbackOk) {
        game.draw.text('表！', cx, cy - R - 120 - prog * 70, { size: 96, color: C.good, bold: true });
      } else {
        game.draw.text('裏…', cx, cy - R - 100, { size: 88, color: C.wrong, bold: true });
      }
    }

    // State label
    game.draw.text(heads ? '表' : '裏', W * 0.15, H * 0.35, { size: 52, color: heads ? C.goldHi : C.silverHi });

    // Guide
    game.draw.text('表でタップ！', W / 2, H - 200, { size: 56, color: C.ui });
    game.draw.text('裏は押すな', W / 2, H - 135, { size: 40, color: '#3a3028' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);
