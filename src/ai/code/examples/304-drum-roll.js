// 304-drum-roll.js
// ドラムロール — リズムに乗って左右交互に素早くタップ、テンポを落とさずに
// 操作: 左半分と右半分を交互にタップ（同じ側を連続で叩くとテンポが崩れる）
// 成功: 80打達成  失敗: テンポ乱れ3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0508',
    drum1:  '#b91c1c',
    drum1Hi:'#ef4444',
    drum2:  '#1d4ed8',
    drum2Hi:'#3b82f6',
    stick:  '#d97706',
    stickHi:'#f59e0b',
    hit1:   '#fca5a5',
    hit2:   '#93c5fd',
    bar:    '#22c55e',
    barLo:  '#166534',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var hits = 0;
  var NEEDED = 80;
  var tempoBreaks = 0;
  var MAX_BREAK = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;

  var lastSide = null; // 'left' | 'right' | null
  var lastHitTime = 0;
  var TEMPO_WINDOW = 0.8; // max seconds between hits
  var MIN_INTERVAL = 0.08; // too fast = same side repeat

  var tempoMeter = 1.0; // 0-1, drops on breaks
  var combo = 0;
  var particles = [];
  var leftHit = 0, rightHit = 0; // animation timers
  var bgPulse = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    var side = tx < W / 2 ? 'left' : 'right';
    var now = elapsed;
    var interval = now - lastHitTime;

    // Too slow (tempo break)
    if (lastSide !== null && interval > TEMPO_WINDOW) {
      tempoBreaks++;
      tempoMeter = Math.max(0, tempoMeter - 0.35);
      combo = 0;
      game.audio.play('se_failure', 0.4);
      if (tempoBreaks >= MAX_BREAK && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }
    // Same side repeated
    else if (side === lastSide) {
      tempoBreaks++;
      tempoMeter = Math.max(0, tempoMeter - 0.25);
      combo = 0;
      game.audio.play('se_failure', 0.3);
      if (tempoBreaks >= MAX_BREAK && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    } else {
      // Good hit!
      hits++;
      combo++;
      tempoMeter = Math.min(1, tempoMeter + 0.08);
      game.audio.play('se_tap', 0.3 + combo * 0.02);

      // Particles
      var px = tx, py = H * 0.52;
      for (var pi = 0; pi < 4; pi++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        particles.push({ x: px, y: py, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150 - 50, life: 0.4, col: side === 'left' ? C.hit1 : C.hit2 });
      }

      if (side === 'left') leftHit = 0.15;
      else rightHit = 0.15;

      if (hits >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(hits * 60 + combo * 50 + Math.ceil(timeLeft) * 100); }, 400);
      }
    }

    lastSide = side;
    lastHitTime = now;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    bgPulse += dt * 6;
    if (leftHit > 0) leftHit -= dt;
    if (rightHit > 0) rightHit -= dt;

    // Tempo meter decays slowly
    tempoMeter = Math.max(0, tempoMeter - dt * 0.05);

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background pulse
    var pulse = Math.max(0, Math.sin(bgPulse) * 0.15 * tempoMeter);
    game.draw.rect(0, 0, W, H, C.bar, pulse);

    // Left drum
    var drumY = H * 0.48;
    var drumR = 200;
    var lScale = leftHit > 0 ? 1 + leftHit * 0.3 : 1;
    var rScale = rightHit > 0 ? 1 + rightHit * 0.3 : 1;
    game.draw.circle(W * 0.28, drumY, drumR * lScale + 10, C.drum1, 0.2);
    game.draw.circle(W * 0.28, drumY, drumR * lScale, C.drum1, 0.9);
    game.draw.circle(W * 0.28, drumY, drumR * lScale * 0.85, C.drum1Hi, 0.2);
    game.draw.circle(W * 0.28, drumY, 20, C.drum1Hi, 0.6);

    game.draw.circle(W * 0.72, drumY, drumR * rScale + 10, C.drum2, 0.2);
    game.draw.circle(W * 0.72, drumY, drumR * rScale, C.drum2, 0.9);
    game.draw.circle(W * 0.72, drumY, drumR * rScale * 0.85, C.drum2Hi, 0.2);
    game.draw.circle(W * 0.72, drumY, 20, C.drum2Hi, 0.6);

    // Drumstick indicators
    var stickAngleL = leftHit > 0 ? -0.5 : 0.2;
    var stickAngleR = rightHit > 0 ? -0.5 : 0.2;
    game.draw.line(W * 0.28 + Math.cos(stickAngleL) * drumR * 0.4, drumY - drumR * 0.6,
                   W * 0.28 + Math.cos(stickAngleL) * drumR * 0.4, drumY - drumR * 0.6 - 180, C.stickHi, 12);
    game.draw.line(W * 0.72 - Math.cos(stickAngleR) * drumR * 0.4, drumY - drumR * 0.6,
                   W * 0.72 - Math.cos(stickAngleR) * drumR * 0.4, drumY - drumR * 0.6 - 180, C.stick, 12);

    // Hit ripples
    if (leftHit > 0) {
      game.draw.circle(W * 0.28, drumY, drumR * (1 + leftHit * 0.5), C.hit1, leftHit * 0.4);
    }
    if (rightHit > 0) {
      game.draw.circle(W * 0.72, drumY, drumR * (1 + rightHit * 0.5), C.hit2, rightHit * 0.4);
    }

    // Divider
    game.draw.line(W / 2, H * 0.2, W / 2, H * 0.85, C.ui, 3);

    // Labels
    game.draw.text('左', W * 0.28, H * 0.77, { size: 60, color: C.drum1Hi, bold: true });
    game.draw.text('右', W * 0.72, H * 0.77, { size: 60, color: C.drum2Hi, bold: true });

    // Tempo meter
    var meterW = W * 0.7;
    var meterX = (W - meterW) / 2;
    var meterY = H * 0.82;
    game.draw.rect(meterX, meterY, meterW, 28, '#0a0508', 0.9);
    var tmCol = tempoMeter > 0.5 ? C.bar : (tempoMeter > 0.25 ? C.stickHi : C.danger);
    game.draw.rect(meterX, meterY, meterW * tempoMeter, 28, tmCol, 0.9);
    game.draw.text('テンポ', W / 2, meterY - 18, { size: 30, color: C.ui });

    // Combo
    if (combo > 1) {
      game.draw.text(combo + 'コンボ！', W / 2, H * 0.87, { size: 44, color: C.stickHi, bold: true });
    } else {
      game.draw.text('左右交互にタップ！', W / 2, H * 0.87, { size: 40, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Break dots
    for (var bi = 0; bi < MAX_BREAK; bi++) {
      game.draw.circle(W / 2 - (MAX_BREAK - 1) * 28 + bi * 56, H * 0.93, 16, bi < tempoBreaks ? C.danger : '#0a0508');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bar : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);
