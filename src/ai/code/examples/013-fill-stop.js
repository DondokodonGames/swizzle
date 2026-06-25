// 013-fill-stop.js
// 注ぎ止め — こぼれる寸前で止める最後の一秒
// 操作: 画面をタップして液体を止める（適切な量で止めると成功）
// 成功: 3回ちょうどよい量で止める  失敗: こぼれる or 空で止める

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0e14',
    glass:    '#1e2a3a',
    glassEdge:'#334d66',
    liquid:   '#2563eb',
    liquidHi: '#60a5fa',
    good:     '#22c55e',
    overflow: '#ef4444',
    empty:    '#f59e0b',
    ui:       '#475569'
  };

  // Glass dimensions
  var GLASS_W = 360;
  var GLASS_H = 680;
  var GLASS_X = (W - GLASS_W) / 2;
  var GLASS_Y = H * 0.28;
  var GLASS_WALL = 20;

  // Fill zone: between 55% and 90% full
  var MIN_FILL = 0.55;
  var MAX_FILL = 0.90;

  // State
  var level = 0;    // 0.0 = empty, 1.0 = full/overflow
  var filling = false; // true while liquid pours
  var FILL_RATE = 0.35; // per second

  var score = 0;
  var needed = 3;
  var done = false;
  var timeLeft = 25;

  var phase = 'pouring'; // 'pouring' | 'result' | 'reset'
  var resultOk = false;
  var resultTimer = 0;
  var poured = false; // has player tapped at all
  var overflowed = false;

  // Liquid color cycles per round
  var LIQUID_COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626'];
  var roundColor = 0;

  function getColors() {
    return {
      liquid:  LIQUID_COLORS[roundColor % LIQUID_COLORS.length],
      liquidHi: '#' + LIQUID_COLORS[roundColor % LIQUID_COLORS.length].slice(1)
    };
  }

  function startRound() {
    level = 0;
    filling = true;
    poured = false;
    overflowed = false;
    phase = 'pouring';
    roundColor++;
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'pouring') return;
    if (!poured && filling) {
      // First tap: stop pouring
      filling = false;
      poured = true;
      game.audio.play('se_tap', 0.8);

      // evaluate
      if (level > MAX_FILL) {
        // overflowed (shouldn't happen since we stop, but check)
        resultOk = false;
      } else if (level < MIN_FILL) {
        resultOk = false; // too little
      } else {
        resultOk = true;
        score++;
        game.audio.play('se_success', resultOk ? 1.0 : 0.5);
      }

      if (!resultOk) {
        game.audio.play('se_failure', 0.6);
      }

      phase = 'result';
      resultTimer = 0.9;

      if (resultOk && score >= needed) {
        done = true;
        setTimeout(function() {
          game.end.success(score * 30 + Math.ceil(timeLeft) * 5);
        }, 1000);
      } else if (!resultOk) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 1000);
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

    if (phase === 'pouring' && filling) {
      level += FILL_RATE * dt;
      if (level >= 1.0) {
        level = 1.0;
        filling = false;
        overflowed = true;
        resultOk = false;
        phase = 'result';
        resultTimer = 0.9;
        game.audio.play('se_failure');
        done = true;
        setTimeout(function() { game.end.failure(); }, 1000);
      }
    } else if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0 && !done) {
        startRound();
      }
    }

    // ---- draw ----
    var lc = getColors();
    game.draw.rect(0, 0, W, H, C.bg);

    // timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0d1117');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.overflow);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score pips
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 128, 26, s < score ? C.good : '#1e2a3a');
      if (s < score) game.draw.circle(sx, 128, 14, '#ffffff80');
    }

    // glass outer
    game.draw.rect(GLASS_X - 12, GLASS_Y - 12, GLASS_W + 24, GLASS_H + 24, C.glassEdge);
    game.draw.rect(GLASS_X, GLASS_Y, GLASS_W, GLASS_H, C.glass);

    // liquid
    var liquidH = level * (GLASS_H - GLASS_WALL);
    var liquidY = GLASS_Y + GLASS_H - GLASS_WALL - liquidH;
    var liquidColor = phase === 'result' && !resultOk ? C.overflow : lc.liquid;

    if (liquidH > 0) {
      game.draw.rect(GLASS_X + GLASS_WALL, liquidY, GLASS_W - GLASS_WALL * 2, liquidH, liquidColor);
      // shine on liquid
      game.draw.rect(GLASS_X + GLASS_WALL + 8, liquidY + 4, 40, liquidH - 8, '#ffffff', 0.15);
      // surface highlight
      game.draw.rect(GLASS_X + GLASS_WALL, liquidY, GLASS_W - GLASS_WALL * 2, 8, '#ffffffaa');
    }

    // glass walls (front)
    game.draw.rect(GLASS_X, GLASS_Y, GLASS_WALL, GLASS_H, C.glassEdge, 0.6);
    game.draw.rect(GLASS_X + GLASS_W - GLASS_WALL, GLASS_Y, GLASS_WALL, GLASS_H, C.glassEdge, 0.6);
    game.draw.rect(GLASS_X, GLASS_Y + GLASS_H - GLASS_WALL, GLASS_W, GLASS_WALL, C.glassEdge, 0.6);

    // min/max zone markers
    var minY = GLASS_Y + GLASS_H - GLASS_WALL - MIN_FILL * (GLASS_H - GLASS_WALL);
    var maxY = GLASS_Y + GLASS_H - GLASS_WALL - MAX_FILL * (GLASS_H - GLASS_WALL);
    game.draw.rect(GLASS_X + GLASS_W, minY, 60, maxY - minY + 4, C.good, 0.3);
    game.draw.rect(GLASS_X + GLASS_W, minY, 60, 4, C.good);
    game.draw.rect(GLASS_X + GLASS_W, maxY, 60, 4, C.good);
    game.draw.text('OK', GLASS_X + GLASS_W + 40, (minY + maxY) / 2, { size: 36, color: C.good, bold: true });

    // overflow danger zone
    game.draw.rect(GLASS_X + GLASS_W, GLASS_Y, 60, maxY - GLASS_Y, C.overflow, 0.15);

    // pour stream (if filling)
    if (filling && phase === 'pouring') {
      var streamX = W / 2;
      var streamTop = GLASS_Y - 200;
      var streamBotY = liquidH > 0 ? liquidY : GLASS_Y + GLASS_H - GLASS_WALL;
      var streamW = 20 + Math.sin(game.time.elapsed * 8) * 4;
      game.draw.rect(streamX - streamW / 2, streamTop, streamW, streamBotY - streamTop, lc.liquid, 0.85);
      // stream shimmer
      game.draw.rect(streamX - streamW / 4, streamTop, streamW / 3, streamBotY - streamTop, '#ffffff', 0.3);
    }

    // result overlay
    if (phase === 'result') {
      var prog = 1 - resultTimer / 0.9;
      if (resultOk) {
        game.draw.text('PERFECT!', W / 2, GLASS_Y - 120, { size: 80, color: C.good, bold: true });
      } else if (overflowed) {
        game.draw.text('あふれた！', W / 2, GLASS_Y - 120, { size: 72, color: C.overflow, bold: true });
      } else {
        game.draw.text('少なすぎ！', W / 2, GLASS_Y - 120, { size: 72, color: C.empty, bold: true });
      }
    }

    // guide
    var tapText = filling ? 'タップして止めろ！' : (phase === 'result' ? '' : '...');
    game.draw.text(tapText, W / 2, H - 180, { size: 56, color: filling ? '#60a5fa' : C.ui, bold: filling });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    startRound();
  });
})(game);
