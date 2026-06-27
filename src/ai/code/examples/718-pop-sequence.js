// 718-pop-sequence.js
// バブルシーケンス — 数字順にバブルを弾けさせろ（数字は隠れている）
// 操作: タップで最小番号のバブルを選ぶ（番号は押すまで見えない）
// 成功: 20ラウンドクリア  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04020e',
    bubble:  '#7c3aed',
    bubHi:   '#a78bfa',
    bubRev:  '#ddd6fe',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080416'
  };

  var BUBBLE_COUNT = 5;
  var BUBBLE_R = 70;
  var PLAY_X0 = 80;
  var PLAY_Y0 = 240;
  var PLAY_W = W - 160;
  var PLAY_H = H * 0.6;

  var bubbles = [];
  var nextNum = 1;
  var revealTimer = []; // temporary reveal per bubble
  var round = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;

  function newRound() {
    round++;
    var count = Math.min(6, 3 + Math.floor(round / 4));
    bubbles = [];
    revealTimer = [];
    nextNum = 1;

    var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, bx, by, tries = 0;
      while (!ok && tries < 200) {
        tries++;
        bx = PLAY_X0 + BUBBLE_R + Math.random() * (PLAY_W - BUBBLE_R * 2);
        by = PLAY_Y0 + BUBBLE_R + Math.random() * (PLAY_H - BUBBLE_R * 2);
        ok = true;
        for (var j = 0; j < placed.length; j++) {
          var dx = bx - placed[j].x, dy = by - placed[j].y;
          if (dx * dx + dy * dy < (BUBBLE_R * 2 + 20) * (BUBBLE_R * 2 + 20)) { ok = false; break; }
        }
      }
      placed.push({ x: bx, y: by, num: i + 1, revealed: false, phase: Math.random() * Math.PI * 2 });
      revealTimer.push(0);
    }
    bubbles = placed;
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    var hit = -1;
    for (var i = 0; i < bubbles.length; i++) {
      if (bubbles[i].revealed) continue;
      var dx = tx - bubbles[i].x, dy = ty - bubbles[i].y;
      if (dx * dx + dy * dy < (BUBBLE_R + 20) * (BUBBLE_R + 20)) {
        hit = i;
        break;
      }
    }
    if (hit < 0) return;

    var b = bubbles[hit];
    // Reveal number briefly
    revealTimer[hit] = 0.5;

    if (b.num === nextNum) {
      // Correct
      b.revealed = true;
      nextNum++;
      game.audio.play('se_tap', 0.13);
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: C.bubHi });
      }
      // Check round complete
      if (nextNum > bubbles.length) {
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = 'クリア！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.65);
        if (round >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(round * 400 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          waitTimer = 0.8;
        }
      }
    } else {
      // Wrong
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '順番が違う！';
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    for (var i = 0; i < revealTimer.length; i++) {
      if (revealTimer[i] > 0) revealTimer[i] -= dt * 2;
    }
    for (var i2 = 0; i2 < bubbles.length; i2++) {
      if (!bubbles[i2].revealed) bubbles[i2].phase += dt * 2;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Instruction
    game.draw.text('小さい順にタップ', W / 2, PLAY_Y0 - 60, { size: 40, color: '#ffffff44' });
    game.draw.text('次: ' + nextNum, W / 2, PLAY_Y0 - 110, { size: 48, color: C.correct, bold: true });

    // Bubbles
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi];
      if (b.revealed) {
        // Popped ring
        game.draw.circle(b.x, b.y, BUBBLE_R + 15, C.correct, 0.08);
        continue;
      }
      var pulse = 0.88 + 0.12 * Math.sin(b.phase * 2.5);
      var isRevealed = revealTimer[bi] > 0;
      var bCol = isRevealed ? C.bubRev : C.bubble;
      game.draw.circle(b.x + 4, b.y + 4, BUBBLE_R, '#000', 0.25);
      game.draw.circle(b.x, b.y, BUBBLE_R * pulse, bCol, 0.9);
      game.draw.circle(b.x - BUBBLE_R * 0.3, b.y - BUBBLE_R * 0.35, BUBBLE_R * 0.22, '#fff', 0.3);
      if (isRevealed) {
        game.draw.text(b.num + '', b.x, b.y + 18, { size: 72, color: C.bubble, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 50 + ei * 100, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
