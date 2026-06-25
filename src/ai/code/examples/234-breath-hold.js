// 234-breath-hold.js
// ブレスホールド — 息を止めているキャラが苦しくなる前にタップして呼吸させる
// 操作: タップで呼吸  長く我慢するほど高得点
// 成功: 合計3000ポイント  失敗: 酸素がゼロ or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02060f',
    air:    '#3b82f6',
    airHi:  '#93c5fd',
    danger: '#ef4444',
    danHi:  '#fca5a5',
    breathe:'#22c55e',
    breHi:  '#86efac',
    face:   '#fde68a',
    faceHi: '#fef3c7',
    bubble: '#bae6fd',
    ui:     '#475569'
  };

  var oxygen = 1.0;   // 0–1
  var OXYGEN_DRAIN = 0.06; // per second
  var phase = 'holding'; // 'holding' | 'breathing'
  var breathTimer = 0;
  var BREATHE_DUR = 1.2;
  var holdTime = 0;   // how long current hold
  var score = 0;
  var NEEDED = 3000;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var bubbles = [];
  var cheeks = 0; // 0–1 puffed
  var feedbackTimer = 0;
  var feedbackText = '';
  var feedbackCol = '#fff';
  var breathCount = 0;

  function breathe() {
    if (phase !== 'holding') return;
    // Score based on hold time and oxygen remaining
    var pts = Math.round(holdTime * 100 * (0.5 + oxygen * 0.5));
    score += pts;
    feedbackText = '+' + pts;
    feedbackCol = oxygen > 0.4 ? C.breathe : C.danger;
    feedbackTimer = 0.7;
    game.audio.play('se_success', 0.5 + (1 - oxygen) * 0.3);
    breathCount++;

    phase = 'breathing';
    breathTimer = BREATHE_DUR;
    holdTime = 0;
    cheeks = 0;

    // Bubble burst
    for (var i = 0; i < 5; i++) {
      bubbles.push({
        x: W / 2 + (Math.random() - 0.5) * 80,
        y: H * 0.45,
        vx: (Math.random() - 0.5) * 60,
        vy: -(80 + Math.random() * 120),
        r: 12 + Math.random() * 16,
        life: 1.0
      });
    }

    if (score >= NEEDED && !done) {
      done = true;
      setTimeout(function() { game.end.success(score); }, 400);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'holding') return;
    breathe();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    if (phase === 'holding') {
      holdTime += dt;
      oxygen -= OXYGEN_DRAIN * dt;
      cheeks = Math.min(1, holdTime / 5.0);
      oxygen = Math.max(0, oxygen);

      if (oxygen <= 0 && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    } else if (phase === 'breathing') {
      breathTimer -= dt;
      oxygen = Math.min(1, oxygen + dt * 0.7);
      cheeks = Math.max(0, breathTimer / BREATHE_DUR - 0.5);
      if (breathTimer <= 0) {
        phase = 'holding';
        holdTime = 0;
      }
    }

    // Ambient bubbles when breathing
    if (phase === 'breathing' && Math.random() < dt * 3) {
      bubbles.push({
        x: W / 2 + (Math.random() - 0.5) * 50,
        y: H * 0.42,
        vx: (Math.random() - 0.5) * 30,
        vy: -(40 + Math.random() * 60),
        r: 8 + Math.random() * 10,
        life: 0.8
      });
    }

    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      bubbles[bi].x += bubbles[bi].vx * dt;
      bubbles[bi].y += bubbles[bi].vy * dt;
      bubbles[bi].life -= dt;
      if (bubbles[bi].life <= 0) bubbles.splice(bi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Underwater environment
    game.draw.rect(0, H * 0.3, W, H * 0.7, '#051020', 0.5);

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b = bubbles[bi2];
      game.draw.circle(b.x, b.y, b.r, C.bubble, b.life * 0.5);
      game.draw.circle(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.2, '#fff', b.life * 0.4);
    }

    // Character face
    var faceX = W / 2;
    var faceY = H * 0.42;
    var faceR = 100;
    var danger = oxygen < 0.3;

    // Face color changes with oxygen
    var faceCol = oxygen < 0.2 ? '#f87171' : oxygen < 0.4 ? '#fde68a' : C.face;
    game.draw.circle(faceX, faceY, faceR + 8, C.faceHi, 0.2);
    game.draw.circle(faceX, faceY, faceR, faceCol, 0.9);

    // Eyes (squinting when holding long)
    var eyeSquint = cheeks * 10;
    game.draw.rect(faceX - 35, faceY - 22 + eyeSquint, 28, 12 - eyeSquint, '#0f172a', 0.8);
    game.draw.rect(faceX + 8, faceY - 22 + eyeSquint, 28, 12 - eyeSquint, '#0f172a', 0.8);

    // Cheeks (puffed when holding breath)
    var cheekScale = 1 + cheeks * 0.5;
    game.draw.circle(faceX - faceR * 0.6 * cheekScale, faceY + 10, 28 * cheekScale, faceCol, 0.9);
    game.draw.circle(faceX + faceR * 0.6 * cheekScale, faceY + 10, 28 * cheekScale, faceCol, 0.9);

    // Mouth
    if (phase === 'breathing') {
      // Open mouth (O shape)
      game.draw.circle(faceX, faceY + 40, 20, '#0f172a', 0.9);
    } else {
      // Closed mouth, puffed cheeks
      game.draw.line(faceX - 20, faceY + 38, faceX + 20, faceY + 38, '#0f172a', 6);
    }

    // O2 gauge
    var gaugeY = H * 0.65;
    game.draw.rect(W / 2 - 180, gaugeY, 360, 40, '#1e293b', 0.8);
    var oxyCol = oxygen > 0.5 ? C.air : oxygen > 0.25 ? C.ui : C.danger;
    game.draw.rect(W / 2 - 180, gaugeY, 360 * oxygen, 40, oxyCol, 0.9);
    game.draw.text('O₂', W / 2 - 200, gaugeY + 24, { size: 32, color: C.airHi });

    // Hold time display
    if (phase === 'holding') {
      game.draw.text(holdTime.toFixed(1) + 's 我慢中', W / 2, H * 0.72, { size: 44, color: danger ? C.danger : C.air, bold: true });
    } else {
      game.draw.text('呼吸中...', W / 2, H * 0.72, { size: 48, color: C.breathe, bold: true });
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedbackText, W / 2, H * 0.8, { size: 60, color: feedbackCol, bold: true });
    }

    // Score
    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('タップで呼吸！', W / 2, H * 0.9, { size: 40, color: C.ui, bold: phase === 'holding' });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.air : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
