// 368-sand-timer.js
// サンドタイマー — 砂時計を傾けてぴったり10秒で砂を落としきる
// 操作: タップで砂時計を逆さにする
// 成功: 目標秒数ぴったりに砂が落ちきる  失敗: 大幅にズレる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0a1e',
    glass:  '#93c5fd',
    glassHi:'#dbeafe',
    sandT:  '#f59e0b',
    sandB:  '#d97706',
    sandFall:'#fbbf24',
    frame:  '#78350f',
    frameHi:'#92400e',
    text:   '#f1f5f9',
    ui:     '#475569',
    good:   '#22c55e',
    bad:    '#ef4444'
  };

  var TARGETS = [10, 8, 12, 15, 6];
  var targetIdx = 0;
  var TARGET_TIME = TARGETS[targetIdx];
  var round = 0;
  var ROUNDS = 5;

  var flipped = false;       // is hourglass flipped (sand falls from top to bottom)?
  var topSand = 1.0;         // 0.0 to 1.0
  var bottomSand = 0.0;
  var flowRate = 0;          // fraction per second
  var fallParticles = [];
  var flipAnim = 0;          // 0 = normal, 1 = flipped, animates between
  var elapsed = 0;
  var timeLeft = 60;
  var done = false;
  var roundScore = 0;
  var resultText = '';
  var resultAnim = 0;
  var resultCol = C.good;

  var measuring = false;     // currently timing a flow
  var measureStart = 0;

  function startRound() {
    TARGET_TIME = TARGETS[targetIdx % TARGETS.length];
    topSand = 1.0;
    bottomSand = 0.0;
    flowRate = 1.0 / TARGET_TIME;
    flipped = false;
    flipAnim = 0;
    measuring = false;
    measureStart = 0;
  }

  function finishRound(measuredTime) {
    var diff = Math.abs(measuredTime - TARGET_TIME);
    var score = Math.max(0, 500 - Math.round(diff * 80));
    roundScore += score;
    if (diff < 1.5) {
      resultText = '完璧！ +' + score;
      resultCol = C.good;
      game.audio.play('se_success', 0.6);
    } else if (diff < 3) {
      resultText = 'まあまあ +' + score;
      resultCol = C.sandT;
      game.audio.play('se_tap', 0.4);
    } else {
      resultText = 'ズレた +' + score;
      resultCol = C.bad;
      game.audio.play('se_failure', 0.4);
    }
    resultAnim = 1.5;
    round++;
    targetIdx++;
    if (round >= ROUNDS && !done) {
      done = true;
      setTimeout(function() { game.end.success(roundScore); }, 1200);
    } else if (!done) {
      setTimeout(function() { startRound(); }, 1500);
    }
  }

  game.onTap(function() {
    if (done) return;
    flipped = !flipped;
    flipAnim = flipped ? 1 : 0;
    game.audio.play('se_tap', 0.3);

    if (flipped) {
      // Start measuring: sand will now flow from "top" (which was bottom) to "bottom"
      // Reset: top=bottomSand, bottom=topSand
      var tmp = topSand;
      topSand = bottomSand;
      bottomSand = tmp;
      measuring = true;
      measureStart = elapsed;
    } else {
      // Flip back — not counting
      var tmp2 = topSand;
      topSand = bottomSand;
      bottomSand = tmp2;
      measuring = false;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt;

    // Flow sand
    if (topSand > 0) {
      var flow = flowRate * dt;
      flow = Math.min(flow, topSand);
      topSand -= flow;
      bottomSand += flow;

      // Fall particles
      if (Math.random() < dt * 12) {
        fallParticles.push({ life: 0.3 + Math.random() * 0.2 });
      }
    } else if (measuring) {
      // Sand finished flowing
      var measured = elapsed - measureStart;
      measuring = false;
      finishRound(measured);
    }

    for (var i = fallParticles.length - 1; i >= 0; i--) {
      fallParticles[i].life -= dt;
      if (fallParticles[i].life <= 0) fallParticles.splice(i, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Title
    game.draw.text('目標: ' + TARGET_TIME + '秒', W / 2, 160, { size: 52, color: C.text, bold: true });
    game.draw.text('ラウンド ' + (round + 1) + ' / ' + ROUNDS, W / 2, 240, { size: 38, color: C.ui });

    // Hourglass
    var cx = W / 2;
    var cy = H * 0.48;
    var glassH = 380;
    var glassW = 220;

    // Frame
    game.draw.rect(cx - glassW / 2 - 24, cy - glassH / 2 - 40, glassW + 48, 40, C.frame, 0.9);
    game.draw.rect(cx - glassW / 2 - 24, cy + glassH / 2, glassW + 48, 40, C.frame, 0.9);
    game.draw.line(cx - glassW / 2 - 12, cy - glassH / 2 - 40, cx - glassW / 2 - 12, cy + glassH / 2 + 40, C.frame, 16);
    game.draw.line(cx + glassW / 2 + 12, cy - glassH / 2 - 40, cx + glassW / 2 + 12, cy + glassH / 2 + 40, C.frame, 16);

    // Top half (trapezoid via lines)
    var topY = cy - glassH / 2;
    var midY = cy;
    var botY = cy + glassH / 2;

    // Glass outline top half
    game.draw.line(cx - glassW / 2, topY, cx - 12, midY, C.glass, 4);
    game.draw.line(cx + glassW / 2, topY, cx + 12, midY, C.glass, 4);
    game.draw.line(cx - glassW / 2, topY, cx + glassW / 2, topY, C.glass, 4);

    // Glass outline bottom half
    game.draw.line(cx - 12, midY, cx - glassW / 2, botY, C.glass, 4);
    game.draw.line(cx + 12, midY, cx + glassW / 2, botY, C.glass, 4);
    game.draw.line(cx - glassW / 2, botY, cx + glassW / 2, botY, C.glass, 4);

    // Top sand fill
    if (topSand > 0) {
      var tSandH = topSand * (glassH / 2 - 20);
      var tSandY = topY + 8;
      var tWide = glassW / 2 - (topSand < 1 ? (1 - topSand) * glassW / 2 : 0);
      game.draw.rect(cx - tWide, tSandY, tWide * 2, tSandH, C.sandT, 0.85);
    }

    // Bottom sand fill
    if (bottomSand > 0) {
      var bSandH = bottomSand * (glassH / 2 - 20);
      var bSandY = botY - bSandH - 8;
      var bWide = glassW / 2 * (0.2 + 0.8 * bottomSand);
      game.draw.rect(cx - bWide, bSandY, bWide * 2, bSandH, C.sandB, 0.85);
    }

    // Falling sand stream
    if (topSand > 0) {
      for (var fp = 0; fp < fallParticles.length; fp++) {
        var frac = 1 - fallParticles[fp].life / 0.5;
        var fy = midY + frac * (glassH / 2 * 0.7);
        game.draw.circle(cx + (Math.random() - 0.5) * 8, fy, 4, C.sandFall, fallParticles[fp].life * 2);
      }
      // Center stream
      game.draw.line(cx, midY, cx, midY + 30, C.sandFall, 5);
    }

    // Hourglass flip hint
    if (!measuring && !done) {
      game.draw.text('タップで逆さに', W / 2, H * 0.82, { size: 42, color: flipped ? C.glassHi : C.ui });
    } else if (measuring) {
      var prog = 1 - topSand;
      game.draw.text((elapsed - measureStart).toFixed(1) + 's', W / 2, H * 0.82, { size: 52, color: C.sandT, bold: true });
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 52, color: resultCol, bold: true });
    }

    // Score
    game.draw.text('Score: ' + roundScore, W / 2, 140, { size: 44, color: C.text, bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.glass : C.bad);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    startRound();
  });
})(game);
