// 673-wire-cut.js
// 爆弾解除 — 指示された順番で正しいワイヤーを切れ
// 操作: タップでワイヤーを切る
// 成功: 10個解除  失敗: 3回誤切断 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a03',
    panel:   '#0a120a',
    bomb:    '#1c1c1c',
    bombHi:  '#2a2a2a',
    wireR:   '#ef4444',
    wireB:   '#3b82f6',
    wireY:   '#eab308',
    wireG:   '#22c55e',
    wireW:   '#e2e8f0',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050e05'
  };

  var WIRE_COLORS = [C.wireR, C.wireB, C.wireY, C.wireG, C.wireW];
  var WIRE_NAMES = ['赤', '青', '黄', '緑', '白'];
  var NUM_WIRES = 4;

  var WIRE_X = [];
  for (var i = 0; i < NUM_WIRES; i++) {
    WIRE_X.push(W * 0.15 + i * (W * 0.7 / (NUM_WIRES - 1)));
  }
  var WIRE_TOP_Y = H * 0.38;
  var WIRE_BOT_Y = H * 0.7;
  var WIRE_W = 12;

  var sequence = [];
  var wireColors = [];
  var cutIdx = 0;
  var cutWires = [];

  var defused = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var timerFlash = 0;

  function newBomb() {
    wireColors = [];
    var colorPool = [0, 1, 2, 3, 4];
    // Shuffle and pick NUM_WIRES
    for (var j = colorPool.length - 1; j > 0; j--) {
      var k2 = Math.floor(Math.random() * (j + 1));
      var tmp = colorPool[j]; colorPool[j] = colorPool[k2]; colorPool[k2] = tmp;
    }
    for (var wi = 0; wi < NUM_WIRES; wi++) {
      wireColors.push(colorPool[wi]);
    }
    // Random cut sequence (2-3 wires)
    var seqLen = 2 + Math.floor(Math.random() * 2);
    var wireIdxs = [0, 1, 2, 3];
    for (var j2 = wireIdxs.length - 1; j2 > 0; j2--) {
      var k3 = Math.floor(Math.random() * (j2 + 1));
      var t2 = wireIdxs[j2]; wireIdxs[j2] = wireIdxs[k3]; wireIdxs[k3] = t2;
    }
    sequence = wireIdxs.slice(0, seqLen);
    cutIdx = 0;
    cutWires = [];
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check which wire was tapped
    var hitWire = -1;
    for (var i = 0; i < NUM_WIRES; i++) {
      if (cutWires.indexOf(i) >= 0) continue; // already cut
      if (Math.abs(tx - WIRE_X[i]) < 40 && ty >= WIRE_TOP_Y - 20 && ty <= WIRE_BOT_Y + 20) {
        hitWire = i;
        break;
      }
    }
    if (hitWire < 0) return;

    if (hitWire === sequence[cutIdx]) {
      cutWires.push(hitWire);
      cutIdx++;
      game.audio.play('se_tap', 0.2);
      if (cutIdx >= sequence.length) {
        defused++;
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = '解除！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.7);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.54, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.wireG });
        }
        if (defused >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(defused * 500 + Math.ceil(timeLeft) * 60); }, 700);
        } else {
          setTimeout(newBomb, 800);
        }
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '爆発！';
      resultTimer = 0.6;
      timerFlash = 0.5;
      game.audio.play('se_failure', 0.5);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        setTimeout(newBomb, 800);
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
    if (timerFlash > 0) timerFlash -= dt * 3;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Bomb body
    game.draw.rect(W * 0.08, H * 0.3, W * 0.84, H * 0.5, C.bomb, 0.9);
    game.draw.rect(W * 0.08, H * 0.3, W * 0.84, 14, C.bombHi, 0.5);
    game.draw.rect(W * 0.08, H * 0.3 + 14, W * 0.84, 2, '#ffffff22', 0.5);

    // Sequence display
    game.draw.text('切断順：', W / 2, H * 0.34, { size: 36, color: '#ffffff66' });
    for (var si = 0; si < sequence.length; si++) {
      var wireColorIdx = wireColors[sequence[si]];
      var isCut = si < cutIdx;
      var sx2 = W / 2 - (sequence.length - 1) * 70 + si * 140;
      game.draw.circle(sx2, H * 0.4, 34, WIRE_COLORS[wireColorIdx], isCut ? 0.3 : 0.9);
      game.draw.text(WIRE_NAMES[wireColorIdx], sx2, H * 0.4 + 11, { size: 24, color: isCut ? '#444' : '#fff', bold: true });
      if (isCut) {
        game.draw.line(sx2 - 30, H * 0.4, sx2 + 30, H * 0.4, '#ffffff', 3);
      }
      if (si === cutIdx && !isCut) {
        game.draw.circle(sx2, H * 0.4, 42, '#fff', 0.3);
        game.draw.text('▼', sx2, H * 0.4 + 60, { size: 24, color: '#fff' });
      }
    }

    // Wires
    for (var wi2 = 0; wi2 < NUM_WIRES; wi2++) {
      var cx = WIRE_X[wi2];
      var isCutWire = cutWires.indexOf(wi2) >= 0;
      var wcIdx = wireColors[wi2];
      var wcol = WIRE_COLORS[wcIdx];

      if (isCutWire) {
        // Draw cut wire (two halves)
        var cutPointY = WIRE_TOP_Y + (WIRE_BOT_Y - WIRE_TOP_Y) * 0.45;
        game.draw.line(cx, WIRE_TOP_Y, cx, cutPointY - 20, wcol, WIRE_W);
        game.draw.line(cx, cutPointY + 20, cx, WIRE_BOT_Y, wcol, WIRE_W);
        // Spark ends
        game.draw.circle(cx, cutPointY, 14, '#fde68a', 0.8);
      } else {
        game.draw.line(cx, WIRE_TOP_Y, cx, WIRE_BOT_Y, wcol, WIRE_W);
        game.draw.circle(cx, WIRE_TOP_Y, 16, wcol, 0.8);
        game.draw.circle(cx, WIRE_BOT_Y, 16, wcol, 0.8);
        game.draw.text(WIRE_NAMES[wcIdx], cx, WIRE_TOP_Y - 36, { size: 30, color: wcol, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.83, { size: 72, color: flashCol, bold: true });
    }

    // Error indicators
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 80 + ei * 160, H * 0.955, 28, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(defused + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.wireG : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newBomb();
  });
})(game);
