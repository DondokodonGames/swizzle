// 094-dominoes-fall.js
// ドミノ倒し — 最初の1本を倒すと連鎖反応でドミノが次々と倒れる爽快感
// 操作: タップで最初のドミノを押す（タイミングで追加ドミノを押して加速）
// 成功: 全30本倒す  失敗: チェーンが途切れる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0c0e',
    domino:  '#1e3a5f',
    dominoHi:'#3b82f6',
    fallen:  '#0f4c75',
    fallenHi:'#0ea5e9',
    floor:   '#0d1117',
    floorHi: '#161b22',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var NUM_DOMINOS = 30;
  var DOMINO_W = 20;
  var DOMINO_H = 80;
  var DOMINO_GAP = 60;
  var FLOOR_Y = H * 0.65;

  var dominos = [];
  var started = false;
  var score = 0;
  var timeLeft = 20;
  var done = false;
  var chainBroken = false;
  var allFallen = false;

  function initDominos() {
    dominos = [];
    var totalW = NUM_DOMINOS * (DOMINO_W + DOMINO_GAP) - DOMINO_GAP;
    var startX = (W - totalW) / 2;
    for (var i = 0; i < NUM_DOMINOS; i++) {
      dominos.push({
        x: startX + i * (DOMINO_W + DOMINO_GAP),
        y: FLOOR_Y - DOMINO_H,
        angle: 0,  // 0 = upright, 90 = fully fallen
        falling: false,
        fallen: false
      });
    }
  }

  function startFalling(idx) {
    if (idx >= 0 && idx < NUM_DOMINOS && !dominos[idx].falling && !dominos[idx].fallen) {
      dominos[idx].falling = true;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!started) {
      // Push the first domino
      started = true;
      startFalling(0);
      game.audio.play('se_tap', 0.7);
    } else {
      // Try to push any upright domino near the tap
      for (var i = 0; i < NUM_DOMINOS; i++) {
        if (dominos[i].fallen || dominos[i].falling) continue;
        var dx = tx - dominos[i].x;
        var dy = ty - (dominos[i].y + DOMINO_H / 2);
        if (Math.abs(dx) < 50 && Math.abs(dy) < 80) {
          startFalling(i);
          game.audio.play('se_tap', 0.5);
          break;
        }
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

    var FALL_SPEED = 180; // degrees per second

    // Update falling dominos
    var anythingFalling = false;
    for (var i = 0; i < NUM_DOMINOS; i++) {
      var d = dominos[i];
      if (d.falling) {
        anythingFalling = true;
        d.angle += FALL_SPEED * dt;
        if (d.angle >= 90) {
          d.angle = 90;
          d.fallen = true;
          d.falling = false;
          score++;
          game.audio.play('se_tap', 0.4);
          // Check if all fallen
          if (score >= NUM_DOMINOS && !done) {
            done = true;
            allFallen = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 15); }, 500);
            return;
          }
        }
        // Push next domino when tip reaches it
        var tipX = d.x + Math.sin(d.angle * Math.PI / 180) * DOMINO_H;
        if (i + 1 < NUM_DOMINOS && !dominos[i + 1].falling && !dominos[i + 1].fallen) {
          if (tipX >= dominos[i + 1].x) {
            startFalling(i + 1);
          }
        }
      }
    }

    // Chain broken: started but nothing falling and not all fallen
    if (started && !anythingFalling && !allFallen && !done) {
      // Check if there are upright dominos left (chain stalled)
      var anyUpright = false;
      for (var j = score; j < NUM_DOMINOS; j++) {
        if (!dominos[j].fallen && !dominos[j].falling) { anyUpright = true; break; }
      }
      if (anyUpright) {
        chainBroken = true;
        // Grace period: player can tap to restart chain
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor);
    game.draw.rect(0, FLOOR_Y, W, 6, C.floorHi);

    // Dominos
    for (var k = 0; k < NUM_DOMINOS; k++) {
      var dom = dominos[k];
      var rad = dom.angle * Math.PI / 180;
      var pivotX = dom.x + DOMINO_W / 2;
      var pivotY = FLOOR_Y;
      // Draw rotated domino
      var cos_a = Math.cos(rad);
      var sin_a = Math.sin(rad);
      var hw = DOMINO_W / 2;
      // Transform corners
      var corners = [
        [-hw, -DOMINO_H],
        [hw, -DOMINO_H],
        [hw, 0],
        [-hw, 0]
      ];
      // Draw as rect approximation using rotated line
      var topX = pivotX + sin_a * DOMINO_H;
      var topY = pivotY - cos_a * DOMINO_H;
      var isActive = dom.falling || (!dom.fallen && started);
      game.draw.line(pivotX, pivotY, topX, topY, dom.fallen ? C.fallen : (dom.falling ? C.dominoHi : C.domino), DOMINO_W);
      if (!dom.fallen) {
        // Highlight stripe
        game.draw.line(
          pivotX + sin_a * DOMINO_H * 0.3,
          pivotY - cos_a * DOMINO_H * 0.3,
          topX,
          topY,
          dom.falling ? '#7dd3fc' : C.dominoHi,
          4
        );
      }
    }

    // Progress indicator
    var progW = 700;
    game.draw.rect(W / 2 - progW / 2, H * 0.78, progW, 20, '#0a1428');
    game.draw.rect(W / 2 - progW / 2, H * 0.78, progW * (score / NUM_DOMINOS), 20, C.dominoHi);
    game.draw.text(score + ' / ' + NUM_DOMINOS, W / 2, H * 0.84, { size: 48, color: '#94a3b8', bold: true });

    // Start instruction
    if (!started) {
      var pulse = 0.6 + 0.4 * Math.abs(Math.sin(game.time.elapsed * 3));
      game.draw.circle(dominos[0].x + DOMINO_W / 2, dominos[0].y + DOMINO_H / 2, 50, C.dominoHi, pulse * 0.4);
      game.draw.text('タップで倒す！', W / 2, H * 0.78, { size: 56, color: C.dominoHi, bold: true });
    }

    // Chain broken hint
    if (chainBroken && !allFallen && !done) {
      game.draw.text('チェーン継続！ タップ！', W / 2, H * 0.90, { size: 44, color: '#f59e0b', bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0a0c0e');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dominoHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initDominos();
  });
})(game);
