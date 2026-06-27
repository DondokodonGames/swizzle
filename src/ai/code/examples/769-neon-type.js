// 769-neon-type.js
// ネオンタイプ — 流れるネオンサインの「特定文字」が通過する瞬間をタップせよ
// 操作: タップ — ターゲット文字が中央ゾーンに入った瞬間
// 成功: 35回ヒット  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020208',
    neonA:   '#f97316',
    neonB:   '#818cf8',
    neonC:   '#22c55e',
    neonD:   '#f472b6',
    zone:    '#fbbf24',
    zoneLo:  '#3d2e00',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060610'
  };

  var CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  var CHAR_COLORS = [C.neonA, C.neonB, C.neonC, C.neonD, C.neonA, C.neonB, C.neonC, C.neonD, C.neonA, C.neonB];

  var ZONE_X = W / 2;
  var ZONE_W = 90;
  var CHAR_Y = H * 0.44;
  var CHAR_SIZE = 160;
  var CHAR_GAP = 200;
  var scrollSpeed = 280;

  var targetChar = '';
  var chars = []; // { x, char, colorIdx, active }
  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.3;

  var score = 0;
  var NEEDED = 35;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function pickTarget() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function resetScroll() {
    chars = [];
    targetChar = pickTarget();
    // Generate a sequence of chars with the target in a random position
    var count = 7 + Math.floor(Math.random() * 3);
    var targetPos = 1 + Math.floor(Math.random() * (count - 2));
    for (var i = 0; i < count; i++) {
      var ch;
      var ci;
      if (i === targetPos) {
        ch = targetChar;
        ci = CHARS.indexOf(targetChar) % CHAR_COLORS.length;
      } else {
        do {
          ci = Math.floor(Math.random() * CHARS.length);
          ch = CHARS[ci];
        } while (ch === targetChar);
      }
      chars.push({ x: W + i * CHAR_GAP, char: ch, colorIdx: ci, active: ch === targetChar });
    }
    answered = false;
    scrollSpeed = Math.min(500, 280 + score * 5);
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;

    // Find char in zone
    var inZoneTarget = false;
    var inZoneOther = false;
    for (var ci = 0; ci < chars.length; ci++) {
      var c = chars[ci];
      if (Math.abs(c.x - ZONE_X) < ZONE_W / 2) {
        if (c.active) inZoneTarget = true;
        else inZoneOther = true;
      }
    }

    answered = true;
    if (inZoneTarget) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = targetChar + '！ヒット！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.6);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 320 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = inZoneOther ? targetChar + 'じゃない！' : '範囲外！';
      resultTimer = 0.42;
      game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) resetScroll();
      return;
    }

    // Scroll chars
    for (var ci = 0; ci < chars.length; ci++) {
      chars[ci].x -= scrollSpeed * dt;
    }

    // Check if target passed zone without being hit
    if (!answered) {
      var targetPassed = true;
      for (var ci2 = 0; ci2 < chars.length; ci2++) {
        if (chars[ci2].active && chars[ci2].x + ZONE_W / 2 > 0) {
          targetPassed = false;
        }
      }
      if (targetPassed) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '見逃した！';
        resultTimer = 0.42;
        game.audio.play('se_failure', 0.24);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          answered = true;
          waitTimer = WAIT_DUR;
        }
      }
    }

    // All chars off screen — next round
    if (chars.length > 0 && chars[chars.length - 1].x < -CHAR_GAP * 2) {
      if (!answered) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '見逃した！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.22);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }
      waitTimer = WAIT_DUR;
      answered = true;
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background grid lines (neon aesthetic)
    for (var gi = 0; gi < 8; gi++) {
      game.draw.rect(0, H * 0.1 + gi * H * 0.1, W, 1, '#1a1a3a', 0.5);
    }

    // Zone
    game.draw.rect(ZONE_X - ZONE_W / 2 - 4, H * 0.25, ZONE_W + 8, H * 0.38, C.zoneLo, 0.9);
    // Zone border
    game.draw.rect(ZONE_X - ZONE_W / 2 - 4, H * 0.25, 8, H * 0.38, C.zone, 0.7);
    game.draw.rect(ZONE_X + ZONE_W / 2 - 4, H * 0.25, 8, H * 0.38, C.zone, 0.7);
    game.draw.text('▼', ZONE_X, H * 0.28, { size: 36, color: C.zone, bold: true });
    game.draw.text('▲', ZONE_X, H * 0.62, { size: 36, color: C.zone, bold: true });

    // Scrolling chars
    for (var ci3 = 0; ci3 < chars.length; ci3++) {
      var c = chars[ci3];
      var inZone = Math.abs(c.x - ZONE_X) < ZONE_W / 2;
      var col = CHAR_COLORS[c.colorIdx];
      var alpha = inZone ? 1.0 : (0.5 + 0.3 * Math.sin(elapsed * 3 + ci3));
      var sz = inZone ? CHAR_SIZE * 1.1 : CHAR_SIZE;
      if (inZone && c.active) {
        // Bright glow for target in zone
        game.draw.text(c.char, c.x, CHAR_Y, { size: sz + 20, color: col, bold: true });
        game.draw.text(c.char, c.x, CHAR_Y, { size: sz + 40, color: col + '40', bold: true });
      }
      game.draw.text(c.char, c.x, CHAR_Y, { size: sz, color: col, bold: true });
      if (c.active) {
        // Underline marker
        game.draw.rect(c.x - 28, CHAR_Y + 60, 56, 8, col, 0.7);
      }
    }

    // Target display
    game.draw.text('TARGET:', W / 2, H * 0.72, { size: 36, color: C.text + '88' });
    game.draw.text(targetChar, W / 2, H * 0.80, { size: 120, color: C.zone, bold: true });

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.17, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    resetScroll();
  });
})(game);
